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

    /// Check if a file starts with valid tar data by looking for the "ustar" magic
    /// at byte offset 257 (per POSIX tar format specification).
    fn validate_tar_magic(path: &std::path::Path) -> bool {
        use std::io::Read;
        let Ok(mut f) = std::fs::File::open(path) else {
            return false;
        };
        let mut buf = [0u8; 263];
        if f.read_exact(&mut buf).is_err() {
            return false;
        }
        // "ustar" magic at offset 257
        &buf[257..262] == b"ustar"
    }

    pub async fn handle(&self, cmd: CreateSnapshotCommand) -> Result<Snapshot, DomainError> {
        let overall_start = std::time::Instant::now();
        let id = SnapshotId::new();
        let file_path = std::path::PathBuf::from(&cmd.output_dir)
            .join(format!(
                "{}-{}.{}",
                cmd.distro_name,
                id,
                cmd.format.extension()
            ))
            .to_string_lossy()
            .to_string();

        tracing::info!(
            "creating snapshot id={} distro={} name={} format={:?} output_dir={} file_path={}",
            id,
            cmd.distro_name,
            cmd.name,
            cmd.format,
            cmd.output_dir,
            file_path
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
            default_user: None,
        };

        // Capture the default user while the distro is still bootable.
        // exec_in_distro auto-starts stopped distros, so this works in all cases.
        snapshot.default_user = match self.wsl_manager.get_default_user(&cmd.distro_name).await {
            Ok(user) => {
                tracing::info!("captured default user for snapshot: {:?}", user);
                user
            }
            Err(e) => {
                tracing::warn!("failed to detect default user: {}", e);
                None
            }
        };

        tracing::info!(snapshot_id = %id, "saving snapshot with status InProgress");
        self.snapshot_repo.save(&snapshot).await?;

        // Shut down the entire WSL VM before exporting to avoid:
        // - VHDX: ERROR_SHARING_VIOLATION (ext4.vhdx locked by running VM)
        // - TAR: HCS_E_CONNECTION_TIMEOUT (HCS can't reach the VM)
        // wsl --terminate alone is insufficient: the lightweight utility VM
        // may still hold locks. A full --shutdown ensures a clean state.
        tracing::info!(distro = %cmd.distro_name, "terminating distro before export");
        let was_running = self
            .wsl_manager
            .terminate_distro(&cmd.distro_name)
            .await
            .is_ok();
        tracing::info!(
            was_running = was_running,
            "terminate result, shutting down WSL"
        );
        let _ = self.wsl_manager.shutdown_all().await;

        // Wait for WSL VM to fully release all file handles.
        // 2s is often insufficient on slower machines; 5s provides a safer margin.
        tracing::info!("WSL shutdown complete, waiting 5s for file handle release");
        tokio::time::sleep(std::time::Duration::from_secs(5)).await;

        tracing::info!(
            distro = %cmd.distro_name,
            file_path = %file_path,
            format = ?cmd.format,
            "executing wsl --export"
        );

        // Try export, retry once after another shutdown if HCS times out
        let export_start = std::time::Instant::now();
        let export_result = match self
            .wsl_manager
            .export_distro(&cmd.distro_name, &file_path, cmd.format.clone())
            .await
        {
            Err(e) if e.to_string().contains("TIMEOUT") || e.to_string().contains("SHARING") => {
                tracing::warn!(
                    error = %e,
                    elapsed_ms = export_start.elapsed().as_millis() as u64,
                    "export failed, retrying after full shutdown"
                );
                let _ = self.wsl_manager.shutdown_all().await;
                tracing::info!("retry: WSL shutdown complete, waiting 5s");
                tokio::time::sleep(std::time::Duration::from_secs(5)).await;
                let retry_start = std::time::Instant::now();
                let result = self
                    .wsl_manager
                    .export_distro(&cmd.distro_name, &file_path, cmd.format)
                    .await;
                match &result {
                    Ok(()) => tracing::info!(
                        elapsed_ms = retry_start.elapsed().as_millis() as u64,
                        "retry export completed successfully"
                    ),
                    Err(e) => tracing::error!(
                        error = %e,
                        elapsed_ms = retry_start.elapsed().as_millis() as u64,
                        "retry export also failed"
                    ),
                }
                result
            }
            Ok(()) => {
                tracing::info!(
                    "wsl --export completed successfully in {}ms",
                    export_start.elapsed().as_millis()
                );
                Ok(())
            }
            Err(e) => {
                tracing::error!(
                    "wsl --export failed after {}ms: {}",
                    export_start.elapsed().as_millis(),
                    e
                );
                Err(e)
            }
        };

        // Restart the distro if it was running before the export
        if was_running {
            tracing::info!(distro = %cmd.distro_name, "restarting distro (was running before export)");
            let _ = self.wsl_manager.start_distro(&cmd.distro_name).await;
        }

        match export_result {
            Ok(()) => {
                // Read file size and reject empty exports.
                // Try the stored path first; fall back to Windows→Linux conversion
                // (handles C:\... paths when running from WSL).
                let meta_result = std::fs::metadata(&file_path);
                tracing::info!(
                    "metadata check for '{}': {}",
                    file_path,
                    match &meta_result {
                        Ok(m) => format!("OK, {} bytes", m.len()),
                        Err(e) => format!("FAILED: {}", e),
                    }
                );
                let meta_result = meta_result.or_else(|_| {
                    let linux = windows_to_linux_path(&file_path);
                    tracing::info!(
                        "trying linux path fallback: '{}' (same={})",
                        linux,
                        linux == file_path
                    );
                    if linux != file_path {
                        let r = std::fs::metadata(&linux);
                        tracing::info!(
                            "linux path metadata: {}",
                            match &r {
                                Ok(m) => format!("OK, {} bytes", m.len()),
                                Err(e) => format!("FAILED: {}", e),
                            }
                        );
                        r
                    } else {
                        std::fs::metadata(&file_path)
                    }
                });

                snapshot.file_size = meta_result
                    .map(|m| MemorySize::from_bytes(m.len()))
                    .unwrap_or_else(|e| {
                        tracing::error!(
                            "failed to read export file metadata: path='{}' error={}",
                            file_path,
                            e
                        );
                        MemorySize::zero()
                    });

                tracing::info!(
                    "export file size: {} bytes (path={})",
                    snapshot.file_size.bytes(),
                    file_path
                );

                if snapshot.file_size.bytes() == 0 {
                    tracing::error!(
                        "export produced an empty file (0 bytes): path='{}'",
                        file_path
                    );
                    snapshot.status =
                        SnapshotStatus::Failed("Export produced an empty file".into());
                    self.snapshot_repo.save(&snapshot).await?;
                    return Err(DomainError::SnapshotError(
                        "Export produced an empty file (0 bytes)".into(),
                    ));
                }

                // For tar exports, verify the file starts with valid tar data.
                // The "ustar" magic string appears at offset 257 in valid tar archives.
                // This catches cases where wsl --export returned code 0 but wrote
                // garbage or an incomplete file.
                if matches!(snapshot.format, ExportFormat::Tar) {
                    let tar_path = std::path::Path::new(&file_path);
                    let linux = windows_to_linux_path(&file_path);
                    let tar_valid_win = Self::validate_tar_magic(tar_path);
                    let tar_valid_linux = linux != file_path
                        && Self::validate_tar_magic(std::path::Path::new(&linux));
                    let tar_valid = tar_valid_win || tar_valid_linux;
                    tracing::info!(
                        "tar magic check: win_path={} linux_path={} valid_win={} valid_linux={} file_size={}",
                        file_path,
                        linux,
                        tar_valid_win,
                        tar_valid_linux,
                        snapshot.file_size.bytes()
                    );
                    if !tar_valid && snapshot.file_size.bytes() > 262 {
                        tracing::warn!(
                            "exported tar file does not contain valid tar magic: path='{}' size={}",
                            file_path,
                            snapshot.file_size.bytes()
                        );
                        snapshot.status =
                            SnapshotStatus::Failed("Export produced an invalid tar file".into());
                        self.snapshot_repo.save(&snapshot).await?;
                        return Err(DomainError::SnapshotError(
                            "Export produced an invalid tar file (missing ustar magic)".into(),
                        ));
                    }
                    tracing::info!("tar magic validation passed");
                }

                snapshot.status = SnapshotStatus::Completed;
            }
            Err(e) => {
                tracing::error!("export failed, saving snapshot as Failed: {}", e);
                snapshot.status = SnapshotStatus::Failed(e.to_string());
                self.snapshot_repo.save(&snapshot).await?;
                return Err(e);
            }
        }

        tracing::info!(
            "snapshot completed, saving final status: id={} size={} elapsed={}ms",
            id,
            snapshot.file_size.bytes(),
            overall_start.elapsed().as_millis()
        );
        if let Err(e) = self.snapshot_repo.save(&snapshot).await {
            tracing::error!("FAILED to save completed snapshot to DB: {}", e);
            return Err(e);
        }
        tracing::info!("snapshot saved to DB successfully");
        if let Err(e) = self
            .audit_logger
            .log("snapshot.create", &id.to_string())
            .await
        {
            tracing::error!("FAILED to write audit log: {}", e);
            return Err(e);
        }
        tracing::info!("snapshot creation fully complete: id={}", id);

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
            m.expect_get_default_user()
                .returning(|_| Ok(Some("testuser".into())));
            m.expect_terminate_distro().returning(|_| Ok(()));
            m.expect_shutdown_all().returning(|| Ok(()));
            m.expect_export_distro()
                .returning(|_, _, _| Err(DomainError::WslCliError("export failed".into())));
            m.expect_start_distro().returning(|_| Ok(()));
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
        wsl_mock.expect_get_default_user().returning(|_| Ok(None));
        wsl_mock.expect_terminate_distro().returning(|_| Ok(()));
        wsl_mock.expect_shutdown_all().returning(|| Ok(()));
        wsl_mock
            .expect_export_distro()
            .withf(|_, path, _| path.starts_with("/tmp/Ubuntu-") && path.ends_with(".tar"))
            .returning(|_, _, _| Err(DomainError::WslCliError("abort".into())));
        wsl_mock.expect_start_distro().returning(|_| Ok(()));

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
        wsl_mock.expect_get_default_user().returning(|_| Ok(None));
        wsl_mock.expect_terminate_distro().returning(|_| Ok(()));
        wsl_mock.expect_shutdown_all().returning(|| Ok(()));
        wsl_mock
            .expect_export_distro()
            .returning(|_, _, _| Err(DomainError::WslCliError("abort".into())));
        wsl_mock.expect_start_distro().returning(|_| Ok(()));

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
