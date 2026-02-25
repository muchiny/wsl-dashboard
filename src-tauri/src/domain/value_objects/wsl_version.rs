use crate::domain::errors::DomainError;
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WslVersion {
    V1,
    V2,
}

impl WslVersion {
    pub fn from_str_version(s: &str) -> Result<Self, DomainError> {
        match s.trim() {
            "1" => Ok(Self::V1),
            "2" => Ok(Self::V2),
            other => Err(DomainError::WslCliError(format!(
                "Unknown WSL version: {}",
                other
            ))),
        }
    }

    pub fn as_u8(&self) -> u8 {
        match self {
            Self::V1 => 1,
            Self::V2 => 2,
        }
    }
}

impl fmt::Display for WslVersion {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::V1 => write!(f, "1"),
            Self::V2 => write!(f, "2"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_v1() {
        assert_eq!(WslVersion::from_str_version("1").unwrap(), WslVersion::V1);
    }

    #[test]
    fn test_parse_v2() {
        assert_eq!(WslVersion::from_str_version("2").unwrap(), WslVersion::V2);
    }
}
