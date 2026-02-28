use std::sync::Arc;

use crate::application::dto::responses::SnapshotResponse;
use crate::domain::errors::DomainError;
use crate::domain::ports::snapshot_repository::SnapshotRepositoryPort;
use crate::domain::value_objects::DistroName;

pub struct ListSnapshotsHandler {
    snapshot_repo: Arc<dyn SnapshotRepositoryPort>,
}

impl ListSnapshotsHandler {
    pub fn new(snapshot_repo: Arc<dyn SnapshotRepositoryPort>) -> Self {
        Self { snapshot_repo }
    }

    pub async fn handle(
        &self,
        distro_name: Option<DistroName>,
    ) -> Result<Vec<SnapshotResponse>, DomainError> {
        let snapshots = match distro_name {
            Some(name) => self.snapshot_repo.list_by_distro(&name).await?,
            None => self.snapshot_repo.list_all().await?,
        };
        Ok(snapshots.into_iter().map(SnapshotResponse::from).collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::entities::snapshot::{ExportFormat, Snapshot, SnapshotStatus, SnapshotType};
    use crate::domain::ports::snapshot_repository::MockSnapshotRepositoryPort;
    use crate::domain::value_objects::{MemorySize, SnapshotId};
    use chrono::Utc;

    fn make_snapshot(distro: &str) -> Snapshot {
        Snapshot {
            id: SnapshotId::new(),
            distro_name: DistroName::new(distro).unwrap(),
            name: "test".into(),
            description: None,
            snapshot_type: SnapshotType::Full,
            format: ExportFormat::Tar,
            file_path: "/tmp/test.tar".into(),
            file_size: MemorySize::from_bytes(1024),
            parent_id: None,
            created_at: Utc::now(),
            status: SnapshotStatus::Completed,
        }
    }

    #[tokio::test]
    async fn test_handle_no_filter_calls_list_all() {
        let mut mock = MockSnapshotRepositoryPort::new();
        mock.expect_list_all()
            .returning(|| Ok(vec![make_snapshot("Ubuntu")]));

        let handler = ListSnapshotsHandler::new(Arc::new(mock));
        let result = handler.handle(None).await.unwrap();
        assert_eq!(result.len(), 1);
    }

    #[tokio::test]
    async fn test_handle_with_filter_calls_by_distro() {
        let mut mock = MockSnapshotRepositoryPort::new();
        mock.expect_list_by_distro()
            .returning(|_| Ok(vec![make_snapshot("Ubuntu")]));

        let handler = ListSnapshotsHandler::new(Arc::new(mock));
        let name = DistroName::new("Ubuntu").unwrap();
        let result = handler.handle(Some(name)).await.unwrap();
        assert_eq!(result.len(), 1);
    }

    #[tokio::test]
    async fn test_handle_returns_mapped_responses() {
        let mut mock = MockSnapshotRepositoryPort::new();
        mock.expect_list_all()
            .returning(|| Ok(vec![make_snapshot("Ubuntu")]));

        let handler = ListSnapshotsHandler::new(Arc::new(mock));
        let result = handler.handle(None).await.unwrap();
        assert_eq!(result[0].status, "completed");
        assert_eq!(result[0].snapshot_type, "full");
    }
}
