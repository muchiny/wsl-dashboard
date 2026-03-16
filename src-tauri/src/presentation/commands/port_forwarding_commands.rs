use tauri::State;
use tracing::instrument;

use crate::domain::entities::port_forward::{ListeningPort, PortForwardRule};
use crate::domain::errors::DomainError;
use crate::presentation::state::AppState;

/// Inner logic for list_listening_ports, testable without Tauri runtime.
pub(crate) async fn list_listening_ports_inner(
    distro_name: &str,
    state: &AppState,
) -> Result<Vec<ListeningPort>, DomainError> {
    state
        .port_forwarding
        .list_listening_ports(distro_name)
        .await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "list_listening_ports", distro = %distro_name))]
pub async fn list_listening_ports(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<Vec<ListeningPort>, DomainError> {
    list_listening_ports_inner(&distro_name, &state).await
}

/// Inner logic for get_port_forwarding_rules, testable without Tauri runtime.
pub(crate) async fn get_port_forwarding_rules_inner(
    distro_name: Option<String>,
    state: &AppState,
) -> Result<Vec<PortForwardRule>, DomainError> {
    state.port_rules_repo.list_rules(distro_name).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_port_forwarding_rules"))]
pub async fn get_port_forwarding_rules(
    distro_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<PortForwardRule>, DomainError> {
    get_port_forwarding_rules_inner(distro_name, &state).await
}

/// Inner logic for add_port_forwarding, testable without Tauri runtime.
pub(crate) async fn add_port_forwarding_inner(
    distro_name: String,
    wsl_port: u16,
    host_port: u16,
    state: &AppState,
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
        .audit(
            "port_forward.add",
            &format!("{distro_name}:{wsl_port} -> localhost:{host_port}"),
        )
        .await?;

    Ok(rule)
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "add_port_forwarding", distro = %distro_name, wsl = %wsl_port, host = %host_port))]
pub async fn add_port_forwarding(
    distro_name: String,
    wsl_port: u16,
    host_port: u16,
    state: State<'_, AppState>,
) -> Result<PortForwardRule, DomainError> {
    add_port_forwarding_inner(distro_name, wsl_port, host_port, &state).await
}

/// Inner logic for remove_port_forwarding, testable without Tauri runtime.
pub(crate) async fn remove_port_forwarding_inner(
    rule_id: String,
    state: &AppState,
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
        .audit(
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
#[instrument(skip(state), fields(cmd = "remove_port_forwarding", rule = %rule_id))]
pub async fn remove_port_forwarding(
    rule_id: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    remove_port_forwarding_inner(rule_id, &state).await
}

/// Inner logic for get_wsl_ip, testable without Tauri runtime.
pub(crate) async fn get_wsl_ip_inner(
    distro_name: &str,
    state: &AppState,
) -> Result<String, DomainError> {
    state.port_forwarding.get_wsl_ip(distro_name).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_wsl_ip", distro = %distro_name))]
pub async fn get_wsl_ip(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    get_wsl_ip_inner(&distro_name, &state).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    use crate::domain::ports::alerting::MockAlertingPort;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::metrics_repository::MockMetricsRepositoryPort;
    use crate::domain::ports::monitoring_provider::MockMonitoringProviderPort;
    use crate::domain::ports::port_forwarding::{
        MockPortForwardRulesRepository, MockPortForwardingPort,
    };
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;

    fn make_test_state(
        pf: MockPortForwardingPort,
        rules: MockPortForwardRulesRepository,
        audit: MockAuditLoggerPort,
    ) -> AppState {
        AppState {
            wsl_manager: Arc::new(MockWslManagerPort::new()),
            snapshot_repo: Arc::new(MockSnapshotRepositoryPort::new()),
            monitoring: Arc::new(MockMonitoringProviderPort::new()),
            metrics_repo: Arc::new(MockMetricsRepositoryPort::new()),
            alerting: Arc::new(MockAlertingPort::new()),
            audit_logger: Arc::new(audit),
            alert_thresholds: Arc::new(tokio::sync::RwLock::new(vec![])),
            port_forwarding: Arc::new(pf),
            port_rules_repo: Arc::new(rules),
        }
    }

    #[tokio::test]
    async fn list_listening_ports_delegates_to_port() {
        let mut pf = MockPortForwardingPort::new();
        pf.expect_list_listening_ports().returning(|_| Ok(vec![]));

        let rules = MockPortForwardRulesRepository::new();
        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(pf, rules, audit);

        let result = list_listening_ports_inner("Ubuntu", &state).await.unwrap();
        assert!(result.is_empty());
    }

    #[tokio::test]
    async fn get_port_forwarding_rules_returns_rules() {
        let pf = MockPortForwardingPort::new();
        let mut rules = MockPortForwardRulesRepository::new();
        rules.expect_list_rules().returning(|_| {
            Ok(vec![PortForwardRule {
                id: "rule-1".into(),
                distro_name: "Ubuntu".into(),
                wsl_port: 3000,
                host_port: 3000,
                protocol: "tcp".into(),
                enabled: true,
                created_at: "2025-01-01T00:00:00Z".into(),
            }])
        });

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(pf, rules, audit);

        let result = get_port_forwarding_rules_inner(None, &state).await.unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].wsl_port, 3000);
    }

    #[tokio::test]
    async fn remove_port_forwarding_rule_not_found() {
        let pf = MockPortForwardingPort::new();

        let mut rules = MockPortForwardRulesRepository::new();
        rules.expect_get_rule().returning(|_| Ok(None));

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(pf, rules, audit);

        // When rule not found, should return error
        let result = remove_port_forwarding_inner("nonexistent".into(), &state).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn get_wsl_ip_delegates_to_port() {
        let mut pf = MockPortForwardingPort::new();
        pf.expect_get_wsl_ip()
            .returning(|_| Ok("172.17.0.2".into()));

        let rules = MockPortForwardRulesRepository::new();
        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(pf, rules, audit);

        let ip = get_wsl_ip_inner("Ubuntu", &state).await.unwrap();
        assert_eq!(ip, "172.17.0.2");
    }
}
