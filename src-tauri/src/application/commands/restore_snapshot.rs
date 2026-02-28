use std::sync::Arc;

use crate::domain::entities::snapshot::RestoreMode;
use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::{DistroName, SnapshotId};

pub struct RestoreSnapshotCommand {
    pub snapshot_id: SnapshotId,
    pub mode: RestoreMode,
    pub install_location: String,
}

pub struct RestoreSnapshotHandler {
    wsl_manager: Arc<dyn WslManagerPort>,
    snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    audit_logger: Arc<dyn AuditLoggerPort>,
}

impl RestoreSnapshotHandler {
    pub fn new(
        wsl_manager: Arc<dyn WslManagerPort>,
        snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
        audit_logger: Arc<dyn AuditLoggerPort>,
    ) -> Self {
        Self {
            wsl_manager,
            snapshot_repo,
            audit_logger,
        }
    }

    pub async fn handle(&self, cmd: RestoreSnapshotCommand) -> Result<(), DomainError> {
        let snapshot = self.snapshot_repo.get_by_id(&cmd.snapshot_id).await?;

        if !std::path::Path::new(&snapshot.file_path).exists() {
            return Err(DomainError::SnapshotError(format!(
                "Snapshot file not found: {}",
                snapshot.file_path
            )));
        }

        let target_name = match &cmd.mode {
            RestoreMode::Clone { new_name } => DistroName::new(new_name)?,
            RestoreMode::Overwrite => snapshot.distro_name.clone(),
        };

        // For overwrite mode, unregister the existing distro first
        // (terminate + unregister, since wsl --import fails if the name exists)
        if matches!(cmd.mode, RestoreMode::Overwrite) {
            // Best-effort terminate; ignore error if already stopped
            let _ = self.wsl_manager.terminate_distro(&target_name).await;
            // Unregister MUST succeed; if it fails, import will fail with a name collision
            self.wsl_manager
                .unregister_distro(&target_name)
                .await
                .map_err(|e| {
                    DomainError::SnapshotError(format!(
                        "Failed to unregister '{}' before restore: {}",
                        target_name, e
                    ))
                })?;
        }

        self.wsl_manager
            .import_distro(
                &target_name,
                &cmd.install_location,
                &snapshot.file_path,
                snapshot.format.clone(),
            )
            .await?;

        self.audit_logger
            .log_with_details(
                "snapshot.restore",
                &cmd.snapshot_id.to_string(),
                &format!("Restored as '{}' ({:?})", target_name, cmd.mode),
            )
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::MemorySize;
    use chrono::Utc;

    fn make_snapshot(file_path: &str) -> Snapshot {
        Snapshot {
            id: SnapshotId::from_string("snap-001".into()),
            distro_name: DistroName::new("Ubuntu").unwrap(),
            name: "test".into(),
            description: None,
            snapshot_type: SnapshotType::Full,
            format: ExportFormat::Tar,
            file_path: file_path.to_string(),
            file_size: MemorySize::from_bytes(1024),
            parent_id: None,
            created_at: Utc::now(),
            status: SnapshotStatus::Completed,
        }
    }

    #[tokio::test]
    async fn test_restore_file_not_found() {
        let mut repo_mock = MockSnapshotRepositoryPort::new();
        let snap = make_snapshot("/nonexistent/file.tar");
        repo_mock
            .expect_get_by_id()
            .returning(move |_| Ok(snap.clone()));

        let wsl_mock = MockWslManagerPort::new();
        let audit_mock = MockAuditLoggerPort::new();

        let handler = RestoreSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        let result = handler
            .handle(RestoreSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
                mode: RestoreMode::Clone {
                    new_name: "Ubuntu-Clone".into(),
                },
                install_location: "/tmp".into(),
            })
            .await;
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("not found"));
    }

    #[tokio::test]
    async fn test_restore_clone_invalid_name() {
        // Create a temp file so path.exists() returns true
        let tmp = std::env::temp_dir().join("test_restore_clone_invalid.tar");
        std::fs::write(&tmp, b"test").unwrap();

        let mut repo_mock = MockSnapshotRepositoryPort::new();
        let snap = make_snapshot(tmp.to_str().unwrap());
        repo_mock
            .expect_get_by_id()
            .returning(move |_| Ok(snap.clone()));

        let wsl_mock = MockWslManagerPort::new();
        let audit_mock = MockAuditLoggerPort::new();

        let handler = RestoreSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        let result = handler
            .handle(RestoreSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
                mode: RestoreMode::Clone {
                    new_name: "".into(), // Invalid empty name
                },
                install_location: "/tmp".into(),
            })
            .await;

        let _ = std::fs::remove_file(&tmp);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_restore_import_failure() {
        let tmp = std::env::temp_dir().join("test_restore_import_fail.tar");
        std::fs::write(&tmp, b"test").unwrap();

        let mut repo_mock = MockSnapshotRepositoryPort::new();
        let snap = make_snapshot(tmp.to_str().unwrap());
        repo_mock
            .expect_get_by_id()
            .returning(move |_| Ok(snap.clone()));

        let mut wsl_mock = MockWslManagerPort::new();
        wsl_mock
            .expect_import_distro()
            .returning(|_, _, _, _| Err(DomainError::WslCliError("import failed".into())));

        let audit_mock = MockAuditLoggerPort::new();

        let handler = RestoreSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        let result = handler
            .handle(RestoreSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
                mode: RestoreMode::Clone {
                    new_name: "Ubuntu-Clone".into(),
                },
                install_location: "/tmp".into(),
            })
            .await;

        let _ = std::fs::remove_file(&tmp);
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_restore_overwrite_unregister_failure_propagates() {
        let tmp = std::env::temp_dir().join("test_restore_unreg_fail.tar");
        std::fs::write(&tmp, b"test").unwrap();

        let mut repo_mock = MockSnapshotRepositoryPort::new();
        let snap = make_snapshot(tmp.to_str().unwrap());
        repo_mock
            .expect_get_by_id()
            .returning(move |_| Ok(snap.clone()));

        let mut wsl_mock = MockWslManagerPort::new();
        wsl_mock.expect_terminate_distro().returning(|_| Ok(()));
        wsl_mock
            .expect_unregister_distro()
            .returning(|_| Err(DomainError::WslCliError("access denied".into())));

        let audit_mock = MockAuditLoggerPort::new();

        let handler = RestoreSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        let result = handler
            .handle(RestoreSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
                mode: RestoreMode::Overwrite,
                install_location: "/tmp".into(),
            })
            .await;

        let _ = std::fs::remove_file(&tmp);
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("unregister"));
    }
}
