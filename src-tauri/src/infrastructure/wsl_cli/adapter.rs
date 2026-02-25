use async_trait::async_trait;
use std::process::Stdio;
use tokio::process::Command;

use crate::domain::entities::distro::Distro;
use crate::domain::entities::snapshot::ExportFormat;
use crate::domain::entities::wsl_config::{WslDistroConfig, WslGlobalConfig};
use crate::domain::errors::DomainError;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

use super::encoding::decode_wsl_output;
use super::parser::parse_distro_list;

pub struct WslCliAdapter {
    wsl_exe: String,
}

impl WslCliAdapter {
    pub fn new() -> Self {
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
            use std::os::windows::process::CommandExt;
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
            return Err(DomainError::WslCliError(stderr.trim().to_string()));
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

    /// Resolve the Windows user profile path
    fn get_wslconfig_path() -> Result<std::path::PathBuf, DomainError> {
        let userprofile = std::env::var("USERPROFILE")
            .or_else(|_| std::env::var("HOME"))
            .map_err(|_| DomainError::ConfigError("Cannot find user profile directory".into()))?;
        Ok(std::path::PathBuf::from(userprofile).join(".wslconfig"))
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
        self.run_wsl_raw(&["-d", name.as_str(), "-e", "/bin/true"])
            .await?;
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
        let mut args = vec!["--export", name.as_str(), path];
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
        self.run_wsl_raw(&["--import", name.as_str(), install_location, file_path])
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
