use std::sync::Arc;

use crate::application::path_utils::windows_to_linux_path;
use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::AuditLoggerPort;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::ports::wsl_manager::WslManagerPort;
use crate::domain::value_objects::{DistroName, MemorySize, SnapshotId};
use chrono::Utc;

pub struct CreateSnapshotCommand {
    pub distro_name: DistroName,
    pub name: String,
    pub description: Option<String>,
    pub format: ExportFormat,
    pub output_dir: String,
}

pub struct CreateSnapshotHandler {
    wsl_manager: Arc<dyn WslManagerPort>,
    snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
    audit_logger: Arc<dyn AuditLoggerPort>,
}

impl CreateSnapshotHandler {
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

    pub async fn handle(&self, cmd: CreateSnapshotCommand) -> Result<Snapshot, DomainError> {
        let id = SnapshotId::new();
        let file_path = format!(
            "{}/{}-{}.{}",
            cmd.output_dir,
            cmd.distro_name,
            id,
            cmd.format.extension()
        );

        let mut snapshot = Snapshot {
            id: id.clone(),
            distro_name: cmd.distro_name.clone(),
            name: cmd.name,
            description: cmd.description,
            snapshot_type: SnapshotType::Full,
            format: cmd.format.clone(),
            file_path: file_path.clone(),
            file_size: MemorySize::zero(),
            parent_id: None,
            created_at: Utc::now(),
            status: SnapshotStatus::InProgress,
        };

        self.snapshot_repo.save(&snapshot).await?;

        match self
            .wsl_manager
            .export_distro(&cmd.distro_name, &file_path, cmd.format)
            .await
        {
            Ok(()) => {
                // Read file size and reject empty exports.
                // Try the stored path first; fall back to Windows→Linux conversion
                // (handles C:\... paths when running from WSL).
                snapshot.file_size = std::fs::metadata(&file_path)
                    .or_else(|_| {
                        let linux = windows_to_linux_path(&file_path);
                        if linux != file_path {
                            std::fs::metadata(&linux)
                        } else {
                            std::fs::metadata(&file_path)
                        }
                    })
                    .map(|m| MemorySize::from_bytes(m.len()))
                    .unwrap_or_else(|_| MemorySize::zero());

                if snapshot.file_size.bytes() == 0 {
                    snapshot.status =
                        SnapshotStatus::Failed("Export produced an empty file".into());
                    self.snapshot_repo.save(&snapshot).await?;
                    return Err(DomainError::SnapshotError(
                        "Export produced an empty file (0 bytes)".into(),
                    ));
                }

                snapshot.status = SnapshotStatus::Completed;
            }
            Err(e) => {
                snapshot.status = SnapshotStatus::Failed(e.to_string());
                self.snapshot_repo.save(&snapshot).await?;
                return Err(e);
            }
        }

        self.snapshot_repo.save(&snapshot).await?;
        self.audit_logger
            .log("snapshot.create", &id.to_string())
            .await?;

        Ok(snapshot)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use std::sync::atomic::{AtomicU32, Ordering};

    fn make_cmd() -> CreateSnapshotCommand {
        CreateSnapshotCommand {
            distro_name: DistroName::new("Ubuntu").unwrap(),
            name: "backup".into(),
            description: Some("test".into()),
            format: ExportFormat::Tar,
            output_dir: "/tmp".into(),
        }
    }

    #[tokio::test]
    async fn test_create_snapshot_export_failure_saves_failed_status() {
        let wsl_mock = {
            let mut m = MockWslManagerPort::new();
            m.expect_export_distro()
                .returning(|_, _, _| Err(DomainError::WslCliError("export failed".into())));
            m
        };

        let save_count = Arc::new(AtomicU32::new(0));
        let sc = save_count.clone();
        let repo_mock = {
            let mut m = MockSnapshotRepositoryPort::new();
            m.expect_save().returning(move |_| {
                sc.fetch_add(1, Ordering::SeqCst);
                Ok(())
            });
            m
        };

        let audit_mock = MockAuditLoggerPort::new();

        let handler = CreateSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );

        let result = handler.handle(make_cmd()).await;
        assert!(result.is_err());
        // save called twice: once InProgress, once Failed
        assert_eq!(save_count.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn test_create_snapshot_file_path_format() {
        // We can verify the file path format by checking what's passed to export_distro
        let mut wsl_mock = MockWslManagerPort::new();
        wsl_mock
            .expect_export_distro()
            .withf(|_, path, _| path.starts_with("/tmp/Ubuntu-") && path.ends_with(".tar"))
            .returning(|_, _, _| Err(DomainError::WslCliError("abort".into())));

        let mut repo_mock = MockSnapshotRepositoryPort::new();
        repo_mock.expect_save().returning(|_| Ok(()));

        let audit_mock = MockAuditLoggerPort::new();

        let handler = CreateSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        // We expect an error but the important assertion is the withf on export_distro
        let _ = handler.handle(make_cmd()).await;
    }

    #[tokio::test]
    async fn test_create_snapshot_saves_in_progress_first() {
        let mut wsl_mock = MockWslManagerPort::new();
        wsl_mock
            .expect_export_distro()
            .returning(|_, _, _| Err(DomainError::WslCliError("abort".into())));

        let statuses = Arc::new(std::sync::Mutex::new(Vec::new()));
        let sc = statuses.clone();
        let mut repo_mock = MockSnapshotRepositoryPort::new();
        repo_mock.expect_save().returning(move |snap| {
            let status = match &snap.status {
                SnapshotStatus::InProgress => "in_progress",
                SnapshotStatus::Completed => "completed",
                SnapshotStatus::Failed(_) => "failed",
            };
            let mut v = sc.lock().unwrap();
            v.push(status.to_string());
            Ok(())
        });

        let audit_mock = MockAuditLoggerPort::new();

        let handler = CreateSnapshotHandler::new(
            Arc::new(wsl_mock),
            Arc::new(repo_mock),
            Arc::new(audit_mock),
        );
        let _ = handler.handle(make_cmd()).await;

        let statuses = statuses.lock().unwrap();
        assert_eq!(statuses[0], "in_progress");
        assert_eq!(statuses[1], "failed");
    }
}
