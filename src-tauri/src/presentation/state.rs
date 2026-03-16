use std::sync::Arc;

use crate::domain::ports::alerting::{AlertThreshold, AlertingPort};
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::metrics_repository::MetricsRepositoryPort;
use crate::domain::ports::monitoring_provider::MonitoringProviderPort;
use crate::domain::ports::port_forwarding::{PortForwardRulesRepository, PortForwardingPort};
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::ports::wsl_manager::WslManagerPort;

use crate::domain::errors::DomainError;

/// Composition root: holds all hexagonal port implementations.
/// Injected into Tauri as managed state.
pub struct AppState {
    pub wsl_manager: Arc<dyn WslManagerPort>,
    pub snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    pub monitoring: Arc<dyn MonitoringProviderPort>,
    pub metrics_repo: Arc<dyn MetricsRepositoryPort>,
    pub alerting: Arc<dyn AlertingPort>,
    pub audit_logger: Arc<dyn AuditLoggerPort>,
    pub alert_thresholds: Arc<tokio::sync::RwLock<Vec<AlertThreshold>>>,
    pub port_forwarding: Arc<dyn PortForwardingPort>,
    pub port_rules_repo: Arc<dyn PortForwardRulesRepository>,
}

impl AppState {
    /// Log an audit event. Centralizes the `audit_logger.log()` call.
    pub async fn audit(&self, action: &str, detail: &str) -> Result<(), DomainError> {
        self.audit_logger.log(action, detail).await
    }
}
