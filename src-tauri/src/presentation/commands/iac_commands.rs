use tauri::State;

use crate::domain::entities::iac::{IacToolset, KubernetesCluster};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

#[tauri::command]
pub async fn detect_iac_tools(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<IacToolset, DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.iac.detect_tools(&name).await
}

#[tauri::command]
pub async fn get_k8s_info(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<KubernetesCluster, DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.iac.get_k8s_cluster_info(&name).await
}

#[tauri::command]
pub async fn run_playbook(
    distro_name: String,
    playbook_path: String,
    extra_vars: Option<String>,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    let name = DistroName::new(&distro_name)?;
    let output = state
        .iac
        .run_ansible_playbook(&name, &playbook_path, extra_vars)
        .await?;
    state
        .audit_logger
        .log_with_details("iac.run_playbook", &playbook_path, &distro_name)
        .await?;
    Ok(output)
}
