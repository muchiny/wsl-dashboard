use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct WslVersionInfo {
    pub wsl_version: Option<String>,
    pub kernel_version: Option<String>,
    pub wslg_version: Option<String>,
    pub windows_version: Option<String>,
}
