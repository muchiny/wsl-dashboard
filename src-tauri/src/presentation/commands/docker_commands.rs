use serde::{Deserialize, Serialize};
use tauri::State;

use crate::domain::entities::docker::{Container, DockerImage};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct DockerStatusResponse {
    pub available: bool,
    pub containers: Vec<Container>,
    pub images: Vec<DockerImage>,
}

#[tauri::command]
pub async fn get_docker_status(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<DockerStatusResponse, DomainError> {
    let name = DistroName::new(&distro_name)?;

    let available = state.docker.is_available(&name).await?;
    if !available {
        return Ok(DockerStatusResponse {
            available: false,
            containers: Vec::new(),
            images: Vec::new(),
        });
    }

    let (containers, images) = tokio::try_join!(
        state.docker.list_containers(&name, true),
        state.docker.list_images(&name),
    )?;

    Ok(DockerStatusResponse {
        available: true,
        containers,
        images,
    })
}

#[tauri::command]
pub async fn docker_start_container(
    distro_name: String,
    container_id: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.docker.start_container(&name, &container_id).await
}

#[tauri::command]
pub async fn docker_stop_container(
    distro_name: String,
    container_id: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.docker.stop_container(&name, &container_id).await
}
