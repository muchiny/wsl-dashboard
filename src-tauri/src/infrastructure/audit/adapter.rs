use async_trait::async_trait;
use chrono::Utc;

use crate::domain::errors::DomainError;
use crate::domain::ports::audit_logger::{AuditEntry, AuditLoggerPort, AuditQuery};

/// In-memory audit logger stub. Will be replaced with SQLite.
pub struct InMemoryAuditLogger {
    entries: tokio::sync::RwLock<Vec<AuditEntry>>,
}

impl InMemoryAuditLogger {
    pub fn new() -> Self {
        Self {
            entries: tokio::sync::RwLock::new(Vec::new()),
        }
    }
}

impl Default for InMemoryAuditLogger {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AuditLoggerPort for InMemoryAuditLogger {
    async fn log(&self, action: &str, target: &str) -> Result<(), DomainError> {
        let mut entries = self.entries.write().await;
        let id = entries.len() as i64 + 1;
        entries.push(AuditEntry {
            id,
            timestamp: Utc::now(),
            action: action.to_string(),
            target: target.to_string(),
            details: None,
        });
        tracing::info!(action = action, target = target, "Audit log");
        Ok(())
    }

    async fn log_with_details(
        &self,
        action: &str,
        target: &str,
        details: &str,
    ) -> Result<(), DomainError> {
        let mut entries = self.entries.write().await;
        let id = entries.len() as i64 + 1;
        entries.push(AuditEntry {
            id,
            timestamp: Utc::now(),
            action: action.to_string(),
            target: target.to_string(),
            details: Some(details.to_string()),
        });
        tracing::info!(
            action = action,
            target = target,
            details = details,
            "Audit log"
        );
        Ok(())
    }

    async fn search(&self, query: AuditQuery) -> Result<Vec<AuditEntry>, DomainError> {
        let entries = self.entries.read().await;
        let filtered: Vec<AuditEntry> = entries
            .iter()
            .filter(|e| {
                if let Some(ref action) = query.action_filter {
                    if !e.action.contains(action) {
                        return false;
                    }
                }
                if let Some(ref target) = query.target_filter {
                    if !e.target.contains(target) {
                        return false;
                    }
                }
                if let Some(since) = query.since {
                    if e.timestamp < since {
                        return false;
                    }
                }
                if let Some(until) = query.until {
                    if e.timestamp > until {
                        return false;
                    }
                }
                true
            })
            .skip(query.offset as usize)
            .take(query.limit as usize)
            .cloned()
            .collect();

        Ok(filtered)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn default_query() -> AuditQuery {
        AuditQuery {
            action_filter: None,
            target_filter: None,
            since: None,
            until: None,
            limit: 100,
            offset: 0,
        }
    }

    #[tokio::test]
    async fn test_log_creates_entry() {
        let logger = InMemoryAuditLogger::new();
        logger.log("distro.start", "Ubuntu").await.unwrap();

        let entries = logger.search(default_query()).await.unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].action, "distro.start");
        assert_eq!(entries[0].target, "Ubuntu");
        assert!(entries[0].details.is_none());
    }

    #[tokio::test]
    async fn test_log_with_details_stores_details() {
        let logger = InMemoryAuditLogger::new();
        logger
            .log_with_details("snapshot.restore", "snap-1", "Restored as clone")
            .await
            .unwrap();

        let entries = logger.search(default_query()).await.unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].details, Some("Restored as clone".to_string()));
    }

    #[tokio::test]
    async fn test_search_action_filter() {
        let logger = InMemoryAuditLogger::new();
        logger.log("distro.start", "Ubuntu").await.unwrap();
        logger.log("snapshot.create", "snap-1").await.unwrap();
        logger.log("distro.stop", "Ubuntu").await.unwrap();

        let mut query = default_query();
        query.action_filter = Some("distro".to_string());
        let entries = logger.search(query).await.unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn test_search_target_filter() {
        let logger = InMemoryAuditLogger::new();
        logger.log("distro.start", "Ubuntu").await.unwrap();
        logger.log("distro.start", "Fedora").await.unwrap();

        let mut query = default_query();
        query.target_filter = Some("Ubuntu".to_string());
        let entries = logger.search(query).await.unwrap();
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].target, "Ubuntu");
    }

    #[tokio::test]
    async fn test_search_limit_and_offset() {
        let logger = InMemoryAuditLogger::new();
        for i in 0..5 {
            logger
                .log("action", &format!("target-{}", i))
                .await
                .unwrap();
        }

        let mut query = default_query();
        query.limit = 2;
        query.offset = 1;
        let entries = logger.search(query).await.unwrap();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].target, "target-1");
        assert_eq!(entries[1].target, "target-2");
    }

    #[tokio::test]
    async fn test_search_empty_returns_all() {
        let logger = InMemoryAuditLogger::new();
        logger.log("a", "b").await.unwrap();
        logger.log("c", "d").await.unwrap();

        let entries = logger.search(default_query()).await.unwrap();
        assert_eq!(entries.len(), 2);
    }

    #[tokio::test]
    async fn test_incremental_ids() {
        let logger = InMemoryAuditLogger::new();
        logger.log("a", "b").await.unwrap();
        logger.log("c", "d").await.unwrap();

        let entries = logger.search(default_query()).await.unwrap();
        assert_eq!(entries[0].id, 1);
        assert_eq!(entries[1].id, 2);
    }
}
