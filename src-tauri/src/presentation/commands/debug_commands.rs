use std::sync::Arc;

use tauri::State;
use tracing::instrument;

use crate::domain::entities::snapshot::ExportFormat;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::infrastructure::debug_log::buffer::{DebugLogBuffer, LogEntry};
use crate::presentation::state::AppState;

#[tauri::command]
#[instrument(skip(buffer), fields(cmd = "get_debug_logs"))]
pub async fn get_debug_logs(
    buffer: State<'_, Arc<DebugLogBuffer>>,
) -> Result<Vec<LogEntry>, String> {
    Ok(buffer.get_all())
}

#[tauri::command]
#[instrument(skip(buffer), fields(cmd = "clear_debug_logs"))]
pub async fn clear_debug_logs(buffer: State<'_, Arc<DebugLogBuffer>>) -> Result<(), String> {
    buffer.clear();
    Ok(())
}

/// Automated restore test: clones a distro, creates a snapshot, dirties the
/// clone, restores from snapshot, and verifies the dirty data is gone.
/// Returns a human-readable report string.
///
/// This is safe — it operates on a temporary clone, never on real distros.
#[tauri::command]
#[instrument(skip(state), fields(cmd = "debug_test_restore"))]
pub async fn debug_test_restore(
    source_distro: String,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    let wsl = &state.wsl_manager;
    let source = DistroName::new(&source_distro)?;
    let mut report = String::from("=== WSL Nexus Restore Test ===\n\n");

    // Verify source exists
    wsl.get_distro(&source).await.map_err(|_| {
        DomainError::Internal(format!("Source distro '{}' not found", source_distro))
    })?;
    report.push_str(&format!("Source distro: {} ✓\n", source_distro));

    // Generate unique clone name
    let uuid_short = &uuid::Uuid::new_v4().to_string()[..8];
    let clone_name_str = format!("_nexus_test_{}", uuid_short);
    let clone_name = DistroName::new(&clone_name_str)?;

    // Temp directory for test files
    let temp_dir = std::env::temp_dir().join(format!("nexus-restore-test-{}", uuid_short));
    std::fs::create_dir_all(&temp_dir).map_err(|e| {
        DomainError::Internal(format!("Cannot create temp dir: {}", e))
    })?;
    let clone_dir = temp_dir.join("clone");
    std::fs::create_dir_all(&clone_dir).map_err(|e| {
        DomainError::Internal(format!("Cannot create clone dir: {}", e))
    })?;

    // Cleanup helper — best-effort, runs on all exit paths
    let cleanup = |wsl: &Arc<dyn crate::domain::ports::wsl_manager::WslManagerPort>,
                   name: &DistroName,
                   dir: &std::path::Path| {
        let wsl = wsl.clone();
        let name = name.clone();
        let dir = dir.to_path_buf();
        async move {
            let _ = wsl.terminate_distro(&name).await;
            let _ = wsl.shutdown_all().await;
            let _ = wsl.unregister_distro(&name).await;
            let _ = std::fs::remove_dir_all(&dir);
        }
    };

    // ── Step 1: Export source ──────────────────────────────────────
    report.push_str("\n[1/7] Exporting source distro...\n");
    let source_tar = temp_dir.join("source.tar");
    let source_tar_str = source_tar.to_string_lossy().to_string();
    let _ = wsl.terminate_distro(&source).await;
    let _ = wsl.shutdown_all().await;
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    if let Err(e) = wsl
        .export_distro(&source, &source_tar_str, ExportFormat::Tar)
        .await
    {
        cleanup(wsl, &clone_name, &temp_dir).await;
        // Restart source distro since we terminated it
        let _ = wsl.start_distro(&source).await;
        return Err(DomainError::Internal(format!("Export source failed: {}", e)));
    }
    // Restart source distro
    let _ = wsl.start_distro(&source).await;

    let source_size = std::fs::metadata(&source_tar)
        .map(|m| m.len())
        .unwrap_or(0);
    report.push_str(&format!(
        "  Exported {} MB\n",
        source_size / 1024 / 1024
    ));

    // ── Step 2: Create clone ───────────────────────────────────────
    report.push_str("[2/7] Creating test clone...\n");
    let clone_dir_str = clone_dir.to_string_lossy().to_string();
    if let Err(e) = wsl
        .import_distro(&clone_name, &clone_dir_str, &source_tar_str, ExportFormat::Tar)
        .await
    {
        cleanup(wsl, &clone_name, &temp_dir).await;
        return Err(DomainError::Internal(format!("Import clone failed: {}", e)));
    }
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // Check WSL version of clone
    match wsl.get_distro(&clone_name).await {
        Ok(d) => report.push_str(&format!("  Clone '{}' created (WSL{})\n", clone_name, d.wsl_version)),
        Err(e) => {
            cleanup(wsl, &clone_name, &temp_dir).await;
            return Err(DomainError::Internal(format!("Clone not found: {}", e)));
        }
    }

    // ── Step 3: Take snapshot of clean clone ───────────────────────
    report.push_str("[3/7] Creating snapshot of clean clone...\n");
    // Write marker
    let _ = wsl
        .exec_in_distro(
            &clone_name,
            "echo 'RESTORE-TEST-MARKER' > /var/tmp/.snapshot-marker",
        )
        .await;
    let _ = wsl.terminate_distro(&clone_name).await;
    let _ = wsl.shutdown_all().await;
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let snapshot_tar = temp_dir.join("snapshot.tar");
    let snapshot_tar_str = snapshot_tar.to_string_lossy().to_string();
    if let Err(e) = wsl
        .export_distro(&clone_name, &snapshot_tar_str, ExportFormat::Tar)
        .await
    {
        cleanup(wsl, &clone_name, &temp_dir).await;
        return Err(DomainError::Internal(format!(
            "Snapshot export failed: {}",
            e
        )));
    }
    report.push_str("  Snapshot created ✓\n");

    // ── Step 4: Dirty the clone ────────────────────────────────────
    report.push_str("[4/7] Creating test folder (should disappear after restore)...\n");
    let _ = wsl
        .exec_in_distro(
            &clone_name,
            "mkdir -p /home/THIS_SHOULD_BE_GONE && echo 'dirty' > /home/THIS_SHOULD_BE_GONE/marker.txt",
        )
        .await;
    let dirty_check = wsl
        .exec_in_distro(
            &clone_name,
            "test -d /home/THIS_SHOULD_BE_GONE && echo EXISTS || echo MISSING",
        )
        .await
        .unwrap_or_default();
    if !dirty_check.contains("EXISTS") {
        cleanup(wsl, &clone_name, &temp_dir).await;
        return Err(DomainError::Internal("Could not create test folder".into()));
    }
    report.push_str("  Test folder created ✓\n");

    // ── Step 5: Restore from snapshot ──────────────────────────────
    report.push_str("[5/7] Restoring from snapshot (overwrite mode)...\n");

    // terminate + shutdown
    let _ = wsl.terminate_distro(&clone_name).await;
    let _ = wsl.shutdown_all().await;
    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    // unregister
    if let Err(e) = wsl.unregister_distro(&clone_name).await {
        cleanup(wsl, &clone_name, &temp_dir).await;
        return Err(DomainError::Internal(format!("Unregister failed: {}", e)));
    }

    // nuke install dir
    if clone_dir.exists() {
        if let Err(_) = std::fs::remove_dir_all(&clone_dir) {
            let _ = wsl.shutdown_all().await;
            tokio::time::sleep(std::time::Duration::from_secs(3)).await;
            if let Err(e) = std::fs::remove_dir_all(&clone_dir) {
                let _ = std::fs::remove_dir_all(&temp_dir);
                return Err(DomainError::Internal(format!(
                    "Cannot delete clone dir: {}",
                    e
                )));
            }
        }
    }
    std::fs::create_dir_all(&clone_dir).map_err(|e| {
        DomainError::Internal(format!("Cannot recreate clone dir: {}", e))
    })?;

    // final shutdown before import
    let _ = wsl.shutdown_all().await;
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;

    // import from snapshot
    if let Err(e) = wsl
        .import_distro(&clone_name, &clone_dir_str, &snapshot_tar_str, ExportFormat::Tar)
        .await
    {
        let _ = std::fs::remove_dir_all(&temp_dir);
        return Err(DomainError::Internal(format!("Import failed: {}", e)));
    }

    // shutdown after import (force clean VHDX mount)
    let _ = wsl.shutdown_all().await;
    tokio::time::sleep(std::time::Duration::from_secs(2)).await;
    report.push_str("  Restore completed ✓\n");

    // ── Step 6: Verify ─────────────────────────────────────────────
    report.push_str("[6/7] Verifying restore...\n");

    // Check WSL version
    match wsl.get_distro(&clone_name).await {
        Ok(d) => report.push_str(&format!("  WSL version: {} ", d.wsl_version)),
        Err(_) => report.push_str("  WSL version: UNKNOWN "),
    }

    // Check if test folder is gone
    let folder_check = wsl
        .exec_in_distro(
            &clone_name,
            "test -d /home/THIS_SHOULD_BE_GONE && echo EXISTS || echo GONE",
        )
        .await
        .unwrap_or_else(|_| "ERROR".into());
    let folder_gone = folder_check.contains("GONE");

    // Check snapshot marker
    let marker_check = wsl
        .exec_in_distro(
            &clone_name,
            "cat /var/tmp/.snapshot-marker 2>/dev/null",
        )
        .await
        .unwrap_or_default();
    let marker_found = marker_check.contains("RESTORE-TEST-MARKER");

    // Check filesystem type
    let fs_type = wsl
        .exec_in_distro(&clone_name, "df -T / 2>/dev/null | tail -1")
        .await
        .unwrap_or_else(|_| "unknown".into());

    report.push_str(&format!("| FS: {}\n", fs_type.trim()));

    if folder_gone {
        report.push_str("  ✓ PASS: Test folder is GONE (restore worked!)\n");
    } else {
        report.push_str("  ✗ FAIL: Test folder STILL EXISTS (restore broken!)\n");
    }
    if marker_found {
        report.push_str("  ✓ Snapshot marker found (filesystem is from snapshot)\n");
    } else {
        report.push_str("  ✗ Snapshot marker NOT found\n");
    }

    // ── Step 7: Cleanup ────────────────────────────────────────────
    report.push_str("[7/7] Cleaning up...\n");
    cleanup(wsl, &clone_name, &temp_dir).await;
    report.push_str("  Cleaned up ✓\n");

    // ── Summary ────────────────────────────────────────────────────
    report.push_str("\n=== RESULT: ");
    if folder_gone && marker_found {
        report.push_str("PASS ===\n");
        report.push_str("Snapshot restore is working correctly.\n");
    } else if !folder_gone {
        report.push_str("FAIL ===\n");
        report.push_str("Test folder persisted after restore — the snapshot was NOT applied.\n");
    } else {
        report.push_str("PARTIAL ===\n");
        report.push_str("Folder gone but marker missing — investigate further.\n");
    }

    Ok(report)
}
