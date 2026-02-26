use tauri::State;

use crate::application::dto::responses::{DistroDetailResponse, DistroResponse};
use crate::application::queries::get_distro_details::GetDistroDetailsHandler;
use crate::application::queries::list_distros::ListDistrosHandler;
use crate::domain::errors::DomainError;
use crate::domain::services::distro_service::DistroService;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

#[tauri::command]
pub async fn list_distros(state: State<'_, AppState>) -> Result<Vec<DistroResponse>, DomainError> {
    let handler = ListDistrosHandler::new(state.wsl_manager.clone());
    handler.handle().await
}

#[tauri::command]
pub async fn get_distro_details(
    name: String,
    state: State<'_, AppState>,
) -> Result<DistroDetailResponse, DomainError> {
    let distro_name = DistroName::new(&name)?;
    let handler = GetDistroDetailsHandler::new(state.wsl_manager.clone());
    handler.handle(distro_name).await
}

#[tauri::command]
pub async fn start_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.start(&distro_name).await?;
    state.audit_logger.log("distro.start", &name).await?;
    Ok(())
}

#[tauri::command]
pub async fn stop_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.stop(&distro_name).await?;
    state.audit_logger.log("distro.stop", &name).await?;
    Ok(())
}

#[tauri::command]
pub async fn restart_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.restart(&distro_name).await?;
    state.audit_logger.log("distro.restart", &name).await?;
    Ok(())
}

#[tauri::command]
pub async fn shutdown_all(state: State<'_, AppState>) -> Result<(), DomainError> {
    state.wsl_manager.shutdown_all().await?;
    state.audit_logger.log("wsl.shutdown_all", "all").await?;
    Ok(())
}

#[tauri::command]
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
