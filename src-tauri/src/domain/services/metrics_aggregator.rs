use std::sync::Arc;
use std::time::Duration;

use chrono::{Timelike, Utc};

use crate::domain::ports::alerting::AlertingPort;
use crate::domain::ports::metrics_repository::MetricsRepositoryPort;

const AGGREGATION_INTERVAL_SECS: u64 = 60;
const RAW_RETENTION_HOURS: i64 = 1;
const AGGREGATED_RETENTION_HOURS: i64 = 24;
const ALERT_RETENTION_HOURS: i64 = 24;

/// Background service that aggregates raw metrics into 1-minute buckets
/// and purges expired data.
pub struct MetricsAggregator {
    metrics_repo: Arc<dyn MetricsRepositoryPort>,
    alerting: Arc<dyn AlertingPort>,
}

impl MetricsAggregator {
    pub fn new(
        metrics_repo: Arc<dyn MetricsRepositoryPort>,
        alerting: Arc<dyn AlertingPort>,
    ) -> Self {
        Self {
            metrics_repo,
            alerting,
        }
    }

    pub async fn run(self) {
        let mut interval = tokio::time::interval(Duration::from_secs(AGGREGATION_INTERVAL_SECS));

        loop {
            interval.tick().await;

            if let Err(e) = self.aggregate_and_purge().await {
                tracing::debug!("Metrics aggregation error: {e}");
            }
        }
    }

    async fn aggregate_and_purge(&self) -> Result<(), String> {
        let now = Utc::now();

        // Aggregate raw metrics that are at least 2 minutes old (to ensure complete buckets).
        // Window: from 62 minutes ago to 2 minutes ago (covers the full raw retention window).
        let agg_end = now
            .with_second(0)
            .unwrap_or(now)
            .with_nanosecond(0)
            .unwrap_or(now)
            - chrono::Duration::minutes(2);
        let agg_start = agg_end - chrono::Duration::minutes(60);

        match self
            .metrics_repo
            .aggregate_raw_buckets(agg_start, agg_end)
            .await
        {
            Ok(count) => {
                if count > 0 {
                    tracing::debug!("Aggregated {count} metric buckets");
                }
            }
            Err(e) => tracing::debug!("Aggregation failed: {e}"),
        }

        // Purge expired raw data (> 1 hour old)
        let raw_cutoff = now - chrono::Duration::hours(RAW_RETENTION_HOURS);
        if let Ok(deleted) = self.metrics_repo.purge_raw_before(raw_cutoff).await
            && deleted > 0
        {
            tracing::debug!("Purged {deleted} raw metrics rows");
        }

        // Purge expired aggregated data (> 24 hours old)
        let agg_cutoff = now - chrono::Duration::hours(AGGREGATED_RETENTION_HOURS);
        if let Ok(deleted) = self.metrics_repo.purge_aggregated_before(agg_cutoff).await
            && deleted > 0
        {
            tracing::debug!("Purged {deleted} aggregated metrics rows");
        }

        // Purge expired alerts (> 24 hours old)
        let alert_cutoff = now - chrono::Duration::hours(ALERT_RETENTION_HOURS);
        if let Ok(deleted) = self.alerting.purge_before(alert_cutoff).await
            && deleted > 0
        {
            tracing::debug!("Purged {deleted} alert log rows");
        }

        Ok(())
    }
}
