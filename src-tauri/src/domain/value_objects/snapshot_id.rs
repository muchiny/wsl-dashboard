use serde::{Deserialize, Serialize};
use std::fmt;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct SnapshotId(String);

impl SnapshotId {
    pub fn new() -> Self {
        Self(Uuid::new_v4().to_string())
    }

    pub fn from_string(id: String) -> Self {
        Self(id)
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl Default for SnapshotId {
    fn default() -> Self {
        Self::new()
    }
}

impl fmt::Display for SnapshotId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_generates_uuid_format() {
        let id = SnapshotId::new();
        let s = id.as_str();
        assert!(!s.is_empty());
        // UUID v4 format: 8-4-4-4-12 hex chars
        assert!(
            Uuid::parse_str(s).is_ok(),
            "Expected valid UUID, got: {}",
            s
        );
    }

    #[test]
    fn test_from_string_preserves_value() {
        let id = SnapshotId::from_string("my-custom-id".to_string());
        assert_eq!(id.as_str(), "my-custom-id");
    }

    #[test]
    fn test_display_matches_inner() {
        let id = SnapshotId::from_string("display-test".to_string());
        assert_eq!(format!("{}", id), "display-test");
    }

    #[test]
    fn test_default_generates_new_id() {
        let id = SnapshotId::default();
        assert!(!id.as_str().is_empty());
        assert!(Uuid::parse_str(id.as_str()).is_ok());
    }

    #[test]
    fn test_equality() {
        let a = SnapshotId::from_string("same".to_string());
        let b = SnapshotId::from_string("same".to_string());
        assert_eq!(a, b);
    }

    #[test]
    fn test_inequality() {
        let a = SnapshotId::new();
        let b = SnapshotId::new();
        assert_ne!(a, b);
    }
}
