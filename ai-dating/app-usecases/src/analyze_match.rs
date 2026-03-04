use std::sync::Arc;

use core_domain::entities::{DatingSite, MatchAnalysis, UserPreferences};
use core_domain::error::DomainError;
use core_domain::ports::{DatingProfileRepository, MatchHistoryRepository, RegionStatsRepository};
use core_domain::services::CompatibilityService;
use tracing::info;

/// Use case: analyze a specific match from a dating site.
pub struct AnalyzeMatchUseCase {
    dating_repo: Arc<dyn DatingProfileRepository>,
    region_repo: Arc<dyn RegionStatsRepository>,
    history_repo: Arc<dyn MatchHistoryRepository>,
}

impl AnalyzeMatchUseCase {
    pub fn new(
        dating_repo: Arc<dyn DatingProfileRepository>,
        region_repo: Arc<dyn RegionStatsRepository>,
        history_repo: Arc<dyn MatchHistoryRepository>,
    ) -> Self {
        Self {
            dating_repo,
            region_repo,
            history_repo,
        }
    }

    pub async fn execute(
        &self,
        site: DatingSite,
        match_id: &str,
        prefs: &UserPreferences,
    ) -> Result<MatchAnalysis, DomainError> {
        info!(site = %site, match_id = %match_id, "analyzing match");

        let profile = self.dating_repo.get_profile(site, match_id).await?;

        let region_stats = if let Some(ref code) = profile.region_code {
            self.region_repo.get_region_stats(code).await?
        } else {
            None
        };

        let analysis = CompatibilityService::build_analysis(profile, region_stats, prefs);

        self.history_repo.save_analysis(&analysis).await?;

        info!(
            analysis_id = %analysis.id,
            score = analysis.score.value,
            "match analysis complete"
        );

        Ok(analysis)
    }
}
