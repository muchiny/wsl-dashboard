use async_trait::async_trait;

use crate::domain::entities::snapshot::Snapshot;
use crate::domain::errors::DomainError;
use crate::domain::value_objects::{DistroName, SnapshotId};

#[cfg_attr(test, mockall::automock)]
#[async_trait]
pub trait SnapshotRepositoryPort: Send + Sync {
    /// Save or update snapshot metadata
    async fn save(&self, snapshot: &Snapshot) -> Result<(), DomainError>;

    /// List all snapshots for a given distro
    async fn list_by_distro(&self, distro: &DistroName) -> Result<Vec<Snapshot>, DomainError>;

    /// List all snapshots across all distros
    async fn list_all(&self) -> Result<Vec<Snapshot>, DomainError>;

    /// Get a snapshot by its ID
    async fn get_by_id(&self, id: &SnapshotId) -> Result<Snapshot, DomainError>;

    /// Delete a snapshot's metadata
    async fn delete(&self, id: &SnapshotId) -> Result<(), DomainError>;
}
