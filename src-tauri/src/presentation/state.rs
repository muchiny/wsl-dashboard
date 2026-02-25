use std::sync::Arc;

use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::docker_provider::DockerProviderPort;
use crate::domain::ports::iac_provider::IacProviderPort;
use crate::domain::ports::monitoring_provider::MonitoringProviderPort;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::ports::wsl_manager::WslManagerPort;

/// Composition root: holds all hexagonal port implementations.
/// Injected into Tauri as managed state.
pub struct AppState {
    pub wsl_manager: Arc<dyn WslManagerPort>,
    pub snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    pub monitoring: Arc<dyn MonitoringProviderPort>,
    pub docker: Arc<dyn DockerProviderPort>,
    pub iac: Arc<dyn IacProviderPort>,
    pub audit_logger: Arc<dyn AuditLoggerPort>,
}
