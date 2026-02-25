use crate::domain::value_objects::{DistroName, DistroState, MemorySize, WslVersion};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Distro {
    pub name: DistroName,
    pub state: DistroState,
    pub wsl_version: WslVersion,
    pub is_default: bool,
    pub base_path: Option<String>,
    pub vhdx_size: Option<MemorySize>,
    pub last_seen: DateTime<Utc>,
}

impl Distro {
    pub fn new(
        name: DistroName,
        state: DistroState,
        wsl_version: WslVersion,
        is_default: bool,
    ) -> Self {
        Self {
            name,
            state,
            wsl_version,
            is_default,
            base_path: None,
            vhdx_size: None,
            last_seen: Utc::now(),
        }
    }
}
