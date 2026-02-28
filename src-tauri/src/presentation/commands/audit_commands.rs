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

#[tauri::command]
#[instrument(skip(state, args), fields(cmd = "search_audit_log"))]
pub async fn search_audit_log(
    args: SearchAuditArgs,
    state: State<'_, AppState>,
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
