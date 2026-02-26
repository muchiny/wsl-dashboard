use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::Row;

use super::adapter::SqliteDb;
use crate::domain::errors::DomainError;
use crate::domain::ports::alerting::{AlertRecord, AlertType, AlertingPort};
use crate::domain::value_objects::DistroName;

pub struct SqliteAlertRepository {
    db: SqliteDb,
}

impl SqliteAlertRepository {
    pub fn new(db: SqliteDb) -> Self {
        Self { db }
    }
}

#[async_trait]
impl AlertingPort for SqliteAlertRepository {
    async fn record_alert(
        &self,
        distro: &DistroName,
        alert_type: AlertType,
        threshold: f64,
        actual_value: f64,
    ) -> Result<(), DomainError> {
        sqlx::query(
            "INSERT INTO alert_log (distro_name, alert_type, threshold, actual_value, timestamp)
             VALUES (?, ?, ?, ?, ?)",
        )
        .bind(distro.as_str())
        .bind(alert_type.to_string())
        .bind(threshold)
        .bind(actual_value)
        .bind(Utc::now().to_rfc3339())
        .execute(&self.db.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn get_recent_alerts(
        &self,
        distro: &DistroName,
        limit: u32,
    ) -> Result<Vec<AlertRecord>, DomainError> {
        let rows = sqlx::query(
            "SELECT * FROM alert_log
             WHERE distro_name = ?
             ORDER BY timestamp DESC
             LIMIT ?",
        )
        .bind(distro.as_str())
        .bind(limit as i64)
        .fetch_all(&self.db.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        rows.iter()
            .map(|row| {
                let ts_str: String = row.get("timestamp");
                let alert_type_str: String = row.get("alert_type");

                Ok(AlertRecord {
                    id: row.get("id"),
                    distro_name: row.get("distro_name"),
                    alert_type: alert_type_str
                        .parse::<AlertType>()
                        .unwrap_or(AlertType::Cpu),
                    threshold: row.get("threshold"),
                    actual_value: row.get("actual_value"),
                    timestamp: chrono::DateTime::parse_from_rfc3339(&ts_str)
                        .map(|dt| dt.with_timezone(&Utc))
                        .unwrap_or_else(|_| Utc::now()),
                    acknowledged: row.get::<i32, _>("acknowledged") != 0,
                })
            })
            .collect()
    }

    async fn acknowledge_alert(&self, alert_id: i64) -> Result<(), DomainError> {
        sqlx::query("UPDATE alert_log SET acknowledged = 1 WHERE id = ?")
            .bind(alert_id)
            .execute(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn purge_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError> {
        let result = sqlx::query("DELETE FROM alert_log WHERE timestamp < ?")
            .bind(before.to_rfc3339())
            .execute(&self.db.pool)
            .await
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(result.rows_affected())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::adapter::SqliteDb;

    async fn test_db() -> SqliteDb {
        SqliteDb::new("sqlite::memory:").await.unwrap()
    }

    #[tokio::test]
    async fn test_record_and_get_alerts() {
        let db = test_db().await;
        let repo = SqliteAlertRepository::new(db);

        let distro = DistroName::new("Ubuntu").unwrap();
        repo.record_alert(&distro, AlertType::Cpu, 90.0, 95.5)
            .await
            .unwrap();
        repo.record_alert(&distro, AlertType::Memory, 85.0, 88.0)
            .await
            .unwrap();

        let alerts = repo.get_recent_alerts(&distro, 10).await.unwrap();
        assert_eq!(alerts.len(), 2);
        // Ordered by timestamp DESC (most recent first)
        assert_eq!(alerts[0].alert_type, AlertType::Memory);
        assert_eq!(alerts[1].alert_type, AlertType::Cpu);
        assert!(!alerts[0].acknowledged);
    }

    #[tokio::test]
    async fn test_acknowledge_alert() {
        let db = test_db().await;
        let repo = SqliteAlertRepository::new(db);

        let distro = DistroName::new("Ubuntu").unwrap();
        repo.record_alert(&distro, AlertType::Disk, 90.0, 92.0)
            .await
            .unwrap();

        let alerts = repo.get_recent_alerts(&distro, 10).await.unwrap();
        assert!(!alerts[0].acknowledged);

        repo.acknowledge_alert(alerts[0].id).await.unwrap();

        let alerts = repo.get_recent_alerts(&distro, 10).await.unwrap();
        assert!(alerts[0].acknowledged);
    }

    #[tokio::test]
    async fn test_purge_old_alerts() {
        let db = test_db().await;
        let repo = SqliteAlertRepository::new(db);

        let distro = DistroName::new("Ubuntu").unwrap();
        repo.record_alert(&distro, AlertType::Cpu, 90.0, 95.0)
            .await
            .unwrap();

        let deleted = repo
            .purge_before(Utc::now() + chrono::Duration::minutes(1))
            .await
            .unwrap();
        assert_eq!(deleted, 1);

        let alerts = repo.get_recent_alerts(&distro, 10).await.unwrap();
        assert!(alerts.is_empty());
    }

    #[tokio::test]
    async fn test_alerts_filtered_by_distro() {
        let db = test_db().await;
        let repo = SqliteAlertRepository::new(db);

        let ubuntu = DistroName::new("Ubuntu").unwrap();
        let debian = DistroName::new("Debian").unwrap();
        repo.record_alert(&ubuntu, AlertType::Cpu, 90.0, 95.0)
            .await
            .unwrap();
        repo.record_alert(&debian, AlertType::Memory, 85.0, 88.0)
            .await
            .unwrap();

        let ubuntu_alerts = repo.get_recent_alerts(&ubuntu, 10).await.unwrap();
        assert_eq!(ubuntu_alerts.len(), 1);
        assert_eq!(ubuntu_alerts[0].distro_name, "Ubuntu");
    }
}
