use async_trait::async_trait;
use sqlx::{Row, SqlitePool};

use crate::domain::entities::port_forward::PortForwardRule;
use crate::domain::errors::DomainError;
use crate::domain::ports::port_forwarding::PortForwardRulesRepository;

pub struct SqlitePortForwardingRepository {
    pool: SqlitePool,
}

impl SqlitePortForwardingRepository {
    pub fn new(db: crate::infrastructure::sqlite::adapter::SqliteDb) -> Self {
        Self { pool: db.pool }
    }
}

#[async_trait]
impl PortForwardRulesRepository for SqlitePortForwardingRepository {
    async fn save_rule(&self, rule: &PortForwardRule) -> Result<(), DomainError> {
        sqlx::query(
            "INSERT INTO port_forwarding_rules (id, distro_name, wsl_port, host_port, protocol, enabled)
             VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(&rule.id)
        .bind(&rule.distro_name)
        .bind(rule.wsl_port as i64)
        .bind(rule.host_port as i64)
        .bind(&rule.protocol)
        .bind(rule.enabled)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn delete_rule(&self, rule_id: &str) -> Result<(), DomainError> {
        sqlx::query("DELETE FROM port_forwarding_rules WHERE id = ?")
            .bind(rule_id)
            .execute(&self.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn list_rules(
        &self,
        distro_name: Option<String>,
    ) -> Result<Vec<PortForwardRule>, DomainError> {
        let rows = if let Some(ref name) = distro_name {
            sqlx::query(
                "SELECT id, distro_name, wsl_port, host_port, protocol, enabled, created_at
                 FROM port_forwarding_rules WHERE distro_name = ? ORDER BY created_at DESC",
            )
            .bind(name)
            .fetch_all(&self.pool)
            .await
        } else {
            sqlx::query(
                "SELECT id, distro_name, wsl_port, host_port, protocol, enabled, created_at
                 FROM port_forwarding_rules ORDER BY created_at DESC",
            )
            .fetch_all(&self.pool)
            .await
        }
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let rules = rows
            .iter()
            .map(|row| PortForwardRule {
                id: row.get("id"),
                distro_name: row.get("distro_name"),
                wsl_port: row.get::<i64, _>("wsl_port") as u16,
                host_port: row.get::<i64, _>("host_port") as u16,
                protocol: row.get("protocol"),
                enabled: row.get("enabled"),
                created_at: row.get("created_at"),
            })
            .collect();

        Ok(rules)
    }

    async fn get_rule(&self, rule_id: &str) -> Result<Option<PortForwardRule>, DomainError> {
        let row = sqlx::query(
            "SELECT id, distro_name, wsl_port, host_port, protocol, enabled, created_at
             FROM port_forwarding_rules WHERE id = ?",
        )
        .bind(rule_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(row.map(|r| PortForwardRule {
            id: r.get("id"),
            distro_name: r.get("distro_name"),
            wsl_port: r.get::<i64, _>("wsl_port") as u16,
            host_port: r.get::<i64, _>("host_port") as u16,
            protocol: r.get("protocol"),
            enabled: r.get("enabled"),
            created_at: r.get("created_at"),
        }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::adapter::SqliteDb;

    async fn test_db() -> SqliteDb {
        SqliteDb::new("sqlite::memory:").await.unwrap()
    }

    fn make_rule(id: &str, distro: &str, wsl_port: u16, host_port: u16) -> PortForwardRule {
        PortForwardRule {
            id: id.to_string(),
            distro_name: distro.to_string(),
            wsl_port,
            host_port,
            protocol: "tcp".to_string(),
            enabled: true,
            created_at: chrono::Utc::now().to_rfc3339(),
        }
    }

    #[tokio::test]
    async fn test_save_and_get_rule() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        let rule = make_rule("r1", "Ubuntu", 3000, 3000);
        repo.save_rule(&rule).await.unwrap();

        let retrieved = repo.get_rule("r1").await.unwrap();
        assert!(retrieved.is_some());
        let r = retrieved.unwrap();
        assert_eq!(r.id, "r1");
        assert_eq!(r.distro_name, "Ubuntu");
        assert_eq!(r.wsl_port, 3000);
        assert_eq!(r.host_port, 3000);
        assert_eq!(r.protocol, "tcp");
        assert!(r.enabled);
    }

    #[tokio::test]
    async fn test_get_rule_returns_none_for_unknown_id() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        let result = repo.get_rule("nonexistent").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_delete_rule_removes_entry() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        repo.save_rule(&make_rule("r1", "Ubuntu", 3000, 3000))
            .await
            .unwrap();
        repo.delete_rule("r1").await.unwrap();

        let result = repo.get_rule("r1").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_delete_nonexistent_rule_does_not_error() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        let result = repo.delete_rule("ghost").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_list_rules_returns_all_when_no_filter() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        repo.save_rule(&make_rule("r1", "Ubuntu", 3000, 3000))
            .await
            .unwrap();
        repo.save_rule(&make_rule("r2", "Debian", 8080, 8080))
            .await
            .unwrap();

        let rules = repo.list_rules(None).await.unwrap();
        assert_eq!(rules.len(), 2);
    }

    #[tokio::test]
    async fn test_list_rules_filters_by_distro() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        repo.save_rule(&make_rule("r1", "Ubuntu", 3000, 3000))
            .await
            .unwrap();
        repo.save_rule(&make_rule("r2", "Debian", 8080, 8080))
            .await
            .unwrap();
        repo.save_rule(&make_rule("r3", "Ubuntu", 5432, 5432))
            .await
            .unwrap();

        let rules = repo.list_rules(Some("Ubuntu".to_string())).await.unwrap();
        assert_eq!(rules.len(), 2);
        for rule in &rules {
            assert_eq!(rule.distro_name, "Ubuntu");
        }
    }

    #[tokio::test]
    async fn test_list_rules_returns_empty_for_unknown_distro() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        repo.save_rule(&make_rule("r1", "Ubuntu", 3000, 3000))
            .await
            .unwrap();

        let rules = repo.list_rules(Some("Arch".to_string())).await.unwrap();
        assert!(rules.is_empty());
    }

    #[tokio::test]
    async fn test_unique_host_port_constraint() {
        let db = test_db().await;
        let repo = SqlitePortForwardingRepository::new(db);

        repo.save_rule(&make_rule("r1", "Ubuntu", 3000, 8080))
            .await
            .unwrap();

        // Same host_port + protocol should fail (UNIQUE constraint)
        let result = repo.save_rule(&make_rule("r2", "Debian", 4000, 8080)).await;
        assert!(result.is_err());
    }
}
