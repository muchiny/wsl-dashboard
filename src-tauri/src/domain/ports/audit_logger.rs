use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::errors::DomainError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEntry {
    pub id: i64,
    pub timestamp: DateTime<Utc>,
    pub action: String,
    pub target: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone)]
pub struct AuditQuery {
    pub action_filter: Option<String>,
    pub target_filter: Option<String>,
    pub since: Option<DateTime<Utc>>,
    pub until: Option<DateTime<Utc>>,
    pub limit: u32,
    pub offset: u32,
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait AuditLoggerPort: Send + Sync {
    /// Log an action
    async fn log(&self, action: &str, target: &str) -> Result<(), DomainError>;

    /// Log an action with additional details
    async fn log_with_details(
        &self,
        action: &str,
        target: &str,
        details: &str,
    ) -> Result<(), DomainError>;

    /// Search the audit log
    async fn search(&self, query: AuditQuery) -> Result<Vec<AuditEntry>, DomainError>;
}
