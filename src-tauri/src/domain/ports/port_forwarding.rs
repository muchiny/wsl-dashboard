use async_trait::async_trait;

use crate::domain::entities::port_forward::{ListeningPort, PortForwardRule};
use crate::domain::errors::DomainError;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait PortForwardingPort: Send + Sync {
    /// List ports currently listening inside a WSL distro.
    async fn list_listening_ports(
        &self,
        distro_name: &str,
    ) -> Result<Vec<ListeningPort>, DomainError>;

    /// Get the IP address of a WSL2 distribution.
    async fn get_wsl_ip(&self, distro_name: &str) -> Result<String, DomainError>;

    /// Apply a port forwarding rule using netsh.
    async fn apply_rule(
        &self,
        host_port: u16,
        wsl_ip: &str,
        wsl_port: u16,
    ) -> Result<(), DomainError>;

    /// Remove a port forwarding rule using netsh.
    async fn remove_rule(&self, host_port: u16) -> Result<(), DomainError>;
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait PortForwardRulesRepository: Send + Sync {
    /// Save a new forwarding rule.
    async fn save_rule(&self, rule: &PortForwardRule) -> Result<(), DomainError>;

    /// Delete a forwarding rule by ID.
    async fn delete_rule(&self, rule_id: &str) -> Result<(), DomainError>;

    /// List all rules, optionally filtered by distro.
    async fn list_rules(
        &self,
        distro_name: Option<String>,
    ) -> Result<Vec<PortForwardRule>, DomainError>;

    /// Get a single rule by ID.
    async fn get_rule(&self, rule_id: &str) -> Result<Option<PortForwardRule>, DomainError>;
}
