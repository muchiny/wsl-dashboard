use serde::{Deserialize, Serialize};

/// A port currently listening inside a WSL distribution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ListeningPort {
    pub port: u16,
    pub protocol: String,
    pub process: String,
    pub pid: Option<u32>,
}

/// A port forwarding rule mapping a WSL port to a Windows host port.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortForwardRule {
    pub id: String,
    pub distro_name: String,
    pub wsl_port: u16,
    pub host_port: u16,
    pub protocol: String,
    pub enabled: bool,
    pub created_at: String,
}
