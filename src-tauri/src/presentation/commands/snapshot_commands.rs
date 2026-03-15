use serde::Deserialize;
use tauri::State;
use tracing::instrument;

use crate::application::commands::create_snapshot::{CreateSnapshotCommand, CreateSnapshotHandler};
use crate::application::commands::delete_snapshot::{DeleteSnapshotCommand, DeleteSnapshotHandler};
use crate::application::commands::restore_snapshot::{
    RestoreSnapshotCommand, RestoreSnapshotHandler,
};
use crate::application::dto::responses::SnapshotResponse;
use crate::application::queries::list_snapshots::ListSnapshotsHandler;
use crate::domain::entities::snapshot::{ExportFormat, RestoreMode};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::{DistroName, SnapshotId};
use crate::infrastructure::terminal::adapter::TerminalSessionManager;
use crate::presentation::state::AppState;

#[tauri::command]
#[instrument(skip(state), fields(cmd = "list_snapshots"))]
pub async fn list_snapshots(
    distro_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SnapshotResponse>, DomainError> {
    let name = match distro_name {
        Some(n) => Some(DistroName::new(&n)?),
        None => None,
    };
    let handler = ListSnapshotsHandler::new(state.snapshot_repo.clone());
    handler.handle(name).await
}

#[derive(Debug, Deserialize)]
pub struct CreateSnapshotArgs {
    pub distro_name: String,
    pub name: String,
    pub description: Option<String>,
    pub format: Option<String>,
    pub output_dir: String,
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "create_snapshot", distro = %args.distro_name))]
pub async fn create_snapshot(
    args: CreateSnapshotArgs,
    state: State<'_, AppState>,
) -> Result<SnapshotResponse, DomainError> {
    let format = match args.format.as_deref() {
        Some("vhdx") => ExportFormat::Vhd,
        _ => ExportFormat::Tar,
    };

    tracing::info!(
        "create_snapshot command received: distro={} name={} format={:?} output_dir={} desc={:?}",
        args.distro_name,
        args.name,
        format,
        args.output_dir,
        args.description
    );

    let handler = CreateSnapshotHandler::new(
        state.wsl_manager.clone(),
        state.snapshot_repo.clone(),
        state.audit_logger.clone(),
    );

    let cmd = CreateSnapshotCommand {
        distro_name: DistroName::new(&args.distro_name)?,
        name: args.name,
        description: args.description,
        format,
        output_dir: args.output_dir,
    };

    match handler.handle(cmd).await {
        Ok(snapshot) => {
            tracing::info!(
                "create_snapshot command completed: id={} size={} path={}",
                snapshot.id,
                snapshot.file_size.bytes(),
                snapshot.file_path
            );
            Ok(SnapshotResponse::from(snapshot))
        }
        Err(e) => {
            tracing::error!("create_snapshot command FAILED: {}", e);
            Err(e)
        }
    }
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "delete_snapshot", snapshot = %snapshot_id))]
pub async fn delete_snapshot(
    snapshot_id: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let handler =
        DeleteSnapshotHandler::new(state.snapshot_repo.clone(), state.audit_logger.clone());

    handler
        .handle(DeleteSnapshotCommand {
            snapshot_id: SnapshotId::from_string(snapshot_id),
        })
        .await
}

#[derive(Debug, Deserialize)]
pub struct RestoreSnapshotArgs {
    pub snapshot_id: String,
    pub mode: String,
    pub new_name: Option<String>,
    pub install_location: Option<String>,
}

#[tauri::command]
#[instrument(skip(state, terminal_mgr), fields(cmd = "restore_snapshot", snapshot = %args.snapshot_id))]
pub async fn restore_snapshot(
    args: RestoreSnapshotArgs,
    state: State<'_, AppState>,
    terminal_mgr: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    let mode = if args.mode == "clone" {
        let new_name = args
            .new_name
            .ok_or_else(|| DomainError::Internal("Clone mode requires a new_name".into()))?;
        RestoreMode::Clone { new_name }
    } else {
        RestoreMode::Overwrite
    };

    // Resolve the snapshot to get distro_name for terminal cleanup
    let snapshot = state
        .snapshot_repo
        .get_by_id(&SnapshotId::from_string(args.snapshot_id.clone()))
        .await?;
    let distro_name = snapshot.distro_name.to_string();

    // For overwrite mode without an explicit path, auto-detect from registry
    let install_location = match (&mode, args.install_location) {
        (_, Some(loc)) if !loc.is_empty() => loc,
        (RestoreMode::Overwrite, _) => {
            state
                .wsl_manager
                .get_distro_install_path(&snapshot.distro_name)
                .await?
        }
        _ => {
            return Err(DomainError::Internal(
                "Clone mode requires an install_location".into(),
            ));
        }
    };

    // Close all terminal sessions for this distro before restore —
    // the old PTY sessions would be stale after unregister + import.
    let closed = terminal_mgr.close_sessions_by_distro(&distro_name).await;
    if !closed.is_empty() {
        tracing::info!(
            "closed {} terminal session(s) for '{}' before restore",
            closed.len(),
            distro_name
        );
    }

    let handler = RestoreSnapshotHandler::new(
        state.wsl_manager.clone(),
        state.snapshot_repo.clone(),
        state.audit_logger.clone(),
    );

    handler
        .handle(RestoreSnapshotCommand {
            snapshot_id: SnapshotId::from_string(args.snapshot_id),
            mode,
            install_location,
        })
        .await
}
