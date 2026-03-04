use async_trait::async_trait;

use crate::entities::{DatingSite, MatchAnalysis, RegionCode, RegionStats, UserProfile};
use crate::error::DomainError;

/// Port for retrieving dating profiles from external sites (via MCP).
#[async_trait]
pub trait DatingProfileRepository: Send + Sync {
    async fn get_profile(
        &self,
        site: DatingSite,
        match_id: &str,
    ) -> Result<UserProfile, DomainError>;

    async fn list_recommendations(
        &self,
        site: DatingSite,
        limit: usize,
    ) -> Result<Vec<UserProfile>, DomainError>;
}

/// Port for retrieving regional socio-economic stats (INSEE / data.gouv).
#[async_trait]
pub trait RegionStatsRepository: Send + Sync {
    async fn get_region_stats(
        &self,
        code: &RegionCode,
    ) -> Result<Option<RegionStats>, DomainError>;
}

/// Port for persisting match analyses.
#[async_trait]
pub trait MatchHistoryRepository: Send + Sync {
    async fn save_analysis(&self, analysis: &MatchAnalysis) -> Result<(), DomainError>;

    async fn list_analyses(&self, limit: usize) -> Result<Vec<MatchAnalysis>, DomainError>;

    async fn list_region_codes(&self) -> Result<Vec<RegionCode>, DomainError>;
}
