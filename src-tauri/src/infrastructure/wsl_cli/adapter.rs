use async_trait::async_trait;
use std::process::Stdio;
use tokio::process::Command;
#[cfg(windows)]
use winreg::{RegKey, enums::HKEY_CURRENT_USER};

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
    if let Some(rest) = path.strip_prefix("/mnt/")
        && let Some((drive, remainder)) = rest.split_once('/')
        && drive.len() == 1
    {
        return format!(
            "{}:\\{}",
            drive.to_uppercase(),
            remainder.replace('/', "\\")
        );
    }
    path.to_string()
}

/// Convert a Windows X:\... path to Linux /mnt/x/... for WSL2 filesystem access.
/// Passes through paths that are already Linux-style.
fn windows_to_linux_path(path: &str) -> String {
    let mut chars = path.chars();
    if let Some(drive) = chars.next()
        && drive.is_ascii_alphabetic()
        && chars.next() == Some(':')
        && matches!(chars.next(), Some('\\') | Some('/'))
    {
        let rest: String = chars.collect::<String>().replace('\\', "/");
        return format!("/mnt/{}/{}", drive.to_ascii_lowercase(), rest);
    }
    path.to_string()
}

/// Extract a WSL-style Windows home directory from a path entry.
/// Matches patterns like `/mnt/c/Users/username/...` and returns `/mnt/c/Users/username`.
fn extract_wsl_user_home(path: &str) -> Option<String> {
    let lower = path.to_lowercase();
    let idx = lower.find("/mnt/")?;
    let after_mnt = &path[idx + 5..]; // after "/mnt/" e.g. "c/Users/loicw/AppData/..."
    let mut parts = after_mnt.splitn(4, '/');
    let drive = parts.next()?; // "c"
    let users_dir = parts.next()?; // "Users"
    if users_dir.to_lowercase() != "users" {
        return None;
    }
    let username = parts.next()?; // "loicw"
    if username.is_empty() {
        return None;
    }
    Some(format!("/mnt/{}/{}/{}", drive, users_dir, username))
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

    /// Build a Command with CREATE_NO_WINDOW on Windows to prevent console popups.
    /// Sets WSL_UTF8=1 to force UTF-8 output from wsl.exe management commands.
    fn wsl_command(&self) -> Command {
        #[allow(unused_mut)]
        let mut cmd = Command::new(&self.wsl_exe);
        cmd.env("WSL_UTF8", "1");
        #[cfg(windows)]
        {
            cmd.creation_flags(crate::infrastructure::CREATE_NO_WINDOW);
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

    /// Run a command inside a distro and return UTF-8 output.
    ///
    /// # Safety
    /// The `command` parameter is passed to `sh -c`, so it is shell-interpreted.
    /// Only call this with hardcoded command strings. NEVER pass user input directly.
    async fn exec_in_distro_raw(&self, distro: &str, command: &str) -> Result<String, DomainError> {
        let output = self
            .wsl_command()
            .args(["-d", distro, "-e", "sh", "-c", command])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| DomainError::WslCliError(e.to_string()))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(DomainError::WslCliError(format!(
                "Command failed: {}",
                stderr.trim()
            )));
        }

        // Only decode stdout after confirming success
        String::from_utf8(output.stdout).map_err(|e| DomainError::WslCliError(e.to_string()))
    }

    /// Resolve the Windows user profile path.
    /// On Windows, reads USERPROFILE directly. On WSL2, resolves it via cmd.exe.
    fn get_wslconfig_path() -> Result<std::path::PathBuf, DomainError> {
        // 1) On Windows, USERPROFILE is always set
        if let Ok(profile) = std::env::var("USERPROFILE") {
            return Ok(std::path::PathBuf::from(profile).join(".wslconfig"));
        }

        // 2) On WSL2, try cmd.exe interop (requires binfmt_misc WSLInterop)
        if let Ok(output) = std::process::Command::new("cmd.exe")
            .args(["/C", "echo", "%USERPROFILE%"])
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::null())
            .output()
        {
            let win_path = String::from_utf8_lossy(&output.stdout)
                .trim()
                .trim_end_matches('\r')
                .to_string();

            if !win_path.is_empty() && !win_path.contains('%') {
                let wsl_path = windows_to_linux_path(&win_path);
                return Ok(std::path::PathBuf::from(wsl_path).join(".wslconfig"));
            }
        }

        // 3) Parse PATH for /mnt/<drive>/Users/<username>/ pattern
        if let Some(home) = Self::windows_home_from_path() {
            return Ok(std::path::PathBuf::from(home).join(".wslconfig"));
        }

        // 4) Scan /mnt/c/Users/ for a non-system user directory
        if let Some(home) = Self::windows_home_from_scan() {
            return Ok(std::path::PathBuf::from(home).join(".wslconfig"));
        }

        Err(DomainError::ConfigError(
            "Cannot find Windows user profile directory".into(),
        ))
    }

    /// Extract the Windows home directory from the PATH environment variable.
    /// WSL2 appends the Windows PATH, which contains entries like
    /// `/mnt/c/Users/username/AppData/Local/...`
    fn windows_home_from_path() -> Option<String> {
        let path = std::env::var("PATH").ok()?;
        for entry in path.split(':') {
            if let Some(home) = extract_wsl_user_home(entry)
                && std::path::Path::new(&home).is_dir()
            {
                return Some(home);
            }
        }
        None
    }

    /// Scan /mnt/c/Users/ for a real user directory (exclude system profiles).
    fn windows_home_from_scan() -> Option<String> {
        let users_dir = std::path::Path::new("/mnt/c/Users");
        if !users_dir.is_dir() {
            return None;
        }
        let system_dirs: &[&str] = &[
            "default",
            "default user",
            "public",
            "all users",
            "defaultapppool",
        ];
        let entries = std::fs::read_dir(users_dir).ok()?;
        for entry in entries.flatten() {
            let name = entry.file_name();
            let name_str = name.to_string_lossy();
            if system_dirs.contains(&name_str.to_lowercase().as_str()) {
                continue;
            }
            let path = entry.path();
            if path.is_dir() && path.join("AppData").is_dir() {
                return Some(path.to_string_lossy().to_string());
            }
        }
        None
    }

    /// Return all lines from an INI file that do NOT belong to the given sections.
    /// Preserves comments, blank lines, and other sections verbatim.
    fn lines_outside_sections(content: &str, sections: &[&str]) -> String {
        let mut result = Vec::new();
        let mut inside_managed = false;

        for line in content.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with('[') && trimmed.ends_with(']') {
                let section_name = trimmed[1..trimmed.len() - 1].to_lowercase();
                inside_managed = sections.iter().any(|&s| s == section_name);
                if !inside_managed {
                    result.push(line.to_string());
                }
            } else if !inside_managed {
                result.push(line.to_string());
            }
        }

        // Trim leading blank lines from preserved content
        while result.first().is_some_and(|l| l.trim().is_empty()) {
            result.remove(0);
        }

        result.join("\n")
    }

    /// Parse a simple INI-style config into a map of section -> key -> value
    pub fn parse_ini(
        content: &str,
    ) -> std::collections::HashMap<String, std::collections::HashMap<String, String>> {
        let mut sections: std::collections::HashMap<
            String,
            std::collections::HashMap<String, String>,
        > = std::collections::HashMap::new();
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
                    .or_default()
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

/// Parse `wsl --version` output into structured version info.
///
/// Uses product-name keyword matching ("WSL", "WSLg", "Windows") which are
/// universal across all locales. The kernel line — whose label varies by
/// locale (English "Kernel", French "noyau", etc.) — is identified as the
/// first unmatched line containing a version number.
///
/// Keywords are only matched in the label portion (before the first digit)
/// to avoid false positives from version values like
/// `6.6.87.2-microsoft-standard-WSL2` which contain "WSL".
fn parse_version_output(text: &str) -> WslVersionInfo {
    fn extract_version(line: &str) -> Option<String> {
        if let Some((_, after)) = line.rsplit_once(':') {
            let val = after.trim();
            if !val.is_empty() {
                return Some(val.to_string());
            }
        }
        line.split_whitespace()
            .rev()
            .find(|tok| tok.starts_with(|c: char| c.is_ascii_digit()))
            .map(|s| s.to_string())
    }

    let mut info = WslVersionInfo::default();
    let mut unmatched_versions: Vec<String> = Vec::new();

    for line in text.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        let label_end = line
            .find(|c: char| c.is_ascii_digit())
            .unwrap_or(line.len());
        let label = line[..label_end].to_lowercase();

        if label.contains("wslg") {
            info.wslg_version = extract_version(line);
        } else if label.contains("wsl") {
            info.wsl_version = extract_version(line);
        } else if label.contains("windows") {
            info.windows_version = extract_version(line);
        } else if let Some(ver) = extract_version(line) {
            unmatched_versions.push(ver);
        }
    }

    if info.kernel_version.is_none() {
        info.kernel_version = unmatched_versions.into_iter().next();
    }

    info
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

        // Poll until the distro reports Running (max 5s, 250ms intervals)
        let deadline =
            tokio::time::Instant::now() + std::time::Duration::from_secs(5);
        loop {
            tokio::time::sleep(std::time::Duration::from_millis(250)).await;
            if let Ok(distro) = self.get_distro(name).await {
                if distro.state == crate::domain::value_objects::DistroState::Running {
                    return Ok(());
                }
            }
            if tokio::time::Instant::now() >= deadline {
                return Err(DomainError::WslCliError(format!(
                    "Timed out waiting for '{}' to start",
                    name
                )));
            }
        }
    }

    async fn terminate_distro(&self, name: &DistroName) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--terminate", name.as_str()]).await?;
        Ok(())
    }

    async fn unregister_distro(&self, name: &DistroName) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--unregister", name.as_str()]).await?;
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
        format: ExportFormat,
    ) -> Result<(), DomainError> {
        let win_loc = linux_to_windows_path(install_location);
        let win_file = linux_to_windows_path(file_path);
        let mut args = vec![
            "--import",
            name.as_str(),
            win_loc.as_str(),
            win_file.as_str(),
        ];
        if let Some(flag) = format.wsl_flag() {
            args.push(flag);
        }
        self.run_wsl_raw(&args).await?;
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
        let Ok(content) = std::fs::read_to_string(&path) else {
            return Ok(WslGlobalConfig::default());
        };

        let sections = Self::parse_ini(&content);
        let wsl2 = sections.get("wsl2").cloned().unwrap_or_default();
        let experimental = sections.get("experimental").cloned().unwrap_or_default();

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
            networking_mode: wsl2.get("networkingmode").cloned(),
            gui_applications: wsl2.get("guiapplications").map(|v| v == "true"),
            default_vhd_size: wsl2.get("defaultvhdsize").cloned(),
            dns_proxy: wsl2.get("dnsproxy").map(|v| v == "true"),
            safe_mode: wsl2.get("safemode").map(|v| v == "true"),
            auto_memory_reclaim: experimental.get("automemoryreclaim").cloned(),
            sparse_vhd: experimental.get("sparsevhd").map(|v| v == "true"),
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
        let gpu = sections.get("gpu").cloned().unwrap_or_default();
        let time = sections.get("time").cloned().unwrap_or_default();

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
            gpu_enabled: gpu.get("enabled").map(|v| v == "true"),
            use_windows_timezone: time.get("usewindowstimezone").map(|v| v == "true"),
        })
    }

    async fn update_global_config(&self, config: WslGlobalConfig) -> Result<(), DomainError> {
        let path = Self::get_wslconfig_path()?;

        // Read existing content to preserve sections we don't manage
        let existing = std::fs::read_to_string(&path).unwrap_or_default();
        let preserved = Self::lines_outside_sections(&existing, &["wsl2", "experimental"]);

        // Build [wsl2] section
        let mut wsl2_lines = vec!["[wsl2]".to_string()];
        macro_rules! push_opt {
            ($field:expr, $key:literal) => {
                if let Some(ref v) = $field {
                    wsl2_lines.push(format!("{}={}", $key, v));
                }
            };
        }
        push_opt!(config.memory, "memory");
        if let Some(v) = config.processors {
            wsl2_lines.push(format!("processors={}", v));
        }
        push_opt!(config.swap, "swap");
        push_opt!(config.swap_file, "swapFile");
        if let Some(v) = config.localhost_forwarding {
            wsl2_lines.push(format!("localhostForwarding={}", v));
        }
        push_opt!(config.kernel, "kernel");
        push_opt!(config.kernel_command_line, "kernelCommandLine");
        if let Some(v) = config.nested_virtualization {
            wsl2_lines.push(format!("nestedVirtualization={}", v));
        }
        if let Some(v) = config.vm_idle_timeout {
            wsl2_lines.push(format!("vmIdleTimeout={}", v));
        }
        if let Some(v) = config.dns_tunneling {
            wsl2_lines.push(format!("dnsTunneling={}", v));
        }
        if let Some(v) = config.firewall {
            wsl2_lines.push(format!("firewall={}", v));
        }
        if let Some(v) = config.auto_proxy {
            wsl2_lines.push(format!("autoProxy={}", v));
        }
        push_opt!(config.networking_mode, "networkingMode");
        if let Some(v) = config.gui_applications {
            wsl2_lines.push(format!("guiApplications={}", v));
        }
        push_opt!(config.default_vhd_size, "defaultVhdSize");
        if let Some(v) = config.dns_proxy {
            wsl2_lines.push(format!("dnsProxy={}", v));
        }
        if let Some(v) = config.safe_mode {
            wsl2_lines.push(format!("safeMode={}", v));
        }

        // Build [experimental] section (only if there are values to write)
        let mut exp_lines = Vec::new();
        if config.auto_memory_reclaim.is_some() || config.sparse_vhd.is_some() {
            exp_lines.push("[experimental]".to_string());
            push_opt!(config.auto_memory_reclaim, "autoMemoryReclaim");
            if let Some(v) = config.sparse_vhd {
                exp_lines.push(format!("sparseVhd={}", v));
            }
        }

        // Combine: managed sections first, then preserved lines
        let mut output = wsl2_lines.join("\n");
        if !exp_lines.is_empty() {
            output.push('\n');
            output.push_str(&exp_lines.join("\n"));
        }
        if !preserved.is_empty() {
            output.push('\n');
            output.push_str(&preserved);
        }
        output.push('\n');

        std::fs::write(&path, output)
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
        Ok(parse_version_output(&text))
    }

    #[cfg(windows)]
    async fn get_distro_install_path(&self, name: &DistroName) -> Result<String, DomainError> {
        let target = name.to_string();

        tokio::task::spawn_blocking(move || {
            let hkcu = RegKey::predef(HKEY_CURRENT_USER);
            let lxss = hkcu
                .open_subkey(r"Software\Microsoft\Windows\CurrentVersion\Lxss")
                .map_err(|e| DomainError::WslCliError(format!("Failed to open Lxss key: {e}")))?;

            for guid in lxss.enum_keys().filter_map(|k| k.ok()) {
                let subkey = match lxss.open_subkey(&guid) {
                    Ok(k) => k,
                    Err(_) => continue,
                };
                let distro_name: String = match subkey.get_value("DistributionName") {
                    Ok(v) => v,
                    Err(_) => continue,
                };
                if distro_name == target {
                    let base_path: String = subkey.get_value("BasePath").map_err(|e| {
                        DomainError::WslCliError(format!(
                            "Found distro '{}' but failed to read BasePath: {e}",
                            target
                        ))
                    })?;
                    return Ok(base_path);
                }
            }

            Err(DomainError::DistroNotFound(format!(
                "Could not find install path for '{}'",
                target
            )))
        })
        .await
        .map_err(|e| DomainError::WslCliError(format!("Registry task panicked: {e}")))?
    }

    #[cfg(not(windows))]
    async fn get_distro_install_path(&self, name: &DistroName) -> Result<String, DomainError> {
        Err(DomainError::WslCliError(format!(
            "Cannot read Windows registry for '{}' on this platform",
            name
        )))
    }

    async fn resize_vhd(&self, name: &DistroName, size: &str) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--manage", name.as_str(), "--resize", size])
            .await?;
        Ok(())
    }

    async fn set_default_distro(&self, name: &DistroName) -> Result<(), DomainError> {
        self.run_wsl_raw(&["--set-default", name.as_str()]).await?;
        Ok(())
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

    #[test]
    fn test_windows_to_linux_path_basic() {
        assert_eq!(windows_to_linux_path(r"C:\Users\foo"), "/mnt/c/Users/foo");
    }

    #[test]
    fn test_windows_to_linux_path_forward_slash() {
        assert_eq!(
            windows_to_linux_path("D:/Projects/bar"),
            "/mnt/d/Projects/bar"
        );
    }

    #[test]
    fn test_windows_to_linux_path_passthrough() {
        assert_eq!(
            windows_to_linux_path("/mnt/c/Users/foo"),
            "/mnt/c/Users/foo"
        );
    }

    #[test]
    fn test_extract_wsl_user_home_basic() {
        assert_eq!(
            extract_wsl_user_home("/mnt/c/Users/loicw/AppData/Local/Microsoft/WindowsApps"),
            Some("/mnt/c/Users/loicw".to_string()),
        );
    }

    #[test]
    fn test_extract_wsl_user_home_exact_path() {
        // Minimal path with just /mnt/c/Users/name (no trailing components)
        // splitn(4, '/') gives ["c", "Users", "name"] - username is present
        assert_eq!(
            extract_wsl_user_home("/mnt/c/Users/name"),
            Some("/mnt/c/Users/name".to_string()),
        );
    }

    #[test]
    fn test_extract_wsl_user_home_no_match() {
        assert_eq!(extract_wsl_user_home("/usr/bin/something"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_no_username() {
        assert_eq!(extract_wsl_user_home("/mnt/c/Users/"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_not_users_dir() {
        assert_eq!(extract_wsl_user_home("/mnt/c/Program Files/app"), None);
    }

    #[test]
    fn test_extract_wsl_user_home_case_insensitive_users() {
        assert_eq!(
            extract_wsl_user_home("/mnt/c/users/john/AppData"),
            Some("/mnt/c/users/john".to_string()),
        );
    }

    #[test]
    fn test_parse_version_english() {
        let output = "WSL version: 2.6.3.0\nKernel version: 6.6.87.2-microsoft-standard-WSL2\nWSLg version: 1.0.71\nWindows version: 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_french() {
        let output = "Version WSL : 2.6.3.0\nVersion du noyau : 6.6.87.2-microsoft-standard-WSL2\nVersion WSLg : 1.0.71\nVersion de Windows : 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_with_extra_lines() {
        // Newer wsl --version includes MSRDC, Direct3D, DXCore lines
        let output = "WSL version: 2.6.3.0\nKernel version: 6.6.87.2-microsoft-standard-WSL2\nWSLg version: 1.0.71\nMSRDC version: 1.2.5620\nDirect3D version: 1.611.1-81528511\nDXCore version: 10.0.26100.1\nWindows version: 10.0.26200.7922\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(
            info.kernel_version.as_deref(),
            Some("6.6.87.2-microsoft-standard-WSL2")
        );
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.26200.7922"));
    }

    #[test]
    fn test_parse_version_no_colon_format() {
        let output = "WSL version 2.6.3.0\nKernel version 5.15.133.1\nWSLg version 1.0.71\nWindows version 10.0.22631\n";
        let info = parse_version_output(output);
        assert_eq!(info.wsl_version.as_deref(), Some("2.6.3.0"));
        assert_eq!(info.kernel_version.as_deref(), Some("5.15.133.1"));
        assert_eq!(info.wslg_version.as_deref(), Some("1.0.71"));
        assert_eq!(info.windows_version.as_deref(), Some("10.0.22631"));
    }

    #[test]
    fn test_lines_outside_sections_preserves_other_sections() {
        let ini = "[wsl2]\nmemory=4GB\n[boot]\ncommand=echo hi\n[experimental]\nautoMemoryReclaim=dropCache\n";
        let preserved = WslCliAdapter::lines_outside_sections(ini, &["wsl2", "experimental"]);
        assert!(preserved.contains("[boot]"));
        assert!(preserved.contains("command=echo hi"));
        assert!(!preserved.contains("[wsl2]"));
        assert!(!preserved.contains("memory=4GB"));
        assert!(!preserved.contains("[experimental]"));
        assert!(!preserved.contains("autoMemoryReclaim"));
    }

    #[test]
    fn test_lines_outside_sections_preserves_comments() {
        // Comments before any section are preserved; comments inside a managed section are removed
        let ini = "# Global comment\n[wsl2]\nmemory=4GB\n# Inside wsl2\n[other]\n# Inside other\nfoo=bar\n";
        let preserved = WslCliAdapter::lines_outside_sections(ini, &["wsl2"]);
        assert!(preserved.contains("# Global comment"));
        assert!(!preserved.contains("# Inside wsl2"));
        assert!(preserved.contains("[other]"));
        assert!(preserved.contains("# Inside other"));
        assert!(preserved.contains("foo=bar"));
    }

    #[test]
    fn test_lines_outside_sections_empty_input() {
        let preserved = WslCliAdapter::lines_outside_sections("", &["wsl2"]);
        assert!(preserved.is_empty());
    }

    #[test]
    fn test_lines_outside_sections_no_managed_sections() {
        let ini = "[boot]\ncommand=echo hi\n";
        let preserved = WslCliAdapter::lines_outside_sections(ini, &["wsl2"]);
        assert!(preserved.contains("[boot]"));
        assert!(preserved.contains("command=echo hi"));
    }

    #[test]
    fn test_parse_global_config_with_experimental() {
        let ini = "[wsl2]\nmemory=4GB\nnetworkingMode=mirrored\n[experimental]\nautoMemoryReclaim=dropCache\nsparseVhd=true\n";
        let sections = WslCliAdapter::parse_ini(ini);
        let wsl2 = sections.get("wsl2").unwrap();
        assert_eq!(wsl2.get("networkingmode").unwrap(), "mirrored");
        let exp = sections.get("experimental").unwrap();
        assert_eq!(exp.get("automemoryreclaim").unwrap(), "dropCache");
        assert_eq!(exp.get("sparsevhd").unwrap(), "true");
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

            #[test]
            fn extract_wsl_user_home_never_panics(s in "\\PC{0,200}") {
                let _ = extract_wsl_user_home(&s);
            }
        }
    }
}
