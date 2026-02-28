use tauri::State;
use tracing::instrument;

use crate::domain::entities::port_forward::{ListeningPort, PortForwardRule};
use crate::domain::errors::DomainError;
use crate::presentation::state::AppState;

#[tauri::command]
#[instrument(skip(state), fields(cmd = "list_listening_ports", distro = %distro_name))]
pub async fn list_listening_ports(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<ListeningPort>, DomainError> {
    state
        .port_forwarding
        .list_listening_ports(&distro_name)
        .await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_port_forwarding_rules"))]
pub async fn get_port_forwarding_rules(
    distro_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<PortForwardRule>, DomainError> {
    state.port_rules_repo.list_rules(distro_name).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "add_port_forwarding", distro = %distro_name, wsl = %wsl_port, host = %host_port))]
pub async fn add_port_forwarding(
    distro_name: String,
    wsl_port: u16,
    host_port: u16,
    state: State<'_, AppState>,
) -> Result<PortForwardRule, DomainError> {
    // Get WSL IP for the distro
    let wsl_ip = state.port_forwarding.get_wsl_ip(&distro_name).await?;

    // Apply the netsh rule
    state
        .port_forwarding
        .apply_rule(host_port, &wsl_ip, wsl_port)
        .await?;

    // Persist in database
    let rule = PortForwardRule {
        id: uuid::Uuid::new_v4().to_string(),
        distro_name: distro_name.clone(),
        wsl_port,
        host_port,
        protocol: "tcp".to_string(),
        enabled: true,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    state.port_rules_repo.save_rule(&rule).await?;

    state
        .audit_logger
        .log(
            "port_forward.add",
            &format!("{distro_name}:{wsl_port} -> localhost:{host_port}"),
        )
        .await?;

    Ok(rule)
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "remove_port_forwarding", rule = %rule_id))]
pub async fn remove_port_forwarding(
    rule_id: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    // Look up the rule to get the host port
    let rule = state
        .port_rules_repo
        .get_rule(&rule_id)
        .await?
        .ok_or_else(|| DomainError::Internal("Port forwarding rule not found".to_string()))?;

    // Remove the netsh rule
    state.port_forwarding.remove_rule(rule.host_port).await?;

    // Remove from database
    state.port_rules_repo.delete_rule(&rule_id).await?;

    state
        .audit_logger
        .log(
            "port_forward.remove",
            &format!(
                "{}:{} -> localhost:{}",
                rule.distro_name, rule.wsl_port, rule.host_port
            ),
        )
        .await?;

    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_wsl_ip", distro = %distro_name))]
pub async fn get_wsl_ip(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    state.port_forwarding.get_wsl_ip(&distro_name).await
}
