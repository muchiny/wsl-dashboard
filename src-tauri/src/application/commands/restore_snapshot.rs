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

    #[tracing::instrument(
        skip(self, cmd),
        fields(
            snapshot_id = %cmd.snapshot_id,
            mode = ?cmd.mode,
            install_location = %cmd.install_location,
        )
    )]
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

        // Canary test: write a unique file BEFORE the restore that should NOT
        // survive the import. If it's still present after, the filesystem wasn't replaced.
        let canary_id = uuid::Uuid::new_v4().to_string();
        let canary_path = format!("/var/tmp/.restore-canary-{}", canary_id);
        if matches!(cmd.mode, RestoreMode::Overwrite) {
            match self
                .wsl_manager
                .exec_in_distro(
                    &snapshot.distro_name,
                    &format!("echo '{}' > {}", canary_id, canary_path),
                )
                .await
            {
                Ok(_) => tracing::info!("canary written to {}", canary_path),
                Err(e) => tracing::warn!("canary write failed: {}", e),
            }
        }

        // For overwrite mode: terminate, shutdown, create safety backup, then unregister.
        let safety_backup_path: Option<String> = if matches!(cmd.mode, RestoreMode::Overwrite) {
            // Best-effort terminate; ignore error if already stopped
            let _ = self.wsl_manager.terminate_distro(&target_name).await;

            // Shut down the entire WSL VM to release VHDX locks.
            // wsl --terminate alone is insufficient: the lightweight utility VM
            // may still hold file handles on the VHDX.
            let _ = self.wsl_manager.shutdown_all().await;
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;

            // Safety backup: copy the ext4.vhdx file directly instead of using
            // wsl --export. Using wsl --export (TAR format) boots the WSL VM to
            // read the ext4 filesystem, which leaves wslservice.exe holding file
            // handles on the VHDX. Even with shutdown_all afterwards, those handles
            // can persist and cause remove_dir_all to silently fail, making the
            // subsequent wsl --import reuse the stale VHDX.
            // A direct file copy never boots the VM and never locks the VHDX.
            let vhdx_path = std::path::Path::new(&cmd.install_location).join("ext4.vhdx");
            let backup_path = std::path::Path::new(&cmd.install_location)
                .parent()
                .unwrap_or(std::path::Path::new(&cmd.install_location))
                .join(format!("{}_pre_restore_backup.vhdx", target_name));
            let backup_str = backup_path.to_string_lossy().to_string();

            if vhdx_path.exists() {
                tracing::info!(
                    "creating safety backup (VHDX copy): src={} dst={}",
                    vhdx_path.display(),
                    backup_str
                );
                match std::fs::copy(&vhdx_path, &backup_path) {
                    Ok(bytes) => {
                        tracing::info!("safety backup created: {} bytes", bytes);
                        Some(backup_str)
                    }
                    Err(e) => {
                        tracing::warn!("safety backup copy failed, proceeding without: {}", e);
                        None
                    }
                }
            } else {
                tracing::warn!(
                    "ext4.vhdx not found at {}, skipping backup",
                    vhdx_path.display()
                );
                None
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
            // Safety backup is always a raw VHDX copy, so import with --vhd
            if let Err(restore_err) = self
                .wsl_manager
                .import_distro(
                    &target_name,
                    &cmd.install_location,
                    backup_path,
                    crate::domain::entities::snapshot::ExportFormat::Vhd,
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

        // Verify the import actually registered the distro AND it's WSL 2.
        // If wsl --import defaulted to WSL 1 (no --version 2 flag, or system
        // default is 1), the filesystem model is completely different and
        // snapshot restore cannot work.
        let imported_distro = self
            .wsl_manager
            .get_distro(&target_name)
            .await
            .map_err(|_| {
                DomainError::SnapshotError(format!(
                    "Import claimed success but '{}' was not found afterwards",
                    target_name
                ))
            })?;
        if matches!(
            imported_distro.wsl_version,
            crate::domain::value_objects::WslVersion::V1
        ) {
            return Err(DomainError::SnapshotError(
                "Import created a WSL 1 distro instead of WSL 2. \
                 Snapshot restore cannot work in WSL 1 mode. \
                 Run: wsl --set-default-version 2"
                    .into(),
            ));
        }
        tracing::warn!(
            "import verified: distro '{}' exists (WSL{})",
            target_name,
            imported_distro.wsl_version
        );

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

        // Verify snapshot marker to prove the imported filesystem is from the
        // snapshot tar/vhdx. Marker lives in /var/tmp/ (persists across reboots).
        // In overwrite mode, a missing marker is a fatal error — it means the
        // imported filesystem contains stale data, not the snapshot.
        match self
            .wsl_manager
            .exec_in_distro(&target_name, "cat /var/tmp/.snapshot-marker 2>/dev/null")
            .await
        {
            Ok(marker) if !marker.trim().is_empty() => {
                tracing::info!("snapshot marker verified: {}", marker.trim());
            }
            _ if matches!(cmd.mode, RestoreMode::Overwrite) => {
                return Err(DomainError::SnapshotError(
                    "Restore verification failed: snapshot marker not found in \
                     imported filesystem. The restore may have used stale data."
                        .into(),
                ));
            }
            _ => {
                tracing::warn!("snapshot marker not found (clone mode, non-fatal)");
            }
        }

        // Canary check: the canary file was written BEFORE the restore.
        // If it survived, it means the filesystem was NOT replaced.
        if matches!(cmd.mode, RestoreMode::Overwrite) {
            match self
                .wsl_manager
                .exec_in_distro(&target_name, &format!("cat {} 2>/dev/null", canary_path))
                .await
            {
                Ok(content) if !content.trim().is_empty() => {
                    tracing::error!(
                        "CANARY SURVIVED RESTORE! File {} still contains '{}'. \
                         The filesystem was NOT replaced by the snapshot.",
                        canary_path,
                        content.trim()
                    );
                    return Err(DomainError::SnapshotError(
                        "Restore verification failed: canary file written before restore \
                         survived the import. The filesystem was not replaced. \
                         This is a WSL bug — try: wsl --shutdown, then retry."
                            .into(),
                    ));
                }
                _ => {
                    tracing::warn!(
                        "CANARY GONE (good): {} not found after import — filesystem was replaced",
                        canary_path
                    );
                }
            }
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
            .expect_exec_in_distro()
            .returning(|_, _| Ok(String::new()));
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
