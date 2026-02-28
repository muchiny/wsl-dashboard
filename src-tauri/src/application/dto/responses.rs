use crate::domain::entities::distro::Distro;
use crate::domain::entities::snapshot::Snapshot;
use crate::domain::entities::wsl_config::WslDistroConfig;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistroResponse {
    pub name: String,
    pub state: String,
    pub wsl_version: u8,
    pub is_default: bool,
    pub base_path: Option<String>,
    pub vhdx_size_bytes: Option<u64>,
    pub last_seen: String,
}

impl From<Distro> for DistroResponse {
    fn from(d: Distro) -> Self {
        Self {
            name: d.name.to_string(),
            state: d.state.to_string(),
            wsl_version: d.wsl_version.as_u8(),
            is_default: d.is_default,
            base_path: d.base_path,
            vhdx_size_bytes: d.vhdx_size.map(|s| s.bytes()),
            last_seen: d.last_seen.to_rfc3339(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DistroDetailResponse {
    pub name: String,
    pub state: String,
    pub wsl_version: u8,
    pub is_default: bool,
    pub base_path: Option<String>,
    pub vhdx_size_bytes: Option<u64>,
    pub distro_config: Option<WslDistroConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotResponse {
    pub id: String,
    pub distro_name: String,
    pub name: String,
    pub description: Option<String>,
    pub snapshot_type: String,
    pub format: String,
    pub file_path: String,
    pub file_size_bytes: u64,
    pub parent_id: Option<String>,
    pub created_at: String,
    pub status: String,
}

impl From<Snapshot> for SnapshotResponse {
    fn from(s: Snapshot) -> Self {
        let status = match &s.status {
            crate::domain::entities::snapshot::SnapshotStatus::InProgress => {
                "in_progress".to_string()
            }
            crate::domain::entities::snapshot::SnapshotStatus::Completed => "completed".to_string(),
            crate::domain::entities::snapshot::SnapshotStatus::Failed(reason) => {
                format!("failed: {}", reason)
            }
        };
        let snapshot_type = match s.snapshot_type {
            crate::domain::entities::snapshot::SnapshotType::Full => "full".to_string(),
            crate::domain::entities::snapshot::SnapshotType::PseudoIncremental => {
                "incremental".to_string()
            }
        };
        Self {
            id: s.id.to_string(),
            distro_name: s.distro_name.to_string(),
            name: s.name,
            description: s.description,
            snapshot_type,
            format: s.format.extension().to_string(),
            file_path: s.file_path,
            file_size_bytes: s.file_size.bytes(),
            parent_id: s.parent_id.map(|id| id.to_string()),
            created_at: s.created_at.to_rfc3339(),
            status,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
    use crate::domain::value_objects::distro_name::DistroName;
    use crate::domain::value_objects::distro_state::DistroState;
    use crate::domain::value_objects::memory_size::MemorySize;
    use crate::domain::value_objects::snapshot_id::SnapshotId;
    use crate::domain::value_objects::wsl_version::WslVersion;
    use chrono::Utc;

    fn make_test_distro(is_default: bool, vhdx: Option<u64>) -> Distro {
        let mut d = Distro::new(
            DistroName::new("Ubuntu").unwrap(),
            DistroState::Running,
            WslVersion::V2,
            is_default,
        );
        d.vhdx_size = vhdx.map(MemorySize::from_bytes);
        d
    }

    fn make_test_snapshot(status: SnapshotStatus, stype: SnapshotType) -> Snapshot {
        Snapshot {
            id: SnapshotId::from_string("snap-001".into()),
            distro_name: DistroName::new("Ubuntu").unwrap(),
            name: "backup".into(),
            description: Some("test desc".into()),
            snapshot_type: stype,
            format: ExportFormat::Tar,
            file_path: "/tmp/backup.tar".into(),
            file_size: MemorySize::from_bytes(1_048_576),
            parent_id: Some(SnapshotId::from_string("parent-001".into())),
            created_at: Utc::now(),
            status,
        }
    }

    // --- DistroResponse tests ---

    #[test]
    fn test_distro_response_name_state_version() {
        let resp = DistroResponse::from(make_test_distro(true, None));
        assert_eq!(resp.name, "Ubuntu");
        assert_eq!(resp.state, "Running");
        assert_eq!(resp.wsl_version, 2);
    }

    #[test]
    fn test_distro_response_is_default() {
        let resp = DistroResponse::from(make_test_distro(true, None));
        assert!(resp.is_default);
        let resp2 = DistroResponse::from(make_test_distro(false, None));
        assert!(!resp2.is_default);
    }

    #[test]
    fn test_distro_response_vhdx_size_none() {
        let resp = DistroResponse::from(make_test_distro(false, None));
        assert!(resp.vhdx_size_bytes.is_none());
    }

    #[test]
    fn test_distro_response_vhdx_size_some() {
        let resp = DistroResponse::from(make_test_distro(false, Some(4096)));
        assert_eq!(resp.vhdx_size_bytes, Some(4096));
    }

    #[test]
    fn test_distro_response_last_seen_rfc3339() {
        let resp = DistroResponse::from(make_test_distro(false, None));
        // RFC3339 dates contain 'T' and '+' or 'Z'
        assert!(resp.last_seen.contains('T'));
    }

    // --- SnapshotResponse tests ---

    #[test]
    fn test_snapshot_response_completed() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::Full,
        ));
        assert_eq!(resp.status, "completed");
    }

    #[test]
    fn test_snapshot_response_in_progress() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::InProgress,
            SnapshotType::Full,
        ));
        assert_eq!(resp.status, "in_progress");
    }

    #[test]
    fn test_snapshot_response_failed() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Failed("disk full".into()),
            SnapshotType::Full,
        ));
        assert_eq!(resp.status, "failed: disk full");
    }

    #[test]
    fn test_snapshot_response_type_full() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::Full,
        ));
        assert_eq!(resp.snapshot_type, "full");
    }

    #[test]
    fn test_snapshot_response_type_incremental() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::PseudoIncremental,
        ));
        assert_eq!(resp.snapshot_type, "incremental");
    }

    #[test]
    fn test_snapshot_response_format_extension() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::Full,
        ));
        assert_eq!(resp.format, "tar");
    }

    #[test]
    fn test_snapshot_response_file_size() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::Full,
        ));
        assert_eq!(resp.file_size_bytes, 1_048_576);
    }

    #[test]
    fn test_snapshot_response_parent_id() {
        let resp = SnapshotResponse::from(make_test_snapshot(
            SnapshotStatus::Completed,
            SnapshotType::Full,
        ));
        assert_eq!(resp.parent_id, Some("parent-001".to_string()));
    }

    #[test]
    fn test_snapshot_response_parent_id_none() {
        let mut snap = make_test_snapshot(SnapshotStatus::Completed, SnapshotType::Full);
        snap.parent_id = None;
        let resp = SnapshotResponse::from(snap);
        assert!(resp.parent_id.is_none());
    }
}
