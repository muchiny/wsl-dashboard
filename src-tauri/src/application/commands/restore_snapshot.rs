use std::sync::Arc;

use crate::application::path_utils::windows_to_linux_path;
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

        tracing::info!(
            "starting snapshot restore: id={} path={} format={:?} mode={:?} install={}",
            cmd.snapshot_id,
            snapshot.file_path,
            snapshot.format,
            cmd.mode,
            cmd.install_location
        );

        // Try the stored path first; if it fails (e.g. Windows path on Linux),
        // try converting Windows→Linux (/mnt/x/...) as a fallback.
        let file_meta = std::fs::metadata(&snapshot.file_path)
            .or_else(|_| {
                let linux_path = windows_to_linux_path(&snapshot.file_path);
                if linux_path != snapshot.file_path {
                    tracing::info!(
                        "retrying metadata with converted path: original={} converted={}",
                        snapshot.file_path,
                        linux_path
                    );
                    std::fs::metadata(&linux_path)
                } else {
                    // Can't convert, re-trigger the original error
                    std::fs::metadata(&snapshot.file_path)
                }
            })
            .map_err(|e| {
                DomainError::SnapshotError(format!(
                    "Snapshot file not found: {} ({})",
                    snapshot.file_path, e
                ))
            })?;

        if file_meta.len() == 0 {
            return Err(DomainError::SnapshotError(
                "Snapshot file is empty (0 bytes)".into(),
            ));
        }

        let expected_ext = snapshot.format.extension();
        let actual_ext = std::path::Path::new(&snapshot.file_path)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("");
        if !actual_ext.eq_ignore_ascii_case(expected_ext) {
            return Err(DomainError::SnapshotError(format!(
                "File extension '{}' does not match expected format '{}'",
                actual_ext, expected_ext
            )));
        }

        let target_name = match &cmd.mode {
            RestoreMode::Clone { new_name } => DistroName::new(new_name)?,
            RestoreMode::Overwrite => snapshot.distro_name.clone(),
        };

        // For overwrite mode: terminate, shutdown, create safety backup, then unregister.
        // The backup is created AFTER terminate+shutdown so the export doesn't
        // compete with a running VM for VHDX file handles.
        let safety_backup_path: Option<String> = if matches!(cmd.mode, RestoreMode::Overwrite) {
            // Best-effort terminate; ignore error if already stopped
            let _ = self.wsl_manager.terminate_distro(&target_name).await;

            // Shut down the entire WSL VM to release VHDX locks.
            // wsl --terminate alone is insufficient: the lightweight utility VM
            // may still hold file handles on the VHDX.
            let _ = self.wsl_manager.shutdown_all().await;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;

            // Create safety backup AFTER shutdown — exporting while the distro
            // is running can leave file handles open on the VHDX, which later
            // prevents remove_dir_all from nuking the install directory.
            let backup_dir = std::path::Path::new(&cmd.install_location)
                .parent()
                .unwrap_or(std::path::Path::new(&cmd.install_location));
            let backup_file = backup_dir.join(format!(
                "{}_pre_restore_backup.{}",
                target_name,
                snapshot.format.extension()
            ));
            let backup_str = backup_file.to_string_lossy().to_string();
            tracing::info!(
                "creating safety backup after shutdown: distro={} path={}",
                target_name,
                backup_str
            );
            match self
                .wsl_manager
                .export_distro(&target_name, &backup_str, snapshot.format.clone())
                .await
            {
                Ok(()) => {
                    // Verify backup is not empty
                    let linux_backup = windows_to_linux_path(&backup_str);
                    let backup_size = std::fs::metadata(&backup_str)
                        .or_else(|_| std::fs::metadata(&linux_backup))
                        .map(|m| m.len())
                        .unwrap_or(0);
                    if backup_size > 0 {
                        tracing::info!("safety backup created successfully: {} bytes", backup_size);
                        Some(backup_str)
                    } else {
                        tracing::warn!("safety backup is empty (0 bytes), proceeding without it");
                        None
                    }
                }
                Err(e) => {
                    tracing::warn!("safety backup failed, proceeding without it: {}", e);
                    None
                }
            }
        } else {
            None
        };

        if matches!(cmd.mode, RestoreMode::Overwrite) {
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

            // Nuke the entire install directory to guarantee wsl --import
            // creates a fresh VHDX from the snapshot tar. If the old ext4.vhdx
            // persists (known WSL bug: wslservice.exe holds a file handle after
            // unregister), wsl --import silently reuses it instead of the tar.
            let install_path = std::path::Path::new(&cmd.install_location);
            if install_path.exists() {
                tracing::warn!(
                    "removing install directory before import: {}",
                    cmd.install_location
                );
                if let Err(e) = std::fs::remove_dir_all(install_path) {
                    // VHDX still locked — try another full shutdown and retry
                    tracing::warn!(
                        "remove_dir_all failed ({}), forcing WSL shutdown and retrying",
                        e
                    );
                    let _ = self.wsl_manager.shutdown_all().await;
                    tokio::time::sleep(std::time::Duration::from_secs(3)).await;
                    std::fs::remove_dir_all(install_path).map_err(|e| {
                        DomainError::SnapshotError(format!(
                            "Cannot delete install directory '{}': {}. \
                             Close all WSL sessions and try again.",
                            cmd.install_location, e
                        ))
                    })?;
                    tracing::warn!(
                        "install directory removed after WSL shutdown: {}",
                        cmd.install_location
                    );
                }
            }

            // Recreate empty directory for wsl --import
            std::fs::create_dir_all(install_path).map_err(|e| {
                DomainError::SnapshotError(format!(
                    "Cannot create install directory '{}': {}",
                    cmd.install_location, e
                ))
            })?;
            tracing::warn!(
                "clean install directory ready for import: {}",
                cmd.install_location
            );

            // Final WSL shutdown to release any lingering VM caches
            let _ = self.wsl_manager.shutdown_all().await;
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }

        tracing::info!(
            "executing wsl --import: distro={} install={} snapshot={} size={}",
            target_name,
            cmd.install_location,
            snapshot.file_path,
            snapshot.file_size.bytes()
        );

        let import_result = self
            .wsl_manager
            .import_distro(
                &target_name,
                &cmd.install_location,
                &snapshot.file_path,
                snapshot.format.clone(),
            )
            .await;

        // If import failed in overwrite mode, try to restore from safety backup
        if let Err(ref import_err) = import_result
            && matches!(cmd.mode, RestoreMode::Overwrite)
            && let Some(ref backup_path) = safety_backup_path
        {
            tracing::error!(
                "import failed, attempting to restore from safety backup: {}",
                import_err
            );
            if let Err(restore_err) = self
                .wsl_manager
                .import_distro(
                    &target_name,
                    &cmd.install_location,
                    backup_path,
                    snapshot.format.clone(),
                )
                .await
            {
                tracing::error!("safety backup restore also failed: {}", restore_err);
                return Err(DomainError::SnapshotError(format!(
                    "Import failed: {}. Safety backup restore also failed: {}. \
                     The backup file is preserved at: {}",
                    import_err, restore_err, backup_path
                )));
            }
            tracing::info!("restored from safety backup after import failure");
            // Clean up backup file
            let _ = std::fs::remove_file(backup_path)
                .or_else(|_| std::fs::remove_file(windows_to_linux_path(backup_path)));
            return Err(DomainError::SnapshotError(format!(
                "Import failed: {}. Original distro has been restored from safety backup.",
                import_err
            )));
        }
        import_result?;

        // Verify the import actually registered the distro
        self.wsl_manager
            .get_distro(&target_name)
            .await
            .map_err(|_| {
                DomainError::SnapshotError(format!(
                    "Import claimed success but '{}' was not found afterwards",
                    target_name
                ))
            })?;
        tracing::warn!("import verified: distro '{}' exists", target_name);

        // Force a clean VHDX mount — without this, wslservice.exe may serve
        // cached filesystem data from the previous (pre-unregister) VHDX.
        // The first exec_in_distro below boots the distro; if the VM still
        // holds stale pages the "new" import appears to contain old data.
        let _ = self.wsl_manager.shutdown_all().await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        // Verify the new VHDX was actually created from the snapshot.
        // If the import silently reused stale data, the VHDX won't have
        // a recent modification time.
        let new_vhdx = std::path::Path::new(&cmd.install_location).join("ext4.vhdx");
        let linux_loc = windows_to_linux_path(&cmd.install_location);
        let new_vhdx_linux = std::path::Path::new(&linux_loc).join("ext4.vhdx");
        let vhdx_meta = std::fs::metadata(&new_vhdx)
            .or_else(|_| {
                if new_vhdx_linux != new_vhdx {
                    std::fs::metadata(&new_vhdx_linux)
                } else {
                    std::fs::metadata(&new_vhdx)
                }
            })
            .ok();
        if let Some(meta) = &vhdx_meta {
            let modified_recently = meta
                .modified()
                .ok()
                .and_then(|t| t.elapsed().ok())
                .is_some_and(|age| age.as_secs() < 120);
            tracing::warn!(
                "post-import VHDX verification: vhdx_size={} snapshot_size={} modified_recently={}",
                meta.len(),
                snapshot.file_size.bytes(),
                modified_recently
            );
            if !modified_recently {
                return Err(DomainError::SnapshotError(
                    "Import succeeded but the VHDX was not updated — the old \
                     filesystem may still be in use. Please close all WSL \
                     sessions and try again."
                        .into(),
                ));
            }
        } else {
            tracing::warn!(
                "post-import VHDX not found — import may have used a different path: install={}",
                cmd.install_location
            );
        }

        // Diagnostic: check snapshot marker to prove the imported filesystem
        // is actually from the snapshot tar/vhdx.
        // Marker lives in /root/ (not /tmp/) so it survives tmpfs clears on reboot.
        match self
            .wsl_manager
            .exec_in_distro(&target_name, "cat /root/.snapshot-marker 2>/dev/null")
            .await
        {
            Ok(marker) if !marker.trim().is_empty() => {
                tracing::warn!("snapshot marker found: {}", marker.trim());
            }
            Ok(_) => {
                tracing::warn!("snapshot marker file exists but is empty");
            }
            Err(_) => {
                tracing::warn!(
                    "snapshot marker NOT found — filesystem may not be from the snapshot"
                );
            }
        }

        // Diagnostic: list /home/ contents and filesystem type after import
        match self
            .wsl_manager
            .exec_in_distro(
                &target_name,
                "echo '---HOME-AFTER-IMPORT---' && ls -la /home/ 2>/dev/null && echo '---FSINFO---' && df -T / 2>/dev/null && echo '---MOUNT---' && mount | grep ext4 2>/dev/null",
            )
            .await
        {
            Ok(output) => tracing::warn!("post-import filesystem diagnostic:\n{}", output),
            Err(e) => tracing::warn!("post-import diagnostic failed: {}", e),
        }

        // After wsl --import, the default user is reset to root.
        // Restore from snapshot metadata (deterministic), or fall back to
        // heuristic detection for legacy snapshots without stored user.
        let user_to_restore = match &snapshot.default_user {
            Some(user) => {
                tracing::warn!("restoring default user from snapshot metadata: {}", user);
                Some(user.clone())
            }
            None => {
                tracing::warn!("no default_user in snapshot, falling back to detection");
                match self.wsl_manager.get_default_user(&target_name).await {
                    Ok(user) => {
                        tracing::warn!("fallback user detection result: {:?}", user);
                        user
                    }
                    Err(e) => {
                        tracing::warn!("fallback user detection failed: {}", e);
                        None
                    }
                }
            }
        };

        if let Some(ref user) = user_to_restore {
            match self.wsl_manager.set_default_user(&target_name, user).await {
                Ok(()) => tracing::warn!("default user set in wsl.conf: {}", user),
                Err(e) => tracing::warn!("failed to set default user in wsl.conf: {}", e),
            }
        } else {
            tracing::warn!("no default user to restore, distro will use root");
        }

        // Full VM shutdown to ensure WSL mounts the fresh VHDX, not a cached one.
        // terminate_distro alone is insufficient — the lightweight VM may still
        // serve the old filesystem from memory.
        let _ = self.wsl_manager.shutdown_all().await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;

        // Auto-start in overwrite mode since the original distro was running
        if matches!(cmd.mode, RestoreMode::Overwrite)
            && let Err(e) = self.wsl_manager.start_distro(&target_name).await
        {
            tracing::warn!("failed to auto-start distro after restore: {}", e);
        }

        // Final verification: list /home/ after a fresh boot to confirm the
        // restored filesystem matches the snapshot (not stale cached data).
        match self
            .wsl_manager
            .exec_in_distro(
                &target_name,
                "echo '---FINAL-HOME-VERIFY---' && ls -la /home/ 2>/dev/null",
            )
            .await
        {
            Ok(output) => tracing::warn!("FINAL /home/ verification after restore:\n{}", output),
            Err(e) => tracing::warn!("final /home/ verification failed: {}", e),
        }

        // Clean up safety backup on success
        if let Some(ref backup_path) = safety_backup_path {
            tracing::info!(
                "cleaning up safety backup after successful restore: {}",
                backup_path
            );
            let _ = std::fs::remove_file(backup_path)
                .or_else(|_| std::fs::remove_file(windows_to_linux_path(backup_path)));
        }

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
            default_user: None,
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
        wsl_mock
            .expect_export_distro()
            .returning(|_, _, _| Err(DomainError::WslCliError("backup skipped".into())));
        wsl_mock.expect_terminate_distro().returning(|_| Ok(()));
        wsl_mock.expect_shutdown_all().returning(|| Ok(()));
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
