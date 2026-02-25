use tauri::State;

use crate::domain::entities::monitoring::{ProcessInfo, SystemMetrics};
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

#[tauri::command]
pub async fn get_system_metrics(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<SystemMetrics, DomainError> {
    let name = DistroName::new(&distro_name)?;

    let (cpu, memory, disk, network) = tokio::try_join!(
        state.monitoring.get_cpu_usage(&name),
        state.monitoring.get_memory_usage(&name),
        state.monitoring.get_disk_usage(&name),
        state.monitoring.get_network_stats(&name),
    )?;

    Ok(SystemMetrics {
        distro_name,
        timestamp: chrono::Utc::now(),
        cpu,
        memory,
        disk,
        network,
    })
}

#[tauri::command]
pub async fn get_processes(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<ProcessInfo>, DomainError> {
    let name = DistroName::new(&distro_name)?;
    state.monitoring.get_processes(&name).await
}
