use async_trait::async_trait;

use crate::domain::entities::distro::Distro;
use crate::domain::entities::snapshot::ExportFormat;
use crate::domain::entities::wsl_config::{WslDistroConfig, WslGlobalConfig};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait WslManagerPort: Send + Sync {
    /// List all installed WSL distributions
    async fn list_distros(&self) -> Result<Vec<Distro>, DomainError>;

    /// Get a specific distribution by name
    async fn get_distro(&self, name: &DistroName) -> Result<Distro, DomainError>;

    /// Start a distribution (run a no-op command to boot it)
    async fn start_distro(&self, name: &DistroName) -> Result<(), DomainError>;

    /// Terminate a running distribution
    async fn terminate_distro(&self, name: &DistroName) -> Result<(), DomainError>;

    /// Export a distribution to a file
    async fn export_distro(
        &self,
        name: &DistroName,
        path: &str,
        format: ExportFormat,
    ) -> Result<(), DomainError>;

    /// Import a distribution from a file
    async fn import_distro(
        &self,
        name: &DistroName,
        install_location: &str,
        file_path: &str,
    ) -> Result<(), DomainError>;

    /// Set a distribution as the default
    async fn set_default(&self, name: &DistroName) -> Result<(), DomainError>;

    /// Shutdown all WSL instances
    async fn shutdown_all(&self) -> Result<(), DomainError>;

    /// Execute a command inside a distribution
    async fn exec_in_distro(&self, name: &DistroName, command: &str)
        -> Result<String, DomainError>;

    /// Read the global .wslconfig
    async fn get_global_config(&self) -> Result<WslGlobalConfig, DomainError>;

    /// Read a distro's /etc/wsl.conf
    async fn get_distro_config(&self, name: &DistroName) -> Result<WslDistroConfig, DomainError>;

    /// Write the global .wslconfig
    async fn update_global_config(&self, config: WslGlobalConfig) -> Result<(), DomainError>;

    /// Set sparse mode for a distro's VHDX (WSL2 only)
    async fn set_sparse(&self, name: &DistroName, enabled: bool) -> Result<(), DomainError>;
}
