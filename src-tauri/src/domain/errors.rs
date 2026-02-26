use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DomainError {
    #[error("Distribution not found: {0}")]
    DistroNotFound(String),

    #[error("Distribution is not running: {0}")]
    DistroNotRunning(String),

    #[error("Distribution is already running: {0}")]
    DistroAlreadyRunning(String),

    #[error("Invalid distro name: {0}")]
    InvalidDistroName(String),

    #[error("Snapshot not found: {0}")]
    SnapshotNotFound(String),

    #[error("Snapshot operation failed: {0}")]
    SnapshotError(String),

    #[error("WSL CLI error: {0}")]
    WslCliError(String),

    #[error("Monitoring error: {0}")]
    MonitoringError(String),

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("IO error: {0}")]
    IoError(String),

    #[error("Internal error: {0}")]
    Internal(String),
}

impl Serialize for DomainError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<std::io::Error> for DomainError {
    fn from(err: std::io::Error) -> Self {
        DomainError::IoError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_serialize_distro_not_found() {
        let err = DomainError::DistroNotFound("Ubuntu".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("Distribution not found: Ubuntu"));
    }

    #[test]
    fn test_serialize_snapshot_error() {
        let err = DomainError::SnapshotError("disk full".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert!(json.contains("disk full"));
    }

    #[test]
    fn test_from_io_error() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file missing");
        let domain_err = DomainError::from(io_err);
        match domain_err {
            DomainError::IoError(msg) => assert!(msg.contains("file missing")),
            other => panic!("Expected IoError, got: {:?}", other),
        }
    }

    #[test]
    fn test_display_all_variants() {
        // Verify each variant formats correctly via thiserror
        assert_eq!(
            DomainError::DistroNotRunning("X".into()).to_string(),
            "Distribution is not running: X"
        );
        assert_eq!(
            DomainError::DistroAlreadyRunning("X".into()).to_string(),
            "Distribution is already running: X"
        );
        assert_eq!(
            DomainError::InvalidDistroName("".into()).to_string(),
            "Invalid distro name: "
        );
        assert_eq!(
            DomainError::WslCliError("timeout".into()).to_string(),
            "WSL CLI error: timeout"
        );
        assert_eq!(
            DomainError::MonitoringError("x".into()).to_string(),
            "Monitoring error: x"
        );
        assert_eq!(
            DomainError::DatabaseError("x".into()).to_string(),
            "Database error: x"
        );
        assert_eq!(
            DomainError::ConfigError("x".into()).to_string(),
            "Configuration error: x"
        );
        assert_eq!(
            DomainError::Internal("x".into()).to_string(),
            "Internal error: x"
        );
    }
}
