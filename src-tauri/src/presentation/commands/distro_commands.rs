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

/// Inner logic for list_distros, testable without Tauri runtime.
pub(crate) async fn list_distros_inner(
    state: &AppState,
) -> Result<Vec<DistroResponse>, DomainError> {
    let handler = ListDistrosHandler::new(state.wsl_manager.clone());
    handler.handle().await
}

/// Inner logic for start_distro, testable without Tauri runtime.
pub(crate) async fn start_distro_inner(name: String, state: &AppState) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.start(&distro_name).await?;
    state.audit("distro.start", &name).await?;
    Ok(())
}

/// Inner logic for stop_distro.
pub(crate) async fn stop_distro_inner(name: String, state: &AppState) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.stop(&distro_name).await?;
    state.audit("distro.stop", &name).await?;
    Ok(())
}

/// Inner logic for shutdown_all.
pub(crate) async fn shutdown_all_inner(state: &AppState) -> Result<(), DomainError> {
    state.wsl_manager.shutdown_all().await?;
    state.audit("wsl.shutdown_all", "all").await?;
    Ok(())
}

/// Inner logic for get_distro_install_path.
pub(crate) async fn get_distro_install_path_inner(
    name: String,
    state: &AppState,
) -> Result<String, DomainError> {
    let distro_name = DistroName::new(&name)?;
    state
        .wsl_manager
        .get_distro_install_path(&distro_name)
        .await
}

/// Inner logic for set_default_distro.
pub(crate) async fn set_default_distro_inner(
    name: String,
    state: &AppState,
) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    state.wsl_manager.set_default_distro(&distro_name).await?;
    state.audit("distro.set_default", &name).await?;
    Ok(())
}

/// Inner logic for resize_vhd.
pub(crate) async fn resize_vhd_inner(
    name: String,
    size: String,
    state: &AppState,
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
#[instrument(skip(state), fields(cmd = "list_distros"))]
pub async fn list_distros(state: State<'_, AppState>) -> Result<Vec<DistroResponse>, DomainError> {
    list_distros_inner(&state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "start_distro", distro = %name))]
pub async fn start_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    start_distro_inner(name, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "stop_distro", distro = %name))]
pub async fn stop_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    stop_distro_inner(name, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "restart_distro", distro = %name))]
pub async fn restart_distro(name: String, state: State<'_, AppState>) -> Result<(), DomainError> {
    let distro_name = DistroName::new(&name)?;
    let service = DistroService::new(state.wsl_manager.clone());
    service.restart(&distro_name).await?;
    state.audit("distro.restart", &name).await?;
    Ok(())
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "shutdown_all"))]
pub async fn shutdown_all(state: State<'_, AppState>) -> Result<(), DomainError> {
    shutdown_all_inner(&state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "get_distro_install_path", distro = %name))]
pub async fn get_distro_install_path(
    name: String,
    state: State<'_, AppState>,
) -> Result<String, DomainError> {
    get_distro_install_path_inner(name, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "set_default_distro", distro = %name))]
pub async fn set_default_distro(
    name: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    set_default_distro_inner(name, &state).await
}

#[tauri::command]
#[instrument(skip(state), fields(cmd = "resize_vhd", distro = %name, size = %size))]
pub async fn resize_vhd(
    name: String,
    size: String,
    state: State<'_, AppState>,
) -> Result<(), DomainError> {
    resize_vhd_inner(name, size, &state).await
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Arc;

    use crate::domain::entities::distro::Distro;
    use crate::domain::ports::alerting::MockAlertingPort;
    use crate::domain::ports::audit_logger::MockAuditLoggerPort;
    use crate::domain::ports::metrics_repository::MockMetricsRepositoryPort;
    use crate::domain::ports::monitoring_provider::MockMonitoringProviderPort;
    use crate::domain::ports::port_forwarding::{
        MockPortForwardRulesRepository, MockPortForwardingPort,
    };
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::ports::wsl_manager::MockWslManagerPort;
    use crate::domain::value_objects::{DistroState, WslVersion};

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

    fn make_distro(name: &str, state: DistroState) -> Distro {
        Distro::new(DistroName::new(name).unwrap(), state, WslVersion::V2, false)
    }

    #[tokio::test]
    async fn list_distros_returns_distros() {
        let mut wsl = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Running);
        wsl.expect_list_distros()
            .returning(move || Ok(vec![distro.clone()]));

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = list_distros_inner(&state).await.unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].name, "Ubuntu");
    }

    #[tokio::test]
    async fn start_distro_validates_name_and_calls_service() {
        let mut wsl = MockWslManagerPort::new();
        let distro = make_distro("Ubuntu", DistroState::Stopped);
        wsl.expect_get_distro()
            .returning(move |_| Ok(distro.clone()));
        wsl.expect_start_distro().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log().returning(|_, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = start_distro_inner("Ubuntu".into(), &state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn start_distro_rejects_invalid_name() {
        let wsl = MockWslManagerPort::new();
        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = start_distro_inner("".into(), &state).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn stop_distro_calls_terminate_and_audit() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_terminate_distro().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log().returning(|_, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = stop_distro_inner("Ubuntu".into(), &state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn shutdown_all_calls_manager_and_audit() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_shutdown_all().returning(|| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log().returning(|_, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = shutdown_all_inner(&state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn get_install_path_returns_path() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_get_distro_install_path()
            .returning(|_| Ok("C:\\Users\\test\\wsl\\Ubuntu".into()));

        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = get_distro_install_path_inner("Ubuntu".into(), &state)
            .await
            .unwrap();
        assert_eq!(result, "C:\\Users\\test\\wsl\\Ubuntu");
    }

    #[tokio::test]
    async fn get_install_path_rejects_invalid_name() {
        let wsl = MockWslManagerPort::new();
        let audit = MockAuditLoggerPort::new();
        let state = make_test_state(wsl, audit);

        let result = get_distro_install_path_inner("".into(), &state).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn set_default_distro_calls_manager_and_audit() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_set_default_distro().returning(|_| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log().returning(|_, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = set_default_distro_inner("Ubuntu".into(), &state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn resize_vhd_calls_manager_and_audit() {
        let mut wsl = MockWslManagerPort::new();
        wsl.expect_resize_vhd().returning(|_, _| Ok(()));

        let mut audit = MockAuditLoggerPort::new();
        audit.expect_log_with_details().returning(|_, _, _| Ok(()));

        let state = make_test_state(wsl, audit);
        let result = resize_vhd_inner("Ubuntu".into(), "100GB".into(), &state).await;
        assert!(result.is_ok());
    }
}
