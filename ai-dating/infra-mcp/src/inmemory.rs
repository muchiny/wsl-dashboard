use std::collections::HashMap;
use std::sync::Mutex;

use async_trait::async_trait;

use core_domain::entities::{
    DatingSite, InferredTraits, MatchAnalysis, RegionCode, RegionStats, UserProfile,
};
use core_domain::error::DomainError;
use core_domain::ports::{DatingProfileRepository, MatchHistoryRepository, RegionStatsRepository};

/// In-memory stub for DatingProfileRepository (for testing / sprint 2).
pub struct InMemoryDatingRepository {
    profiles: HashMap<(DatingSite, String), UserProfile>,
}

impl InMemoryDatingRepository {
    pub fn new() -> Self {
        let mut profiles = HashMap::new();
        // Seed a test profile
        profiles.insert(
            (DatingSite::Tinder, "demo-1".into()),
            UserProfile {
                id: "demo-1".into(),
                site: DatingSite::Tinder,
                display_name: "Marie".into(),
                age: Some(27),
                city: Some("Lyon".into()),
                region_code: Some(RegionCode::new("69")),
                bio: Some("Passionnée de randonnée et de cuisine".into()),
                photos: vec![],
                traits: InferredTraits {
                    extraversion: 0.65,
                    agreeableness: 0.8,
                    conscientiousness: 0.7,
                    neuroticism: 0.25,
                    openness: 0.85,
                    seriousness_score: 0.7,
                },
            },
        );
        Self { profiles }
    }
}

impl Default for InMemoryDatingRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl DatingProfileRepository for InMemoryDatingRepository {
    async fn get_profile(
        &self,
        site: DatingSite,
        match_id: &str,
    ) -> Result<UserProfile, DomainError> {
        self.profiles
            .get(&(site, match_id.to_string()))
            .cloned()
            .ok_or_else(|| DomainError::ProfileNotFound {
                site: site.as_str().to_string(),
                id: match_id.to_string(),
            })
    }

    async fn list_recommendations(
        &self,
        site: DatingSite,
        limit: usize,
    ) -> Result<Vec<UserProfile>, DomainError> {
        Ok(self
            .profiles
            .values()
            .filter(|p| p.site == site)
            .take(limit)
            .cloned()
            .collect())
    }
}

/// In-memory stub for RegionStatsRepository.
pub struct InMemoryRegionStatsRepository {
    stats: HashMap<String, RegionStats>,
}

impl InMemoryRegionStatsRepository {
    pub fn new() -> Self {
        let mut stats = HashMap::new();
        stats.insert(
            "69".into(),
            RegionStats {
                code: RegionCode::new("69"),
                name: "Rhône".into(),
                population: Some(1_876_000),
                median_income: Some(23_500.0),
                poverty_rate: Some(0.14),
                unemployment_rate: Some(0.09),
                updated_at: chrono::Utc::now(),
            },
        );
        Self { stats }
    }
}

impl Default for InMemoryRegionStatsRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl RegionStatsRepository for InMemoryRegionStatsRepository {
    async fn get_region_stats(
        &self,
        code: &RegionCode,
    ) -> Result<Option<RegionStats>, DomainError> {
        Ok(self.stats.get(code.as_str()).cloned())
    }
}

/// In-memory stub for MatchHistoryRepository.
pub struct InMemoryMatchHistoryRepository {
    analyses: Mutex<Vec<MatchAnalysis>>,
}

impl InMemoryMatchHistoryRepository {
    pub fn new() -> Self {
        Self {
            analyses: Mutex::new(Vec::new()),
        }
    }
}

impl Default for InMemoryMatchHistoryRepository {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl MatchHistoryRepository for InMemoryMatchHistoryRepository {
    async fn save_analysis(&self, analysis: &MatchAnalysis) -> Result<(), DomainError> {
        self.analyses
            .lock()
            .map_err(|e| DomainError::Other(e.to_string()))?
            .push(analysis.clone());
        Ok(())
    }

    async fn list_analyses(&self, limit: usize) -> Result<Vec<MatchAnalysis>, DomainError> {
        let guard = self
            .analyses
            .lock()
            .map_err(|e| DomainError::Other(e.to_string()))?;
        Ok(guard.iter().take(limit).cloned().collect())
    }

    async fn list_region_codes(&self) -> Result<Vec<RegionCode>, DomainError> {
        let guard = self
            .analyses
            .lock()
            .map_err(|e| DomainError::Other(e.to_string()))?;
        let codes: Vec<RegionCode> = guard
            .iter()
            .filter_map(|a| a.profile.region_code.clone())
            .collect();
        Ok(codes)
    }
}
