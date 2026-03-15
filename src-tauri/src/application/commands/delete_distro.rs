use std::sync::Arc;

use crate::application::path_utils::windows_to_linux_path;
use crate::domain::errors::DomainError;
use crate::domain::ports::alerting::AlertingPort;
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::metrics_repository::MetricsRepositoryPort;
use crate::domain::ports::port_forwarding::PortForwardRulesRepository;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::DistroName;

pub struct DeleteDistroCommand {
    pub distro_name: DistroName,
    pub delete_snapshots: bool,
}

pub struct DeleteDistroHandler {
    wsl_manager: Arc<dyn WslManagerPort>,
    snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    metrics_repo: Arc<dyn MetricsRepositoryPort>,
    alerting: Arc<dyn AlertingPort>,
    port_rules_repo: Arc<dyn PortForwardRulesRepository>,
    audit_logger: Arc<dyn AuditLoggerPort>,
}

impl DeleteDistroHandler {
    pub fn new(
        wsl_manager: Arc<dyn WslManagerPort>,
        snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
        metrics_repo: Arc<dyn MetricsRepositoryPort>,
        alerting: Arc<dyn AlertingPort>,
        port_rules_repo: Arc<dyn PortForwardRulesRepository>,
        audit_logger: Arc<dyn AuditLoggerPort>,
    ) -> Self {
        Self {
            wsl_manager,
            snapshot_repo,
            metrics_repo,
            alerting,
            port_rules_repo,
            audit_logger,
        }
    }

    #[tracing::instrument(
        skip(self, cmd),
        fields(distro = %cmd.distro_name, delete_snapshots = cmd.delete_snapshots)
    )]
    pub async fn handle(&self, cmd: DeleteDistroCommand) -> Result<(), DomainError> {
        // 1. Verify the distro exists
        self.wsl_manager.get_distro(&cmd.distro_name).await?;

        // 2. Terminate the distro if running
        let _ = self.wsl_manager.terminate_distro(&cmd.distro_name).await;
        let _ = self.wsl_manager.shutdown_all().await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        // 3. Get install path before unregistering (needed for cleanup)
        let install_path = self
            .wsl_manager
            .get_distro_install_path(&cmd.distro_name)
            .await
            .ok();

        // 4. Unregister the distro
        self.wsl_manager
            .unregister_distro(&cmd.distro_name)
            .await
            .map_err(|e| {
                DomainError::WslCliError(format!(
                    "Failed to unregister '{}': {}",
                    cmd.distro_name, e
                ))
            })?;
        tracing::info!(distro = %cmd.distro_name, "distro unregistered");

        // 5. Remove install directory (best-effort)
        if let Some(ref path) = install_path {
            let install = std::path::Path::new(path);
            if install.exists() {
                if let Err(e) = std::fs::remove_dir_all(install) {
                    tracing::warn!(
                        path = %path,
                        error = %e,
                        "failed to remove install directory, retrying after shutdown"
                    );
                    let _ = self.wsl_manager.shutdown_all().await;
                    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                    if let Err(e) = std::fs::remove_dir_all(install) {
                        tracing::error!(path = %path, error = %e, "install directory cleanup failed");
                    }
                }
            }
        }

        // 6. Delete snapshots if requested
        if cmd.delete_snapshots {
            match self.snapshot_repo.delete_by_distro(&cmd.distro_name).await {
                Ok(snapshots) => {
                    tracing::info!(count = snapshots.len(), "deleted snapshot records");
                    for snap in &snapshots {
                        let file_path = &snap.file_path;
                        let linux_path = windows_to_linux_path(file_path);
                        let _ = std::fs::remove_file(file_path)
                            .or_else(|_| std::fs::remove_file(&linux_path));
                    }
                }
                Err(e) => tracing::warn!(error = %e, "failed to delete snapshots"),
            }
        }

        // 7. Purge related data (best-effort)
        if let Err(e) = self.metrics_repo.delete_by_distro(&cmd.distro_name).await {
            tracing::warn!(error = %e, "failed to purge metrics");
        }
        if let Err(e) = self.alerting.delete_by_distro(&cmd.distro_name).await {
            tracing::warn!(error = %e, "failed to purge alerts");
        }
        if let Err(e) = self
            .port_rules_repo
            .delete_by_distro(cmd.distro_name.as_str())
            .await
        {
            tracing::warn!(error = %e, "failed to purge port forwarding rules");
        }

        // 8. Audit log
        self.audit_logger
            .log_with_details(
                "distro.delete",
                cmd.distro_name.as_str(),
                &format!(
                    "Deleted distro '{}' (snapshots: {})",
                    cmd.distro_name,
                    if cmd.delete_snapshots {
                        "deleted"
                    } else {
                        "kept"
                    }
                ),
            )
            .await?;

        tracing::info!(distro = %cmd.distro_name, "distro deletion complete");
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ports::alerting::MockAlertingPort;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::metrics_repository::MockMetricsRepositoryPort;
    use crate::domain::ports::port_forwarding::MockPortForwardRulesRepository;
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;

    fn make_handler(
        wsl: MockWslManagerPort,
        snap: MockSnapshotRepositoryPort,
        metrics: MockMetricsRepositoryPort,
        alert: MockAlertingPort,
        port_rules: MockPortForwardRulesRepository,
        audit: MockAuditLoggerPort,
    ) -> DeleteDistroHandler {
        DeleteDistroHandler::new(
            Arc::new(wsl),
            Arc::new(snap),
            Arc::new(metrics),
            Arc::new(alert),
            Arc::new(port_rules),
            Arc::new(audit),
        )
    }

    #[tokio::test]
    async fn test_delete_distro_not_found() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_distro()
            .returning(|_| Err(DomainError::DistroNotFound("Test".into())));

        let handler = make_handler(
            wsl,
            MockSnapshotRepositoryPort::new(),
            MockMetricsRepositoryPort::new(),
            MockAlertingPort::new(),
            MockPortForwardRulesRepository::new(),
            MockAuditLoggerPort::new(),
        );

        let result = handler
            .handle(DeleteDistroCommand {
                distro_name: DistroName::new("Test").unwrap(),
                delete_snapshots: false,
            })
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_delete_distro_unregister_failure() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_distro().returning(|name| {
            Ok(crate::domain::entities::distro::Distro {
                name: name.clone(),
                state: crate::domain::value_objects::DistroState::Stopped,
                wsl_version: crate::domain::value_objects::WslVersion::V2,
                is_default: false,
                base_path: None,
                vhdx_size: None,
                last_seen: chrono::Utc::now(),
            })
        });
        wsl.expect_terminate_distro().returning(|_| Ok(()));
        wsl.expect_shutdown_all().returning(|| Ok(()));
        wsl.expect_get_distro_install_path()
            .returning(|_| Ok("/tmp/test".into()));
        wsl.expect_unregister_distro()
            .returning(|_| Err(DomainError::WslCliError("access denied".into())));

        let handler = make_handler(
            wsl,
            MockSnapshotRepositoryPort::new(),
            MockMetricsRepositoryPort::new(),
            MockAlertingPort::new(),
            MockPortForwardRulesRepository::new(),
            MockAuditLoggerPort::new(),
        );

        let result = handler
            .handle(DeleteDistroCommand {
                distro_name: DistroName::new("Ubuntu").unwrap(),
                delete_snapshots: false,
            })
            .await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_delete_distro_success_without_snapshots() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_distro().returning(|name| {
            Ok(crate::domain::entities::distro::Distro {
                name: name.clone(),
                state: crate::domain::value_objects::DistroState::Stopped,
                wsl_version: crate::domain::value_objects::WslVersion::V2,
                is_default: false,
                base_path: None,
                vhdx_size: None,
                last_seen: chrono::Utc::now(),
            })
        });
        wsl.expect_terminate_distro().returning(|_| Ok(()));
        wsl.expect_shutdown_all().returning(|| Ok(()));
        wsl.expect_get_distro_install_path()
            .returning(|_| Ok("/nonexistent/path".into()));
        wsl.expect_unregister_distro().returning(|_| Ok(()));

        let mut metrics = MockMetricsRepositoryPort::new();
        metrics.expect_delete_by_distro().returning(|_| Ok(()));

        let mut alert = MockAlertingPort::new();
        alert.expect_delete_by_distro().returning(|_| Ok(()));

        let mut port_rules = MockPortForwardRulesRepository::new();
        port_rules.expect_delete_by_distro().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log_with_details().returning(|_, _, _| Ok(()));

        let handler = make_handler(
            wsl,
            MockSnapshotRepositoryPort::new(),
            metrics,
            alert,
            port_rules,
            audit,
        );

        let result = handler
            .handle(DeleteDistroCommand {
                distro_name: DistroName::new("Ubuntu").unwrap(),
                delete_snapshots: false,
            })
            .await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_delete_distro_with_snapshots() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_distro().returning(|name| {
            Ok(crate::domain::entities::distro::Distro {
                name: name.clone(),
                state: crate::domain::value_objects::DistroState::Stopped,
                wsl_version: crate::domain::value_objects::WslVersion::V2,
                is_default: false,
                base_path: None,
                vhdx_size: None,
                last_seen: chrono::Utc::now(),
            })
        });
        wsl.expect_terminate_distro().returning(|_| Ok(()));
        wsl.expect_shutdown_all().returning(|| Ok(()));
        wsl.expect_get_distro_install_path()
            .returning(|_| Ok("/nonexistent/path".into()));
        wsl.expect_unregister_distro().returning(|_| Ok(()));

        let mut snap = MockSnapshotRepositoryPort::new();
        snap.expect_delete_by_distro()
            .returning(|_| Ok(Vec::new()));

        let mut metrics = MockMetricsRepositoryPort::new();
        metrics.expect_delete_by_distro().returning(|_| Ok(()));

        let mut alert = MockAlertingPort::new();
        alert.expect_delete_by_distro().returning(|_| Ok(()));

        let mut port_rules = MockPortForwardRulesRepository::new();
        port_rules.expect_delete_by_distro().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log_with_details().returning(|_, _, _| Ok(()));

        let handler = make_handler(wsl, snap, metrics, alert, port_rules, audit);

        let result = handler
            .handle(DeleteDistroCommand {
                distro_name: DistroName::new("Ubuntu").unwrap(),
                delete_snapshots: true,
            })
            .await;
        assert!(result.is_ok());
    }
}
