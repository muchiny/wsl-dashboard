use serde::Deserialize;
use tauri::State;

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
use crate::presentation::state::AppState;

#[tauri::command]
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
pub async fn create_snapshot(
    args: CreateSnapshotArgs,
    state: State<'_, AppState>,
) -> Result<SnapshotResponse, DomainError> {
    let format = match args.format.as_deref() {
        Some("tar.gz") => ExportFormat::TarGz,
        Some("tar.xz") => ExportFormat::TarXz,
        Some("vhdx") => ExportFormat::Vhd,
        _ => ExportFormat::Tar,
    };

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

    let snapshot = handler.handle(cmd).await?;
    Ok(SnapshotResponse::from(snapshot))
}

#[tauri::command]
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
    pub install_location: String,
}

#[tauri::command]
pub async fn restore_snapshot(
    args: RestoreSnapshotArgs,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let mode = if args.mode == "clone" {
        let new_name = args
            .new_name
            .ok_or_else(|| DomainError::Internal("Clone mode requires a new_name".into()))?;
        RestoreMode::Clone { new_name }
    } else {
        RestoreMode::Overwrite
    };

    let handler = RestoreSnapshotHandler::new(
        state.wsl_manager.clone(),
        state.snapshot_repo.clone(),
        state.audit_logger.clone(),
    );

    handler
        .handle(RestoreSnapshotCommand {
            snapshot_id: SnapshotId::from_string(args.snapshot_id),
            mode,
            install_location: args.install_location,
        })
        .await
}
