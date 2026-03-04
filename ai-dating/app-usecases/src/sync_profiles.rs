use std::sync::Arc;

use core_domain::entities::{DatingSite, UserProfile};
use core_domain::error::DomainError;
use core_domain::ports::DatingProfileRepository;
use tracing::info;

/// Use case: sync a batch of profile recommendations from a dating site.
pub struct SyncProfilesUseCase {
    dating_repo: Arc<dyn DatingProfileRepository>,
}

impl SyncProfilesUseCase {
    pub fn new(dating_repo: Arc<dyn DatingProfileRepository>) -> Self {
        Self { dating_repo }
    }

    pub async fn execute(
        &self,
        site: DatingSite,
        limit: usize,
    ) -> Result<Vec<UserProfile>, DomainError> {
        info!(site = %site, limit, "syncing profiles");
        let profiles = self.dating_repo.list_recommendations(site, limit).await?;
        info!(site = %site, count = profiles.len(), "profiles synced");
        Ok(profiles)
    }
}
