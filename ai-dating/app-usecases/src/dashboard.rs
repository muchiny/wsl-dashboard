use std::collections::HashMap;
use std::sync::Arc;

use core_domain::entities::MatchAnalysis;
use core_domain::error::DomainError;
use core_domain::ports::MatchHistoryRepository;
use serde::Serialize;
use tracing::info;

/// Dashboard statistics DTO.
#[derive(Debug, Clone, Serialize)]
pub struct DashboardStats {
    pub total_analyses: usize,
    pub average_score: f64,
    pub by_site: HashMap<String, SiteStats>,
    pub by_region: HashMap<String, RegionAggregation>,
}

#[derive(Debug, Clone, Serialize)]
pub struct SiteStats {
    pub count: usize,
    pub average_score: f64,
}

#[derive(Debug, Clone, Serialize)]
pub struct RegionAggregation {
    pub region_name: String,
    pub count: usize,
    pub average_score: f64,
}

/// Use case: produce dashboard statistics from stored analyses.
pub struct GetDashboardStatsUseCase {
    history_repo: Arc<dyn MatchHistoryRepository>,
}

impl GetDashboardStatsUseCase {
    pub fn new(history_repo: Arc<dyn MatchHistoryRepository>) -> Self {
        Self { history_repo }
    }

    pub async fn execute(&self) -> Result<DashboardStats, DomainError> {
        let analyses = self.history_repo.list_analyses(1000).await?;
        info!(count = analyses.len(), "computing dashboard stats");
        Ok(Self::aggregate(&analyses))
    }

    fn aggregate(analyses: &[MatchAnalysis]) -> DashboardStats {
        let total = analyses.len();
        let avg = if total > 0 {
            analyses.iter().map(|a| a.score.value).sum::<f64>() / total as f64
        } else {
            0.0
        };

        let mut by_site: HashMap<String, (usize, f64)> = HashMap::new();
        let mut by_region: HashMap<String, (String, usize, f64)> = HashMap::new();

        for a in analyses {
            let site_key = a.profile.site.as_str().to_string();
            let entry = by_site.entry(site_key).or_insert((0, 0.0));
            entry.0 += 1;
            entry.1 += a.score.value;

            if let Some(ref stats) = a.region_stats {
                let code = stats.code.as_str().to_string();
                let entry = by_region
                    .entry(code)
                    .or_insert_with(|| (stats.name.clone(), 0, 0.0));
                entry.1 += 1;
                entry.2 += a.score.value;
            }
        }

        DashboardStats {
            total_analyses: total,
            average_score: avg,
            by_site: by_site
                .into_iter()
                .map(|(k, (count, sum))| {
                    (
                        k,
                        SiteStats {
                            count,
                            average_score: if count > 0 {
                                sum / count as f64
                            } else {
                                0.0
                            },
                        },
                    )
                })
                .collect(),
            by_region: by_region
                .into_iter()
                .map(|(k, (name, count, sum))| {
                    (
                        k,
                        RegionAggregation {
                            region_name: name,
                            count,
                            average_score: if count > 0 {
                                sum / count as f64
                            } else {
                                0.0
                            },
                        },
                    )
                })
                .collect(),
        }
    }
}
