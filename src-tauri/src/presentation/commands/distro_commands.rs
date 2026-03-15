use tauri::State;
use tracing::instrument;

use crate::application::commands::delete_distro::{DeleteDistroCommand, DeleteDistroHandler};
use crate::application::dto::responses::DistroResponse;
use crate::application::queries::list_distros::ListDistrosHandler;
use crate::domain::errors::DomainError;
use crate::domain::services::distro_service::DistroService;
use crate::domain::value_objects::DistroName;
use crate::infrastructure::terminal::adapter::TerminalSessionManager;
use crate::presentation::state::AppState;

#[tauri::command]
#[instrument(skip(state), fields(cmd = "list_distros"))]
pub async fn list_distros(state: State<'_, AppState>) -> Result<Vec<DistroResponse>, DomainError> {
    let handler = ListDistrosHandler::new(state.wsl_manager.clone());
    handler.handle().await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "start_distro", distro = %name))]
pub async fn start_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.start(&distro_name).await?;
    state.audit_logger.log("distro.start", &name).await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "stop_distro", distro = %name))]
pub async fn stop_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.stop(&distro_name).await?;
    state.audit_logger.log("distro.stop", &name).await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "restart_distro", distro = %name))]
pub async fn restart_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.restart(&distro_name).await?;
    state.audit_logger.log("distro.restart", &name).await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "shutdown_all"))]
pub async fn shutdown_all(state: State<'_, AppState>) -> Result<(), DomainError> {
    state.wsl_manager.shutdown_all().await?;
    state.audit_logger.log("wsl.shutdown_all", "all").await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_distro_install_path", distro = %name))]
pub async fn get_distro_install_path(
    name: String,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    let distro_name = DistroName::new(&name)?;
    state
        .wsl_manager
        .get_distro_install_path(&distro_name)
        .await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "set_default_distro", distro = %name))]
pub async fn set_default_distro(
    name: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    state.wsl_manager.set_default_distro(&distro_name).await?;
    state.audit_logger.log("distro.set_default", &name).await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "resize_vhd", distro = %name, size = %size))]
pub async fn resize_vhd(
    name: String,
    size: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    state.wsl_manager.resize_vhd(&distro_name, &size).await?;
    state
        .audit_logger
        .log_with_details("vhdx.resize", &name, &format!("Resized to {size}"))
        .await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state, terminal_mgr), fields(cmd = "delete_distro", distro = %name))]
pub async fn delete_distro(
    name: String,
    delete_snapshots: bool,
    state: State<'_, AppState>,
    terminal_mgr: State<'_, TerminalSessionManager>,
) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;

    // Close all terminal sessions for this distro before deletion
    let closed = terminal_mgr.close_sessions_by_distro(&name).await;
    if !closed.is_empty() {
        tracing::info!(
            "closed {} terminal session(s) for '{}' before delete",
            closed.len(),
            name
        );
    }

    let handler = DeleteDistroHandler::new(
        state.wsl_manager.clone(),
        state.snapshot_repo.clone(),
        state.metrics_repo.clone(),
        state.alerting.clone(),
        state.port_rules_repo.clone(),
        state.audit_logger.clone(),
    );
    handler
        .handle(DeleteDistroCommand {
            distro_name,
            delete_snapshots,
        })
        .await
}
