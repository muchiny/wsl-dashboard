use async_trait::async_trait;
use std::process::Stdio;
use tokio::process::Command;

use crate::domain::entities::distro::Distro;
use crate::domain::entities::snapshot::ExportFormat;
use crate::domain::entities::wsl_config::{WslDistroConfig, WslGlobalConfig};
use crate::domain::entities::wsl_version::WslVersionInfo;
use crate::domain::errors::DomainError;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

use super::encoding::decode_wsl_output;
use super::parser::parse_distro_list;

/// Convert a Linux /mnt/X/... path to Windows X:\... for wsl.exe commands.
/// Passes through paths that are already Windows-style or don't match /mnt/.
fn linux_to_windows_path(path: &str) -> String {
    // Match /mnt/c/Users/... -> C:\Users\...
    if let Some(rest) = path.strip_prefix("/mnt/") {
        if let Some((drive, remainder)) = rest.split_once('/') {
            if drive.len() == 1 {
                return format!(
                    "{}:\\{}",
                    drive.to_uppercase(),
                    remainder.replace('/', "\\")
                );
            }
        }
    }
    path.to_string()
}

/// Convert a Windows X:\... path to Linux /mnt/x/... for WSL2 filesystem access.
/// Passes through paths that are already Linux-style.
fn windows_to_linux_path(path: &str) -> String {
    let bytes = path.as_bytes();
    if bytes.len() >= 3 && bytes[1] == b':' && (bytes[2] == b'\\' || bytes[2] == b'/') {
        let drive = (bytes[0] as char).to_lowercase().next().unwrap();
        let rest = path[3..].replace('\\', "/");
        return format!("/mnt/{}/{}", drive, rest);
    }
    path.to_string()
}

pub struct WslCliAdapter {
    wsl_exe: String,
}

impl WslCliAdapter {
    pub fn new() -> Self {
        // On Linux (WSL2), ensure binfmt_misc interop is registered so .exe files can run
        #[cfg(target_os = "linux")]
        {
            if std::path::Path::new("/proc/sys/fs/binfmt_misc").exists()
                && !std::path::Path::new("/proc/sys/fs/binfmt_misc/WSLInterop").exists()
            {
                let _ = std::process::Command::new("sh")
                    .args([
                        "-c",
                        "echo ':WSLInterop:M::MZ::/init:PF' > /proc/sys/fs/binfmt_misc/register 2>/dev/null",
                    ])
                    .status();
            }
        }

        Self {
            wsl_exe: "wsl.exe".to_string(),
        }
    }

    /// Build a Command with CREATE_NO_WINDOW on Windows to prevent console popups
    fn wsl_command(&self) -> Command {
        #[allow(unused_mut)]
        let mut cmd = Command::new(&self.wsl_exe);
        #[cfg(windows)]
        {
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        cmd
    }

    /// Run a wsl.exe command and return raw stdout bytes
    async fn run_wsl_raw(&self, args: &[&str]) -> Result<Vec<u8>, DomainError> {
        let output = self
            .wsl_command()
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| DomainError::WslCliError(format!("Failed to execute wsl.exe: {}", e)))?;

        if !output.status.success() {
            let stderr = decode_wsl_output(&output.stderr)
                .unwrap_or_else(|_| String::from_utf8_lossy(&output.stderr).to_string());
            let stderr = stderr.trim();

            // When stderr is empty, try stdout or include the exit code
            let msg = if stderr.is_empty() {
                let stdout = decode_wsl_output(&output.stdout)
                    .unwrap_or_else(|_| String::from_utf8_lossy(&output.stdout).to_string());
                let stdout = stdout.trim();
                if stdout.is_empty() {
                    format!(
                        "wsl.exe exited with code {} (no output)",
                        output.status.code().unwrap_or(-1)
                    )
                } else {
                    stdout.to_string()
                }
            } else {
                stderr.to_string()
            };

            return Err(DomainError::WslCliError(msg));
        }

        Ok(output.stdout)
    }

    /// Run a command inside a distro and return UTF-8 output
    async fn exec_in_distro_raw(&self, distro: &str, command: &str) -> Result<String, DomainError> {
        let output = self
            .wsl_command()
            .args(["-d", distro, "-e", "sh", "-c", command])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| DomainError::WslCliError(e.to_string()))?;

        // Commands inside distro output UTF-8
        let stdout = String::from_utf8(output.stdout)
            .map_err(|e| DomainError::WslCliError(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(DomainError::WslCliError(format!(
                "Command failed: {}",
                stderr.trim()
            )));
        }

        Ok(stdout)
    }

    /// Resolve the Windows user profile path.
    /// On Windows, reads USERPROFILE directly. On WSL2, resolves it via cmd.exe.
    fn get_wslconfig_path() -> Result<std::path::PathBuf, DomainError> {
        // On Windows, USERPROFILE is always set
        if let Ok(profile) = std::env::var("USERPROFILE") {
            return Ok(std::path::PathBuf::from(profile).join(".wslconfig"));
        }

        // On WSL2, resolve the Windows USERPROFILE via cmd.exe interop
        let output = std::process::Command::new("cmd.exe")
            .args(["/C", "echo", "%USERPROFILE%"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .output()
            .map_err(|e| {
                DomainError::ConfigError(format!("Cannot resolve Windows USERPROFILE: {}", e))
            })?;

        let win_path = String::from_utf8_lossy(&output.stdout)
            .trim()
            .trim_end_matches('\r')
            .to_string();

        if win_path.is_empty() || win_path.contains('%') {
            return Err(DomainError::ConfigError(
                "Cannot find Windows user profile directory".into(),
            ));
        }

        // Convert Windows path to WSL-accessible path: C:\Users\foo -> /mnt/c/Users/foo
        let wsl_path = windows_to_linux_path(&win_path);
        Ok(std::path::PathBuf::from(wsl_path).join(".wslconfig"))
    }

    /// Parse a simple INI-style config into a map of section -> key -> value
    pub fn parse_ini(
        content: &str,
    ) -> std::collections::HashMap<String, std::collections::HashMap<String, String>> {
        let mut sections = std::collections::HashMap::new();
        let mut current_section = String::new();

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
                continue;
            }
            if line.starts_with('[') && line.ends_with(']') {
                current_section = line[1..line.len() - 1].to_lowercase();
                continue;
            }
            if let Some((key, value)) = line.split_once('=') {
                sections
                    .entry(current_section.clone())
                    .or_insert_with(std::collections::HashMap::new)
                    .insert(key.trim().to_lowercase(), value.trim().to_string());
            }
        }
        sections
    }
}

impl Default for WslCliAdapter {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl WslManagerPort for WslCliAdapter {
    async fn list_distros(&self) -> Result<Vec<Distro>, DomainError> {
        let raw = self.run_wsl_raw(&["--list", "--verbose"]).await?;
        let text = decode_wsl_output(&raw)?;
        parse_distro_list(&text)
    }

    async fn get_distro(&self, name: &DistroName) -> Result<Distro, DomainError> {
        let distros = self.list_distros().await?;
        distros
            .into_iter()
            .find(|d| d.name == *name)
            .ok_or_else(|| DomainError::DistroNotFound(name.to_string()))
    }

    async fn start_distro(&self, name: &DistroName) -> Result<(), DomainError> {
        // Spawn a detached `wsl.exe -d <name> -- sleep infinity` process.
        // Unlike run_wsl_raw (which awaits exit), this keeps the wsl.exe
        // process alive as a foreground session, which prevents WSL from
        // shutting down the distro. The process is cleaned up automatically
        // when terminate_distro calls `wsl --terminate`.
        self.wsl_command()
            .args(["-d", name.as_str(), "--", "sleep", "infinity"])
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .stdin(Stdio::null())
            .spawn()
            .map_err(|e| DomainError::WslCliError(format!("Failed to start distro: {}", e)))?;
        // Give WSL a moment to initialize the distro
        tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        Ok(())
    }

    async fn terminate_distro(&self, name: &DistroName) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--terminate", name.as_str()]).await?;
        Ok(())
    }

    async fn export_distro(
        &self,
        name: &DistroName,
        path: &str,
        format: ExportFormat,
    ) -> Result<(), DomainError> {
        // Convert Linux /mnt/X/... paths to Windows X:\... for wsl.exe
        let win_path = linux_to_windows_path(path);
        let mut args = vec!["--export", name.as_str(), win_path.as_str()];
        if let Some(flag) = format.wsl_flag() {
            args.push(flag);
        }
        self.run_wsl_raw(&args).await?;
        Ok(())
    }

    async fn import_distro(
        &self,
        name: &DistroName,
        install_location: &str,
        file_path: &str,
    ) -> Result<(), DomainError> {
        let win_loc = linux_to_windows_path(install_location);
        let win_file = linux_to_windows_path(file_path);
        self.run_wsl_raw(&[
            "--import",
            name.as_str(),
            win_loc.as_str(),
            win_file.as_str(),
        ])
        .await?;
        Ok(())
    }

    async fn set_default(&self, name: &DistroName) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--set-default", name.as_str()]).await?;
        Ok(())
    }

    async fn shutdown_all(&self) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--shutdown"]).await?;
        Ok(())
    }

    async fn exec_in_distro(
        &self,
        name: &DistroName,
        command: &str,
    ) -> Result<String, DomainError> {
        self.exec_in_distro_raw(name.as_str(), command).await
    }

    async fn get_global_config(&self) -> Result<WslGlobalConfig, DomainError> {
        let path = Self::get_wslconfig_path()?;
        let content = match std::fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => return Ok(WslGlobalConfig::default()),
        };

        let sections = Self::parse_ini(&content);
        let wsl2 = sections.get("wsl2").cloned().unwrap_or_default();

        Ok(WslGlobalConfig {
            memory: wsl2.get("memory").cloned(),
            processors: wsl2.get("processors").and_then(|v| v.parse().ok()),
            swap: wsl2.get("swap").cloned(),
            swap_file: wsl2.get("swapfile").cloned(),
            localhost_forwarding: wsl2.get("localhostforwarding").map(|v| v == "true"),
            kernel: wsl2.get("kernel").cloned(),
            kernel_command_line: wsl2.get("kernelcommandline").cloned(),
            nested_virtualization: wsl2.get("nestedvirtualization").map(|v| v == "true"),
            vm_idle_timeout: wsl2.get("vmidletimeout").and_then(|v| v.parse().ok()),
            dns_tunneling: wsl2.get("dnstunneling").map(|v| v == "true"),
            firewall: wsl2.get("firewall").map(|v| v == "true"),
            auto_proxy: wsl2.get("autoproxy").map(|v| v == "true"),
        })
    }

    async fn get_distro_config(&self, name: &DistroName) -> Result<WslDistroConfig, DomainError> {
        let output = self
            .exec_in_distro_raw(name.as_str(), "cat /etc/wsl.conf 2>/dev/null || echo ''")
            .await?;

        if output.trim().is_empty() {
            return Ok(WslDistroConfig::default());
        }

        let sections = Self::parse_ini(&output);
        let automount = sections.get("automount").cloned().unwrap_or_default();
        let network = sections.get("network").cloned().unwrap_or_default();
        let interop = sections.get("interop").cloned().unwrap_or_default();
        let user = sections.get("user").cloned().unwrap_or_default();
        let boot = sections.get("boot").cloned().unwrap_or_default();

        Ok(WslDistroConfig {
            automount_enabled: automount.get("enabled").map(|v| v == "true"),
            automount_root: automount.get("root").cloned(),
            network_hostname: network.get("hostname").cloned(),
            network_generate_hosts: network.get("generatehosts").map(|v| v == "true"),
            network_generate_resolv_conf: network.get("generateresolvconf").map(|v| v == "true"),
            interop_enabled: interop.get("enabled").map(|v| v == "true"),
            interop_append_windows_path: interop.get("appendwindowspath").map(|v| v == "true"),
            user_default: user.get("default").cloned(),
            boot_systemd: boot.get("systemd").map(|v| v == "true"),
            boot_command: boot.get("command").cloned(),
        })
    }

    async fn update_global_config(&self, config: WslGlobalConfig) -> Result<(), DomainError> {
        let path = Self::get_wslconfig_path()?;
        let mut lines = vec!["[wsl2]".to_string()];

        if let Some(ref memory) = config.memory {
            lines.push(format!("memory={}", memory));
        }
        if let Some(processors) = config.processors {
            lines.push(format!("processors={}", processors));
        }
        if let Some(ref swap) = config.swap {
            lines.push(format!("swap={}", swap));
        }
        if let Some(ref swap_file) = config.swap_file {
            lines.push(format!("swapFile={}", swap_file));
        }
        if let Some(v) = config.localhost_forwarding {
            lines.push(format!("localhostForwarding={}", v));
        }
        if let Some(ref kernel) = config.kernel {
            lines.push(format!("kernel={}", kernel));
        }
        if let Some(ref kcl) = config.kernel_command_line {
            lines.push(format!("kernelCommandLine={}", kcl));
        }
        if let Some(v) = config.nested_virtualization {
            lines.push(format!("nestedVirtualization={}", v));
        }
        if let Some(v) = config.vm_idle_timeout {
            lines.push(format!("vmIdleTimeout={}", v));
        }
        if let Some(v) = config.dns_tunneling {
            lines.push(format!("dnsTunneling={}", v));
        }
        if let Some(v) = config.firewall {
            lines.push(format!("firewall={}", v));
        }
        if let Some(v) = config.auto_proxy {
            lines.push(format!("autoProxy={}", v));
        }

        let content = lines.join("\n") + "\n";
        std::fs::write(&path, content)
            .map_err(|e| DomainError::ConfigError(format!("Failed to write .wslconfig: {}", e)))?;

        Ok(())
    }

    async fn set_sparse(&self, name: &DistroName, enabled: bool) -> Result<(), DomainError> {
        let flag = if enabled { "true" } else { "false" };
        self.run_wsl_raw(&["--manage", name.as_str(), "--set-sparse", flag])
            .await?;
        Ok(())
    }

    async fn get_version_info(&self) -> Result<WslVersionInfo, DomainError> {
        let raw = self.run_wsl_raw(&["--version"]).await?;
        let text = decode_wsl_output(&raw)?;

        let mut info = WslVersionInfo::default();

        for line in text.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let lower = line.to_lowercase();
            if let Some(pos) = lower.find("wsl version") {
                if lower[pos..].contains("wslg") {
                    // "WSLg version: X.Y.Z"
                    if let Some(val) = line.split(':').nth(1) {
                        info.wslg_version = Some(val.trim().to_string());
                    }
                } else {
                    // "WSL version: X.Y.Z"
                    if let Some(val) = line.split(':').nth(1) {
                        info.wsl_version = Some(val.trim().to_string());
                    }
                }
            } else if lower.contains("kernel version") {
                if let Some(val) = line.split(':').nth(1) {
                    info.kernel_version = Some(val.trim().to_string());
                }
            } else if lower.contains("windows version") {
                if let Some(val) = line.split(':').nth(1) {
                    info.windows_version = Some(val.trim().to_string());
                }
            }
        }

        Ok(info)
    }

    async fn get_distro_install_path(&self, name: &DistroName) -> Result<String, DomainError> {
        let output = Command::new("reg.exe")
            .args([
                "query",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Lxss",
                "/s",
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .output()
            .await
            .map_err(|e| DomainError::WslCliError(format!("Failed to query registry: {}", e)))?;

        let text = String::from_utf8_lossy(&output.stdout);

        // Parse registry output blocks. Each block starts with HKEY_... line
        // followed by indented key-value pairs like:
        //     DistributionName    REG_SZ    Ubuntu
        //     BasePath    REG_SZ    C:\Users\user\AppData\...
        let mut current_distro_name: Option<String> = None;
        let mut current_base_path: Option<String> = None;

        for line in text.lines() {
            let trimmed = line.trim();

            if trimmed.starts_with("HKEY_") {
                // Check if previous block matched our target
                if current_distro_name.as_deref() == Some(name.as_str()) {
                    if let Some(path) = current_base_path.take() {
                        return Ok(path);
                    }
                }
                current_distro_name = None;
                current_base_path = None;
                continue;
            }

            if trimmed.contains("DistributionName") && trimmed.contains("REG_SZ") {
                if let Some(val) = trimmed.split("REG_SZ").nth(1) {
                    current_distro_name = Some(val.trim().to_string());
                }
            }
            if trimmed.contains("BasePath") && trimmed.contains("REG_SZ") {
                if let Some(val) = trimmed.split("REG_SZ").nth(1) {
                    current_base_path = Some(val.trim().to_string());
                }
            }
        }

        // Check the last block
        if current_distro_name.as_deref() == Some(name.as_str()) {
            if let Some(path) = current_base_path {
                return Ok(path);
            }
        }

        Err(DomainError::DistroNotFound(format!(
            "Could not find install path for '{}'",
            name
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ini_basic_section() {
        let ini = "[wsl2]\nmemory=4GB\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert_eq!(sections.get("wsl2").unwrap().get("memory").unwrap(), "4GB");
    }

    #[test]
    fn test_parse_ini_multiple_sections() {
        let ini = "[wsl2]\nmemory=4GB\n[automount]\nenabled=true\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert_eq!(sections.get("wsl2").unwrap().get("memory").unwrap(), "4GB");
        assert_eq!(
            sections.get("automount").unwrap().get("enabled").unwrap(),
            "true"
        );
    }

    #[test]
    fn test_parse_ini_comments_ignored() {
        let ini = "# this is a comment\n; another comment\n[wsl2]\nmemory=4GB\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert_eq!(sections.len(), 1);
        assert_eq!(sections.get("wsl2").unwrap().get("memory").unwrap(), "4GB");
    }

    #[test]
    fn test_parse_ini_empty_lines_ignored() {
        let ini = "[wsl2]\n\nmemory=4GB\n\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert_eq!(sections.get("wsl2").unwrap().get("memory").unwrap(), "4GB");
    }

    #[test]
    fn test_parse_ini_keys_lowercased() {
        let ini = "[wsl2]\nMemory=4GB\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert!(sections.get("wsl2").unwrap().contains_key("memory"));
    }

    #[test]
    fn test_parse_ini_sections_lowercased() {
        let ini = "[WSL2]\nmemory=4GB\n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert!(sections.contains_key("wsl2"));
    }

    #[test]
    fn test_parse_ini_values_trimmed() {
        let ini = "[wsl2]\nmemory = 4GB \n";
        let sections = WslCliAdapter::parse_ini(ini);
        assert_eq!(sections.get("wsl2").unwrap().get("memory").unwrap(), "4GB");
    }

    #[test]
    fn test_parse_ini_empty_string() {
        let sections = WslCliAdapter::parse_ini("");
        assert!(sections.is_empty());
    }

    #[test]
    fn test_parse_ini_no_sections() {
        let ini = "key=val\n";
        let sections = WslCliAdapter::parse_ini(ini);
        // Stored under empty string section
        assert_eq!(sections.get("").unwrap().get("key").unwrap(), "val");
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn parse_ini_never_panics(s in "\\PC{0,500}") {
                let _ = WslCliAdapter::parse_ini(&s);
            }

            #[test]
            fn parse_ini_sections_are_lowercase(s in "\\[([a-zA-Z]+)\\]\n([a-z]+)=([a-z]+)") {
                let result = WslCliAdapter::parse_ini(&s);
                for key in result.keys() {
                    prop_assert_eq!(key, &key.to_lowercase());
                }
            }
        }
    }
}
