use crate::domain::errors::DomainError;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DistroState {
    Running,
    Stopped,
    Installing,
    Converting,
    Uninstalling,
    Exporting,
}

impl DistroState {
    pub fn from_wsl_output(s: &str) -> Result<Self, DomainError> {
        match s.trim().to_lowercase().as_str() {
            "running" => Ok(Self::Running),
            "stopped" => Ok(Self::Stopped),
            "installing" => Ok(Self::Installing),
            "converting" => Ok(Self::Converting),
            "uninstalling" => Ok(Self::Uninstalling),
            "exporting" => Ok(Self::Exporting),
            other => Err(DomainError::WslCliError(format!(
                "Unknown distro state: {}",
                other
            ))),
        }
    }

    pub fn is_running(&self) -> bool {
        matches!(self, Self::Running)
    }
}

impl fmt::Display for DistroState {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Running => write!(f, "Running"),
            Self::Stopped => write!(f, "Stopped"),
            Self::Installing => write!(f, "Installing"),
            Self::Converting => write!(f, "Converting"),
            Self::Uninstalling => write!(f, "Uninstalling"),
            Self::Exporting => write!(f, "Exporting"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_running() {
        assert_eq!(
            DistroState::from_wsl_output("Running").unwrap(),
            DistroState::Running
        );
    }

    #[test]
    fn test_parse_stopped() {
        assert_eq!(
            DistroState::from_wsl_output("Stopped").unwrap(),
            DistroState::Stopped
        );
    }

    #[test]
    fn test_parse_case_insensitive() {
        assert_eq!(
            DistroState::from_wsl_output("RUNNING").unwrap(),
            DistroState::Running
        );
    }

    #[test]
    fn test_parse_exporting() {
        assert_eq!(
            DistroState::from_wsl_output("Exporting").unwrap(),
            DistroState::Exporting
        );
    }

    #[test]
    fn test_unknown_state_rejected() {
        assert!(DistroState::from_wsl_output("Unknown").is_err());
    }
}
