use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sqlx::Row;

use super::SqlxResultExt;
use super::adapter::SqliteDb;
use crate::domain::entities::monitoring::SystemMetrics;
use crate::domain::errors::DomainError;
use crate::domain::ports::metrics_repository::{
    AggregatedMetricsPoint, MetricsRepositoryPort, RawMetricsRow,
};
use crate::domain::value_objects::DistroName;

pub struct SqliteMetricsRepository {
    db: SqliteDb,
}

impl SqliteMetricsRepository {
    pub fn new(db: SqliteDb) -> Self {
        Self { db }
    }
}

#[async_trait]
impl MetricsRepositoryPort for SqliteMetricsRepository {
    async fn store_raw(&self, metrics: &SystemMetrics) -> Result<(), DomainError> {
        let net_rx: u64 = metrics.network.interfaces.iter().map(|i| i.rx_bytes).sum();
        let net_tx: u64 = metrics.network.interfaces.iter().map(|i| i.tx_bytes).sum();

        sqlx::query(
            "INSERT INTO metrics_raw (
                distro_name, timestamp,
                cpu_usage_percent, load_avg_1, load_avg_5, load_avg_15,
                mem_total_bytes, mem_used_bytes, mem_available_bytes, mem_cached_bytes,
                swap_total_bytes, swap_used_bytes,
                disk_total_bytes, disk_used_bytes, disk_available_bytes, disk_usage_percent,
                net_rx_bytes, net_tx_bytes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&metrics.distro_name)
        .bind(metrics.timestamp.to_rfc3339())
        .bind(metrics.cpu.usage_percent)
        .bind(metrics.cpu.load_average[0])
        .bind(metrics.cpu.load_average[1])
        .bind(metrics.cpu.load_average[2])
        .bind(metrics.memory.total_bytes as i64)
        .bind(metrics.memory.used_bytes as i64)
        .bind(metrics.memory.available_bytes as i64)
        .bind(metrics.memory.cached_bytes as i64)
        .bind(metrics.memory.swap_total_bytes as i64)
        .bind(metrics.memory.swap_used_bytes as i64)
        .bind(metrics.disk.total_bytes as i64)
        .bind(metrics.disk.used_bytes as i64)
        .bind(metrics.disk.available_bytes as i64)
        .bind(metrics.disk.usage_percent)
        .bind(net_rx as i64)
        .bind(net_tx as i64)
        .execute(&self.db.pool)
        .await
        .db_err()?;

        Ok(())
    }

    async fn query_raw(
        &self,
        distro: &DistroName,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<RawMetricsRow>, DomainError> {
        let rows = sqlx::query(
            "SELECT * FROM metrics_raw
             WHERE distro_name = ? AND timestamp >= ? AND timestamp <= ?
             ORDER BY timestamp ASC",
        )
        .bind(distro.as_str())
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.db.pool)
        .await
        .db_err()?;

        rows.iter()
            .map(|row| {
                let ts_str: String = row.get("timestamp");
                let timestamp = chrono::DateTime::parse_from_rfc3339(&ts_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(RawMetricsRow {
                    distro_name: row.get("distro_name"),
                    timestamp,
                    cpu_usage_percent: row.get("cpu_usage_percent"),
                    load_avg_1: row.get("load_avg_1"),
                    load_avg_5: row.get("load_avg_5"),
                    load_avg_15: row.get("load_avg_15"),
                    mem_total_bytes: row.get::<i64, _>("mem_total_bytes") as u64,
                    mem_used_bytes: row.get::<i64, _>("mem_used_bytes") as u64,
                    mem_available_bytes: row.get::<i64, _>("mem_available_bytes") as u64,
                    mem_cached_bytes: row.get::<i64, _>("mem_cached_bytes") as u64,
                    swap_total_bytes: row.get::<i64, _>("swap_total_bytes") as u64,
                    swap_used_bytes: row.get::<i64, _>("swap_used_bytes") as u64,
                    disk_total_bytes: row.get::<i64, _>("disk_total_bytes") as u64,
                    disk_used_bytes: row.get::<i64, _>("disk_used_bytes") as u64,
                    disk_available_bytes: row.get::<i64, _>("disk_available_bytes") as u64,
                    disk_usage_percent: row.get("disk_usage_percent"),
                    net_rx_bytes: row.get::<i64, _>("net_rx_bytes") as u64,
                    net_tx_bytes: row.get::<i64, _>("net_tx_bytes") as u64,
                })
            })
            .collect()
    }

    async fn query_aggregated(
        &self,
        distro: &DistroName,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<AggregatedMetricsPoint>, DomainError> {
        let rows = sqlx::query(
            "SELECT * FROM metrics_aggregated
             WHERE distro_name = ? AND period_start >= ? AND period_start <= ?
             ORDER BY period_start ASC",
        )
        .bind(distro.as_str())
        .bind(from.to_rfc3339())
        .bind(to.to_rfc3339())
        .fetch_all(&self.db.pool)
        .await
        .db_err()?;

        rows.iter()
            .map(|row| {
                let start_str: String = row.get("period_start");
                let end_str: String = row.get("period_end");

                let period_start = chrono::DateTime::parse_from_rfc3339(&start_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());
                let period_end = chrono::DateTime::parse_from_rfc3339(&end_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(AggregatedMetricsPoint {
                    period_start,
                    period_end,
                    sample_count: row.get::<i64, _>("sample_count") as u32,
                    cpu_min: row.get("cpu_min"),
                    cpu_avg: row.get("cpu_avg"),
                    cpu_max: row.get("cpu_max"),
                    mem_used_min: row.get::<i64, _>("mem_used_min") as u64,
                    mem_used_avg: row.get::<i64, _>("mem_used_avg") as u64,
                    mem_used_max: row.get::<i64, _>("mem_used_max") as u64,
                    mem_total: row.get::<i64, _>("mem_total") as u64,
                    disk_min: row.get("disk_min"),
                    disk_avg: row.get("disk_avg"),
                    disk_max: row.get("disk_max"),
                    net_rx_total: row.get::<i64, _>("net_rx_total") as u64,
                    net_tx_total: row.get::<i64, _>("net_tx_total") as u64,
                    net_rx_max_rate: row.get::<i64, _>("net_rx_max_rate") as u64,
                    net_tx_max_rate: row.get::<i64, _>("net_tx_max_rate") as u64,
                })
            })
            .collect()
    }

    async fn aggregate_raw_buckets(
        &self,
        bucket_start: DateTime<Utc>,
        bucket_end: DateTime<Utc>,
    ) -> Result<u64, DomainError> {
        // Use a single SQL INSERT...SELECT to aggregate raw metrics into 1-minute buckets.
        // Groups by distro_name and 1-minute time windows, computing min/avg/max for each metric.
        // strftime('%Y-%m-%dT%H:%M:00', timestamp) truncates to the minute boundary.
        let result = sqlx::query(
            "INSERT OR IGNORE INTO metrics_aggregated (
                distro_name, period_start, period_end, sample_count,
                cpu_min, cpu_avg, cpu_max,
                mem_used_min, mem_used_avg, mem_used_max, mem_total,
                disk_min, disk_avg, disk_max,
                net_rx_total, net_tx_total, net_rx_max_rate, net_tx_max_rate
            )
            SELECT
                distro_name,
                strftime('%Y-%m-%dT%H:%M:00+00:00', timestamp) as period_start,
                strftime('%Y-%m-%dT%H:%M:00+00:00', timestamp, '+1 minute') as period_end,
                COUNT(*) as sample_count,
                MIN(cpu_usage_percent), AVG(cpu_usage_percent), MAX(cpu_usage_percent),
                MIN(mem_used_bytes), CAST(AVG(mem_used_bytes) AS INTEGER), MAX(mem_used_bytes),
                MAX(mem_total_bytes),
                MIN(disk_usage_percent), AVG(disk_usage_percent), MAX(disk_usage_percent),
                SUM(net_rx_bytes), SUM(net_tx_bytes),
                MAX(net_rx_bytes), MAX(net_tx_bytes)
            FROM metrics_raw
            WHERE timestamp >= ? AND timestamp < ?
            GROUP BY distro_name, strftime('%Y-%m-%dT%H:%M', timestamp)
            HAVING COUNT(*) > 0",
        )
        .bind(bucket_start.to_rfc3339())
        .bind(bucket_end.to_rfc3339())
        .execute(&self.db.pool)
        .await
        .db_err()?;

        Ok(result.rows_affected())
    }

    async fn purge_raw_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError> {
        let result = sqlx::query("DELETE FROM metrics_raw WHERE timestamp < ?")
            .bind(before.to_rfc3339())
            .execute(&self.db.pool)
            .await
            .db_err()?;

        Ok(result.rows_affected())
    }

    async fn purge_aggregated_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError> {
        let result = sqlx::query("DELETE FROM metrics_aggregated WHERE period_start < ?")
            .bind(before.to_rfc3339())
            .execute(&self.db.pool)
            .await
            .db_err()?;

        Ok(result.rows_affected())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::monitoring::*;
    use crate::infrastructure::sqlite::adapter::SqliteDb;

    async fn test_db() -> SqliteDb {
        SqliteDb::new("sqlite::memory:").await.unwrap()
    }

    fn make_metrics(distro: &str, cpu: f64, mem_used: u64, disk_pct: f64) -> SystemMetrics {
        SystemMetrics {
            distro_name: distro.to_string(),
            timestamp: Utc::now(),
            cpu: CpuMetrics {
                usage_percent: cpu,
                per_core: vec![cpu],
                load_average: [1.0, 0.5, 0.3],
            },
            memory: MemoryMetrics {
                total_bytes: 8_000_000_000,
                used_bytes: mem_used,
                available_bytes: 8_000_000_000 - mem_used,
                cached_bytes: 500_000_000,
                swap_total_bytes: 2_000_000_000,
                swap_used_bytes: 100_000_000,
            },
            disk: DiskMetrics {
                total_bytes: 100_000_000_000,
                used_bytes: (disk_pct / 100.0 * 100_000_000_000.0) as u64,
                available_bytes: ((100.0 - disk_pct) / 100.0 * 100_000_000_000.0) as u64,
                usage_percent: disk_pct,
            },
            network: NetworkMetrics {
                interfaces: vec![InterfaceStats {
                    name: "eth0".to_string(),
                    rx_bytes: 1_000_000,
                    tx_bytes: 500_000,
                    rx_packets: 1000,
                    tx_packets: 500,
                }],
            },
        }
    }

    #[tokio::test]
    async fn test_store_and_query_raw_metrics() {
        let db = test_db().await;
        let repo = SqliteMetricsRepository::new(db);

        let metrics = make_metrics("Ubuntu", 45.5, 4_000_000_000, 60.0);
        repo.store_raw(&metrics).await.unwrap();

        let distro = DistroName::new("Ubuntu").unwrap();
        let from = Utc::now() - chrono::Duration::minutes(1);
        let to = Utc::now() + chrono::Duration::minutes(1);
        let rows = repo.query_raw(&distro, from, to).await.unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].distro_name, "Ubuntu");
        assert!((rows[0].cpu_usage_percent - 45.5).abs() < 0.01);
        assert_eq!(rows[0].mem_used_bytes, 4_000_000_000);
        assert_eq!(rows[0].net_rx_bytes, 1_000_000);
        assert_eq!(rows[0].net_tx_bytes, 500_000);
    }

    #[tokio::test]
    async fn test_query_raw_filters_by_distro_and_time() {
        let db = test_db().await;
        let repo = SqliteMetricsRepository::new(db);

        repo.store_raw(&make_metrics("Ubuntu", 50.0, 4_000_000_000, 60.0))
            .await
            .unwrap();
        repo.store_raw(&make_metrics("Debian", 30.0, 2_000_000_000, 40.0))
            .await
            .unwrap();

        let distro = DistroName::new("Ubuntu").unwrap();
        let from = Utc::now() - chrono::Duration::minutes(1);
        let to = Utc::now() + chrono::Duration::minutes(1);
        let rows = repo.query_raw(&distro, from, to).await.unwrap();

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].distro_name, "Ubuntu");
    }

    #[tokio::test]
    async fn test_purge_raw_deletes_old_data() {
        let db = test_db().await;
        let repo = SqliteMetricsRepository::new(db);

        repo.store_raw(&make_metrics("Ubuntu", 50.0, 4_000_000_000, 60.0))
            .await
            .unwrap();

        // Purge everything before 1 minute in the future (should delete all)
        let deleted = repo
            .purge_raw_before(Utc::now() + chrono::Duration::minutes(1))
            .await
            .unwrap();
        assert_eq!(deleted, 1);

        let distro = DistroName::new("Ubuntu").unwrap();
        let rows = repo
            .query_raw(
                &distro,
                Utc::now() - chrono::Duration::hours(1),
                Utc::now() + chrono::Duration::hours(1),
            )
            .await
            .unwrap();
        assert!(rows.is_empty());
    }
}
