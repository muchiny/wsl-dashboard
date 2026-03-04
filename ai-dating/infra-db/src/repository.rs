use async_trait::async_trait;
use sqlx::PgPool;
use tracing::debug;

use core_domain::entities::{MatchAnalysis, RegionCode};
use core_domain::error::DomainError;
use core_domain::ports::MatchHistoryRepository;

/// PostgreSQL-backed match history repository.
pub struct SqlxMatchHistoryRepository {
    pool: PgPool,
}

impl SqlxMatchHistoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl MatchHistoryRepository for SqlxMatchHistoryRepository {
    async fn save_analysis(&self, analysis: &MatchAnalysis) -> Result<(), DomainError> {
        debug!(id = %analysis.id, "saving analysis to database");

        let profile_json =
            serde_json::to_value(&analysis.profile).map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let region_json = analysis
            .region_stats
            .as_ref()
            .map(|s| serde_json::to_value(s))
            .transpose()
            .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        sqlx::query(
            r#"
            INSERT INTO matches (id, site, profile_json, region_stats_json, score_value, score_confidence, score_summary, advice, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (id) DO UPDATE SET
                profile_json = EXCLUDED.profile_json,
                region_stats_json = EXCLUDED.region_stats_json,
                score_value = EXCLUDED.score_value,
                score_confidence = EXCLUDED.score_confidence,
                score_summary = EXCLUDED.score_summary,
                advice = EXCLUDED.advice
            "#,
        )
        .bind(analysis.id.to_string())
        .bind(analysis.profile.site.as_str())
        .bind(&profile_json)
        .bind(&region_json)
        .bind(analysis.score.value)
        .bind(analysis.score.confidence)
        .bind(&analysis.score.summary)
        .bind(&analysis.advice)
        .bind(analysis.created_at)
        .execute(&self.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    async fn list_analyses(&self, limit: usize) -> Result<Vec<MatchAnalysis>, DomainError> {
        let rows: Vec<(String, serde_json::Value, Option<serde_json::Value>, f64, f64, String, String, chrono::DateTime<chrono::Utc>)> = sqlx::query_as(
            r#"
            SELECT id, profile_json, region_stats_json, score_value, score_confidence, score_summary, advice, created_at
            FROM matches
            ORDER BY created_at DESC
            LIMIT $1
            "#,
        )
        .bind(limit as i64)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        let mut results = Vec::new();
        for (id, profile_json, region_json, score_value, score_confidence, score_summary, advice, created_at) in rows {
            let profile = serde_json::from_value(profile_json)
                .map_err(|e| DomainError::DatabaseError(e.to_string()))?;
            let region_stats = region_json
                .map(|j| serde_json::from_value(j))
                .transpose()
                .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

            results.push(MatchAnalysis {
                id: id.parse().map_err(|e: uuid::Error| DomainError::DatabaseError(e.to_string()))?,
                profile,
                region_stats,
                score: core_domain::entities::CompatibilityScore {
                    value: score_value,
                    confidence: score_confidence,
                    summary: score_summary,
                },
                advice,
                created_at,
            });
        }

        Ok(results)
    }

    async fn list_region_codes(&self) -> Result<Vec<RegionCode>, DomainError> {
        let rows: Vec<(String,)> = sqlx::query_as(
            r#"
            SELECT DISTINCT profile_json->>'region_code' as code
            FROM matches
            WHERE profile_json->>'region_code' IS NOT NULL
            "#,
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DomainError::DatabaseError(e.to_string()))?;

        Ok(rows.into_iter().map(|(code,)| RegionCode::new(code)).collect())
    }
}
