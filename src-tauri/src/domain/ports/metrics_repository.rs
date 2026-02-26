use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::entities::monitoring::SystemMetrics;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

/// Granularity tier for metrics queries.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum MetricsGranularity {
    /// Raw ~2s samples, kept for 1 hour
    Raw,
    /// 1-minute aggregated buckets, kept for 24 hours
    OneMinute,
}

/// An aggregated data point (min/avg/max over a time bucket).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AggregatedMetricsPoint {
    pub period_start: DateTime<Utc>,
    pub period_end: DateTime<Utc>,
    pub sample_count: u32,
    pub cpu_min: f64,
    pub cpu_avg: f64,
    pub cpu_max: f64,
    pub mem_used_min: u64,
    pub mem_used_avg: u64,
    pub mem_used_max: u64,
    pub mem_total: u64,
    pub disk_min: f64,
    pub disk_avg: f64,
    pub disk_max: f64,
    pub net_rx_total: u64,
    pub net_tx_total: u64,
    pub net_rx_max_rate: u64,
    pub net_tx_max_rate: u64,
}

/// A raw metrics row as stored in the database (flattened scalars).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RawMetricsRow {
    pub distro_name: String,
    pub timestamp: DateTime<Utc>,
    pub cpu_usage_percent: f64,
    pub load_avg_1: f64,
    pub load_avg_5: f64,
    pub load_avg_15: f64,
    pub mem_total_bytes: u64,
    pub mem_used_bytes: u64,
    pub mem_available_bytes: u64,
    pub mem_cached_bytes: u64,
    pub swap_total_bytes: u64,
    pub swap_used_bytes: u64,
    pub disk_total_bytes: u64,
    pub disk_used_bytes: u64,
    pub disk_available_bytes: u64,
    pub disk_usage_percent: f64,
    pub net_rx_bytes: u64,
    pub net_tx_bytes: u64,
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait MetricsRepositoryPort: Send + Sync {
    /// Store a raw metrics snapshot.
    async fn store_raw(&self, metrics: &SystemMetrics) -> Result<(), DomainError>;

    /// Query raw metrics in a time range for a distro.
    async fn query_raw(
        &self,
        distro: &DistroName,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<RawMetricsRow>, DomainError>;

    /// Store an aggregated metrics point.
    async fn store_aggregated(
        &self,
        distro: &DistroName,
        point: &AggregatedMetricsPoint,
    ) -> Result<(), DomainError>;

    /// Query aggregated metrics for a time range.
    async fn query_aggregated(
        &self,
        distro: &DistroName,
        from: DateTime<Utc>,
        to: DateTime<Utc>,
    ) -> Result<Vec<AggregatedMetricsPoint>, DomainError>;

    /// Aggregate raw metrics into 1-minute buckets for a given time window.
    /// This processes all distros at once and stores results in metrics_aggregated.
    /// Returns the number of aggregated buckets created.
    async fn aggregate_raw_buckets(
        &self,
        bucket_start: DateTime<Utc>,
        bucket_end: DateTime<Utc>,
    ) -> Result<u64, DomainError>;

    /// Delete raw metrics older than the given timestamp. Returns rows deleted.
    async fn purge_raw_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError>;

    /// Delete aggregated metrics older than the given timestamp. Returns rows deleted.
    async fn purge_aggregated_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError>;
}
