use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;

use core_domain::entities::{DatingSite, UserProfile};
use core_domain::error::DomainError;
use core_domain::ports::DatingProfileRepository;

/// Routes profile requests to the correct site-specific repository.
pub struct SiteRouterDatingRepository {
    repos: HashMap<DatingSite, Arc<dyn DatingProfileRepository>>,
}

impl SiteRouterDatingRepository {
    pub fn new() -> Self {
        Self {
            repos: HashMap::new(),
        }
    }

    pub fn register(&mut self, site: DatingSite, repo: Arc<dyn DatingProfileRepository>) {
        self.repos.insert(site, repo);
    }
}

impl Default for SiteRouterDatingRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DatingProfileRepository for SiteRouterDatingRepository {
    async fn get_profile(
        &self,
        site: DatingSite,
        match_id: &str,
    ) -> Result<UserProfile, DomainError> {
        let repo = self.repos.get(&site).ok_or_else(|| {
            DomainError::Other(format!("no repository configured for site {site}"))
        })?;
        repo.get_profile(site, match_id).await
    }

    async fn list_recommendations(
        &self,
        site: DatingSite,
        limit: usize,
    ) -> Result<Vec<UserProfile>, DomainError> {
        let repo = self.repos.get(&site).ok_or_else(|| {
            DomainError::Other(format!("no repository configured for site {site}"))
        })?;
        repo.list_recommendations(site, limit).await
    }
}
