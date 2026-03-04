use std::sync::Arc;

use core_domain::entities::RegionStats;
use core_domain::error::DomainError;
use core_domain::ports::{MatchHistoryRepository, RegionStatsRepository};
use tracing::info;

/// Use case: refresh region stats for all codes present in the match history.
pub struct RefreshRegionStatsUseCase {
    region_repo: Arc<dyn RegionStatsRepository>,
    history_repo: Arc<dyn MatchHistoryRepository>,
}

impl RefreshRegionStatsUseCase {
    pub fn new(
        region_repo: Arc<dyn RegionStatsRepository>,
        history_repo: Arc<dyn MatchHistoryRepository>,
    ) -> Self {
        Self {
            region_repo,
            history_repo,
        }
    }

    pub async fn execute(&self) -> Result<Vec<RegionStats>, DomainError> {
        let codes = self.history_repo.list_region_codes().await?;
        info!(count = codes.len(), "refreshing region stats");

        let mut results = Vec::new();
        for code in &codes {
            if let Some(stats) = self.region_repo.get_region_stats(code).await? {
                results.push(stats);
            }
        }

        info!(updated = results.len(), "region stats refreshed");
        Ok(results)
    }
}
