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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn alert_type_display() {
        assert_eq!(AlertType::Cpu.to_string(), "cpu");
        assert_eq!(AlertType::Memory.to_string(), "memory");
        assert_eq!(AlertType::Disk.to_string(), "disk");
    }

    #[test]
    fn alert_type_from_str_valid() {
        assert_eq!("cpu".parse::<AlertType>().unwrap(), AlertType::Cpu);
        assert_eq!("memory".parse::<AlertType>().unwrap(), AlertType::Memory);
        assert_eq!("disk".parse::<AlertType>().unwrap(), AlertType::Disk);
    }

    #[test]
    fn alert_type_from_str_invalid() {
        assert!("CPU".parse::<AlertType>().is_err());
        assert!("unknown".parse::<AlertType>().is_err());
        assert!("".parse::<AlertType>().is_err());
        assert!("mem".parse::<AlertType>().is_err());
    }

    #[test]
    fn alert_type_roundtrip() {
        for alert_type in [AlertType::Cpu, AlertType::Memory, AlertType::Disk] {
            let s = alert_type.to_string();
            let parsed: AlertType = s.parse().unwrap();
            assert_eq!(parsed, alert_type);
        }
    }

    #[test]
    fn alert_type_serde_roundtrip() {
        for alert_type in [AlertType::Cpu, AlertType::Memory, AlertType::Disk] {
            let json = serde_json::to_string(&alert_type).unwrap();
            let parsed: AlertType = serde_json::from_str(&json).unwrap();
            assert_eq!(parsed, alert_type);
        }
    }

    #[test]
    fn alert_threshold_serde() {
        let threshold = AlertThreshold {
            alert_type: AlertType::Cpu,
            threshold_percent: 90.0,
            enabled: true,
        };
        let json = serde_json::to_string(&threshold).unwrap();
        let parsed: AlertThreshold = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.alert_type, AlertType::Cpu);
        assert!((parsed.threshold_percent - 90.0).abs() < f64::EPSILON);
        assert!(parsed.enabled);
    }

    #[test]
    fn alert_record_serde() {
        let record = AlertRecord {
            id: 42,
            distro_name: "Ubuntu".to_string(),
            alert_type: AlertType::Memory,
            threshold: 85.0,
            actual_value: 91.5,
            timestamp: Utc::now(),
            acknowledged: false,
        };
        let json = serde_json::to_string(&record).unwrap();
        let parsed: AlertRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.id, 42);
        assert_eq!(parsed.distro_name, "Ubuntu");
        assert_eq!(parsed.alert_type, AlertType::Memory);
        assert!(!parsed.acknowledged);
    }

    mod proptests {
        use super::*;
        use proptest::prelude::*;

        proptest! {
            #[test]
            fn alert_type_from_str_never_panics(s in "\\PC{0,50}") {
                let _ = s.parse::<AlertType>();
            }

            #[test]
            fn alert_type_from_str_only_accepts_known(s in "[a-z]{1,10}") {
                match s.parse::<AlertType>() {
                    Ok(at) => prop_assert!(
                        s == "cpu" || s == "memory" || s == "disk",
                        "Unexpected success for {:?} -> {:?}", s, at
                    ),
                    Err(_) => prop_assert!(s != "cpu" && s != "memory" && s != "disk"),
                }
            }
        }
    }
}
