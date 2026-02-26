use serde::{Deserialize, Serialize};

/// Event emitted when a distro's state changes.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistroStateChangedEvent {
    pub distro_name: String,
    pub new_state: String,
    pub timestamp: String,
}

/// Event emitted during snapshot progress.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotProgressEvent {
    pub snapshot_id: String,
    pub phase: String,
    pub progress_percent: u8,
}

pub const EVENT_DISTRO_STATE_CHANGED: &str = "distro-state-changed";
pub const EVENT_SYSTEM_METRICS: &str = "system-metrics";
pub const EVENT_SNAPSHOT_PROGRESS: &str = "snapshot-progress";
pub const EVENT_ALERT_TRIGGERED: &str = "alert-triggered";
