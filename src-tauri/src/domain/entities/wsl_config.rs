use serde::{Deserialize, Serialize};

/// Global WSL configuration from ~/.wslconfig
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WslGlobalConfig {
    // [wsl2] section
    pub memory: Option<String>,
    pub processors: Option<u32>,
    pub swap: Option<String>,
    pub swap_file: Option<String>,
    pub localhost_forwarding: Option<bool>,
    pub kernel: Option<String>,
    pub kernel_command_line: Option<String>,
    pub nested_virtualization: Option<bool>,
    pub vm_idle_timeout: Option<u64>,
    pub dns_tunneling: Option<bool>,
    pub firewall: Option<bool>,
    pub auto_proxy: Option<bool>,
    pub networking_mode: Option<String>,
    pub gui_applications: Option<bool>,
    pub default_vhd_size: Option<String>,
    pub dns_proxy: Option<bool>,
    pub safe_mode: Option<bool>,
    // [experimental] section
    pub auto_memory_reclaim: Option<String>,
    pub sparse_vhd: Option<bool>,
}

/// Per-distro configuration from /etc/wsl.conf
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WslDistroConfig {
    pub automount_enabled: Option<bool>,
    pub automount_root: Option<String>,
    pub network_hostname: Option<String>,
    pub network_generate_hosts: Option<bool>,
    pub network_generate_resolv_conf: Option<bool>,
    pub interop_enabled: Option<bool>,
    pub interop_append_windows_path: Option<bool>,
    pub user_default: Option<String>,
    pub boot_systemd: Option<bool>,
    pub boot_command: Option<String>,
    pub gpu_enabled: Option<bool>,
    pub use_windows_timezone: Option<bool>,
}
