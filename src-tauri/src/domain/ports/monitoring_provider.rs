use async_trait::async_trait;

use crate::domain::entities::monitoring::{
    CpuMetrics, DiskMetrics, MemoryMetrics, NetworkMetrics, ProcessInfo,
};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait MonitoringProviderPort: Send + Sync {
    /// Get current CPU usage for a distro
    async fn get_cpu_usage(&self, distro: &DistroName) -> Result<CpuMetrics, DomainError>;

    /// Get current memory usage for a distro
    async fn get_memory_usage(&self, distro: &DistroName) -> Result<MemoryMetrics, DomainError>;

    /// Get disk usage for a distro
    async fn get_disk_usage(&self, distro: &DistroName) -> Result<DiskMetrics, DomainError>;

    /// Get network statistics for a distro
    async fn get_network_stats(&self, distro: &DistroName) -> Result<NetworkMetrics, DomainError>;

    /// Get running processes in a distro
    async fn get_processes(&self, distro: &DistroName) -> Result<Vec<ProcessInfo>, DomainError>;

    /// Get all system metrics (CPU, memory, disk, network) in a single call.
    /// More efficient than calling each method separately.
    async fn get_all_metrics(
        &self,
        distro: &DistroName,
    ) -> Result<(CpuMetrics, MemoryMetrics, DiskMetrics, NetworkMetrics), DomainError>;
}
