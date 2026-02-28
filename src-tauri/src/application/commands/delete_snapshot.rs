use std::sync::Arc;

use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::value_objects::SnapshotId;

pub struct DeleteSnapshotCommand {
    pub snapshot_id: SnapshotId,
}

pub struct DeleteSnapshotHandler {
    snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    audit_logger: Arc<dyn AuditLoggerPort>,
}

impl DeleteSnapshotHandler {
    pub fn new(
        snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
        audit_logger: Arc<dyn AuditLoggerPort>,
    ) -> Self {
        Self {
            snapshot_repo,
            audit_logger,
        }
    }

    pub async fn handle(&self, cmd: DeleteSnapshotCommand) -> Result<(), DomainError> {
        let snapshot = self.snapshot_repo.get_by_id(&cmd.snapshot_id).await?;

        // Delete the snapshot file from disk
        if std::path::Path::new(&snapshot.file_path).exists() {
            std::fs::remove_file(&snapshot.file_path)
                .map_err(|e| DomainError::SnapshotError(e.to_string()))?;
        }

        self.snapshot_repo.delete(&cmd.snapshot_id).await?;
        self.audit_logger
            .log("snapshot.delete", &cmd.snapshot_id.to_string())
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
    use crate::domain::value_objects::{DistroName, MemorySize};
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
    async fn test_delete_not_found() {
        let mut repo_mock = MockSnapshotRepositoryPort::new();
        repo_mock
            .expect_get_by_id()
            .returning(|_| Err(DomainError::SnapshotNotFound("snap-001".into())));

        let audit_mock = MockAuditLoggerPort::new();

        let handler = DeleteSnapshotHandler::new(Arc::new(repo_mock), Arc::new(audit_mock));
        assert!(handler
            .handle(DeleteSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
            })
            .await
            .is_err());
    }

    #[tokio::test]
    async fn test_delete_calls_repo_delete_and_audit() {
        // Use a non-existent file path so fs::remove_file is skipped
        let mut repo_mock = MockSnapshotRepositoryPort::new();
        let snap = make_snapshot("/nonexistent/path/file.tar");
        repo_mock
            .expect_get_by_id()
            .returning(move |_| Ok(snap.clone()));
        repo_mock.expect_delete().returning(|_| Ok(()));

        let mut audit_mock = MockAuditLoggerPort::new();
        audit_mock.expect_log().returning(|_, _| Ok(()));

        let handler = DeleteSnapshotHandler::new(Arc::new(repo_mock), Arc::new(audit_mock));
        assert!(handler
            .handle(DeleteSnapshotCommand {
                snapshot_id: SnapshotId::from_string("snap-001".into()),
            })
            .await
            .is_ok());
    }
}
