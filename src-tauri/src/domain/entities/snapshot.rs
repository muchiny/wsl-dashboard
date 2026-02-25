use crate::domain::value_objects::{DistroName, MemorySize, SnapshotId};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Snapshot {
    pub id: SnapshotId,
    pub distro_name: DistroName,
    pub name: String,
    pub description: Option<String>,
    pub snapshot_type: SnapshotType,
    pub format: ExportFormat,
    pub file_path: String,
    pub file_size: MemorySize,
    pub parent_id: Option<SnapshotId>,
    pub created_at: DateTime<Utc>,
    pub status: SnapshotStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SnapshotType {
    Full,
    PseudoIncremental,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Tar,
    TarGz,
    TarXz,
    Vhd,
}

impl ExportFormat {
    pub fn extension(&self) -> &str {
        match self {
            Self::Tar => "tar",
            Self::TarGz => "tar.gz",
            Self::TarXz => "tar.xz",
            Self::Vhd => "vhdx",
        }
    }

    pub fn wsl_flag(&self) -> Option<&str> {
        match self {
            Self::Vhd => Some("--vhd"),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SnapshotStatus {
    InProgress,
    Completed,
    Failed(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RestoreMode {
    Clone { new_name: String },
    Overwrite,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_format_tar_extension() {
        assert_eq!(ExportFormat::Tar.extension(), "tar");
    }

    #[test]
    fn test_export_format_targz_extension() {
        assert_eq!(ExportFormat::TarGz.extension(), "tar.gz");
    }

    #[test]
    fn test_export_format_tarxz_extension() {
        assert_eq!(ExportFormat::TarXz.extension(), "tar.xz");
    }

    #[test]
    fn test_export_format_vhd_extension() {
        assert_eq!(ExportFormat::Vhd.extension(), "vhdx");
    }

    #[test]
    fn test_wsl_flag_vhd_returns_some() {
        assert_eq!(ExportFormat::Vhd.wsl_flag(), Some("--vhd"));
    }

    #[test]
    fn test_wsl_flag_tar_returns_none() {
        assert_eq!(ExportFormat::Tar.wsl_flag(), None);
    }

    #[test]
    fn test_wsl_flag_targz_returns_none() {
        assert_eq!(ExportFormat::TarGz.wsl_flag(), None);
    }

    #[test]
    fn test_wsl_flag_tarxz_returns_none() {
        assert_eq!(ExportFormat::TarXz.wsl_flag(), None);
    }
}
