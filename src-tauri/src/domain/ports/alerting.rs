use async_trait::async_trait;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::domain::errors::DomainError;
use crate::domain::value_objects::DistroName;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AlertType {
    Cpu,
    Memory,
    Disk,
}

impl std::fmt::Display for AlertType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlertType::Cpu => write!(f, "cpu"),
            AlertType::Memory => write!(f, "memory"),
            AlertType::Disk => write!(f, "disk"),
        }
    }
}

impl std::str::FromStr for AlertType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "cpu" => Ok(AlertType::Cpu),
            "memory" => Ok(AlertType::Memory),
            "disk" => Ok(AlertType::Disk),
            _ => Err(format!("Unknown alert type: {s}")),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertThreshold {
    pub alert_type: AlertType,
    pub threshold_percent: f64,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertRecord {
    pub id: i64,
    pub distro_name: String,
    pub alert_type: AlertType,
    pub threshold: f64,
    pub actual_value: f64,
    pub timestamp: DateTime<Utc>,
    pub acknowledged: bool,
}

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait AlertingPort: Send + Sync {
    /// Record a triggered alert.
    async fn record_alert(
        &self,
        distro: &DistroName,
        alert_type: AlertType,
        threshold: f64,
        actual_value: f64,
    ) -> Result<(), DomainError>;

    /// Fetch recent alerts for a distro.
    async fn get_recent_alerts(
        &self,
        distro: &DistroName,
        limit: u32,
    ) -> Result<Vec<AlertRecord>, DomainError>;

    /// Acknowledge an alert by ID.
    async fn acknowledge_alert(&self, alert_id: i64) -> Result<(), DomainError>;

    /// Purge old alerts. Returns rows deleted.
    async fn purge_before(&self, before: DateTime<Utc>) -> Result<u64, DomainError>;
}
