use serde::Deserialize;
use tauri::State;
use tracing::instrument;

use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::{AuditEntry, AuditQuery};
use crate::presentation::state::AppState;

#[derive(Debug, Deserialize)]
pub struct SearchAuditArgs {
    pub action_filter: Option<String>,
    pub target_filter: Option<String>,
    pub limit: Option<u32>,
    pub offset: Option<u32>,
}

pub(crate) async fn search_audit_log_inner(
    args: SearchAuditArgs,
    state: &AppState,
) -> Result<Vec<AuditEntry>, DomainError> {
    let query = AuditQuery {
        action_filter: args.action_filter,
        target_filter: args.target_filter,
        since: None,
        until: None,
        limit: args.limit.unwrap_or(100),
        offset: args.offset.unwrap_or(0),
    };
    state.audit_logger.search(query).await
}

#[tauri::command]
#[instrument(skip(state, args), fields(cmd = "search_audit_log"))]
pub async fn search_audit_log(
    args: SearchAuditArgs,
    state: State<'_, AppState>,
) -> Result<Vec<AuditEntry>, DomainError> {
    search_audit_log_inner(args, &state).await
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

    fn make_test_state(audit: MockAuditLoggerPort) -> AppState {
        AppState {
            wsl_manager: Arc::new(MockWslManagerPort::new()),
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
    async fn search_audit_log_returns_entries() {
        let mut audit = MockAuditLoggerPort::new();
        audit.expect_search().returning(|_| {
            Ok(vec![AuditEntry {
                id: 1,
                action: "distro.start".into(),
                target: "Ubuntu".into(),
                details: None,
                timestamp: chrono::Utc::now(),
            }])
        });

        let state = make_test_state(audit);
        let args = SearchAuditArgs {
            action_filter: None,
            target_filter: None,
            limit: None,
            offset: None,
        };

        let result = search_audit_log_inner(args, &state).await.unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].action, "distro.start");
    }

    #[tokio::test]
    async fn search_audit_log_uses_default_limit() {
        let mut audit = MockAuditLoggerPort::new();
        audit
            .expect_search()
            .withf(|q| q.limit == 100 && q.offset == 0)
            .returning(|_| Ok(vec![]));

        let state = make_test_state(audit);
        let args = SearchAuditArgs {
            action_filter: None,
            target_filter: None,
            limit: None,
            offset: None,
        };

        let result = search_audit_log_inner(args, &state).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn search_audit_log_passes_filters() {
        let mut audit = MockAuditLoggerPort::new();
        audit
            .expect_search()
            .withf(|q| {
                q.action_filter == Some("distro.start".into())
                    && q.target_filter == Some("Ubuntu".into())
            })
            .returning(|_| Ok(vec![]));

        let state = make_test_state(audit);
        let args = SearchAuditArgs {
            action_filter: Some("distro.start".into()),
            target_filter: Some("Ubuntu".into()),
            limit: Some(50),
            offset: Some(10),
        };

        let result = search_audit_log_inner(args, &state).await;
        assert!(result.is_ok());
    }
}
