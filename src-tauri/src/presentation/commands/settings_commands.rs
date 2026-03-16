use tauri::State;
use tracing::instrument;

use crate::domain::entities::wsl_config::WslGlobalConfig;
use crate::domain::entities::wsl_version::WslVersionInfo;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;
use crate::presentation::state::AppState;

pub(crate) async fn get_wsl_config_inner(state: &AppState) -> Result<WslGlobalConfig, DomainError> {
    state.wsl_manager.get_global_config().await
}

pub(crate) async fn update_wsl_config_inner(
    config: WslGlobalConfig,
    state: &AppState,
) -> Result<(), DomainError> {
    state.wsl_manager.update_global_config(config).await?;
    state
        .audit_logger
        .log("config.update", ".wslconfig")
        .await?;
    Ok(())
}

pub(crate) async fn compact_vhdx_inner(
    distro_name: String,
    state: &AppState,
) -> Result<(), DomainError> {
    let name = DistroName::new(&distro_name)?;
    let _ = state.wsl_manager.terminate_distro(&name).await;
    state.wsl_manager.set_sparse(&name, true).await?;
    state
        .audit_logger
        .log_with_details("vhdx.compact", &distro_name, "Set sparse mode enabled")
        .await?;
    Ok(())
}

pub(crate) async fn get_wsl_version_inner(state: &AppState) -> Result<WslVersionInfo, DomainError> {
    state.wsl_manager.get_version_info().await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_wsl_config"))]
pub async fn get_wsl_config(state: State<'_, AppState>) -> Result<WslGlobalConfig, DomainError> {
    get_wsl_config_inner(&state).await
}

#[tauri::command]
#[instrument(skip(state, config), fields(cmd = "update_wsl_config"))]
pub async fn update_wsl_config(
    config: WslGlobalConfig,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    update_wsl_config_inner(config, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "compact_vhdx", distro = %distro_name))]
pub async fn compact_vhdx(
    distro_name: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    compact_vhdx_inner(distro_name, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_wsl_version"))]
pub async fn get_wsl_version(state: State<'_, AppState>) -> Result<WslVersionInfo, DomainError> {
    get_wsl_version_inner(&state).await
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

    fn make_test_state(wsl: MockWslManagerPort, audit: MockAuditLoggerPort) -> AppState {
        AppState {
            wsl_manager: Arc::new(wsl),
            snapshot_repo: Arc::new(MockSnapshotRepositoryPort::new()),
            monitoring: Arc::new(MockMonitoringProviderPort::new()),
            metrics_repo: Arc::new(MockMetricsRepositoryPort::new()),
            alerting: Arc::new(MockAlertingPort::new()),
            audit_logger: Arc::new(audit),
            alert_thresholds: Arc::new(tokio::sync::RwLock::new(vec![])),
            port_forwarding: Arc::new(MockPortForwardingPort::new()),
            port_rules_repo: Arc::new(MockPortForwardRulesRepository::new()),
        }
    }

    #[tokio::test]
    async fn get_wsl_config_delegates_to_manager() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_global_config()
            .returning(|| Ok(WslGlobalConfig::default()));

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = get_wsl_config_inner(&state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn update_wsl_config_calls_manager_and_audit() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_update_global_config().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log().returning(|_, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = update_wsl_config_inner(WslGlobalConfig::default(), &state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn get_wsl_version_delegates_to_manager() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_version_info().returning(|| {
            Ok(WslVersionInfo {
                wsl_version: Some("2.0.0".into()),
                kernel_version: Some("5.15.0".into()),
                wslg_version: Some("1.0.0".into()),
                windows_version: None,
            })
        });

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = get_wsl_version_inner(&state).await.unwrap();
        assert_eq!(result.wsl_version, Some("2.0.0".into()));
    }

    #[tokio::test]
    async fn compact_vhdx_terminates_then_sets_sparse() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_terminate_distro().returning(|_| Ok(()));
        wsl.expect_set_sparse().returning(|_, _| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log_with_details().returning(|_, _, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = compact_vhdx_inner("Ubuntu".into(), &state).await;
        assert!(result.is_ok());
    }
}
