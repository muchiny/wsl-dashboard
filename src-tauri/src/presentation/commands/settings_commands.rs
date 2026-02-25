use tauri::State;

use crate::domain::entities::wsl_config::WslGlobalConfig;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

#[tauri::command]
pub async fn get_wsl_config(
    state: State<'_, AppState>,
) -> Result<WslGlobalConfig, DomainError> {
    state.wsl_manager.get_global_config().await
}

#[tauri::command]
pub async fn update_wsl_config(
    config: WslGlobalConfig,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    state.wsl_manager.update_global_config(config).await?;
    state
        .audit_logger
        .log("config.update", ".wslconfig")
        .await?;
    Ok(())
}

#[tauri::command]
pub async fn compact_vhdx(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let name = DistroName::new(&distro_name)?;
    // First terminate the distro (must be stopped to set sparse)
    let _ = state.wsl_manager.terminate_distro(&name).await;
    state.wsl_manager.set_sparse(&name, true).await?;
    state
        .audit_logger
        .log_with_details("vhdx.compact", &distro_name, "Set sparse mode enabled")
        .await?;
    Ok(())
}
