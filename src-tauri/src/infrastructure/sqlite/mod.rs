pub mod adapter;
pub mod alert_repository;
pub mod metrics_repository;
pub mod port_forwarding_repository;

use crate::domain::errors::DomainError;

/// Extension trait to convert sqlx errors to DomainError with `?` operator.
pub(crate) trait SqlxResultExt<T> {
    fn db_err(self) -> Result<T, DomainError>;
}

impl<T> SqlxResultExt<T> for Result<T, sqlx::Error> {
    fn db_err(self) -> Result<T, DomainError> {
        self.map_err(|e| DomainError::DatabaseError(e.to_string()))
    }
}
