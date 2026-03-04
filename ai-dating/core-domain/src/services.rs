use crate::entities::{
    CompatibilityScore, MatchAnalysis, RegionStats, RelationshipType, UserPreferences, UserProfile,
};
use chrono::Utc;
use uuid::Uuid;

/// Pure domain service: computes compatibility scores and builds analyses.
pub struct CompatibilityService;

impl CompatibilityService {
    /// Compute a compatibility score from profile, optional region stats, and user preferences.
    pub fn compute_score(
        profile: &UserProfile,
        region_stats: Option<&RegionStats>,
        prefs: &UserPreferences,
    ) -> CompatibilityScore {
        let mut score: f64 = 0.0;
        let mut weight_sum: f64 = 0.0;

        // --- Age compatibility (weight: 2.0) ---
        if let Some(age) = profile.age {
            let age_ok = prefs.age_min.map_or(true, |min| age >= min)
                && prefs.age_max.map_or(true, |max| age <= max);
            let age_score = if age_ok { 1.0 } else { 0.2 };
            score += age_score * 2.0;
            weight_sum += 2.0;
        }

        // --- Traits compatibility (weight: 3.0 total) ---
        let traits = &profile.traits;

        // Agreeableness check
        if let Some(min_a) = prefs.min_agreeableness {
            let a_score = if traits.agreeableness >= min_a {
                1.0
            } else {
                traits.agreeableness / min_a.max(0.01)
            };
            score += a_score;
            weight_sum += 1.0;
        }

        // Neuroticism check (lower is better)
        if let Some(max_n) = prefs.max_neuroticism {
            let n_score = if traits.neuroticism <= max_n {
                1.0
            } else {
                max_n / traits.neuroticism.max(0.01)
            };
            score += n_score;
            weight_sum += 1.0;
        }

        // Seriousness alignment
        match prefs.relationship_type {
            RelationshipType::Serious => {
                let s = traits.seriousness_score;
                score += s;
                weight_sum += 1.0;
            }
            RelationshipType::Casual => {
                let s = 1.0 - traits.seriousness_score;
                score += s;
                weight_sum += 1.0;
            }
            RelationshipType::Any => {}
        }

        // Min seriousness threshold
        if let Some(min_s) = prefs.min_seriousness {
            let s_score = if traits.seriousness_score >= min_s {
                1.0
            } else {
                traits.seriousness_score / min_s.max(0.01)
            };
            score += s_score;
            weight_sum += 1.0;
        }

        // --- General trait quality (weight: 1.0) ---
        let trait_avg = (traits.extraversion
            + traits.agreeableness
            + traits.conscientiousness
            + (1.0 - traits.neuroticism)
            + traits.openness)
            / 5.0;
        score += trait_avg;
        weight_sum += 1.0;

        // --- Region socio-economic bonus (weight: 1.0) ---
        if let Some(stats) = region_stats {
            let mut region_score = 0.5; // neutral baseline
            if let Some(rate) = stats.unemployment_rate {
                // Lower unemployment → higher score
                region_score += (1.0 - rate.clamp(0.0, 1.0)) * 0.25;
            }
            if let Some(rate) = stats.poverty_rate {
                region_score += (1.0 - rate.clamp(0.0, 1.0)) * 0.25;
            }
            score += region_score.clamp(0.0, 1.0);
            weight_sum += 1.0;
        }

        let final_score = if weight_sum > 0.0 {
            (score / weight_sum).clamp(0.0, 1.0)
        } else {
            0.5
        };

        let confidence = (weight_sum / 8.0).clamp(0.0, 1.0);

        let summary = Self::generate_summary(final_score, profile, region_stats);

        CompatibilityScore {
            value: final_score,
            confidence,
            summary,
        }
    }

    /// Build a full MatchAnalysis from profile + region stats + preferences.
    pub fn build_analysis(
        profile: UserProfile,
        region_stats: Option<RegionStats>,
        prefs: &UserPreferences,
    ) -> MatchAnalysis {
        let score = Self::compute_score(&profile, region_stats.as_ref(), prefs);
        let advice = Self::generate_advice(&score, &profile, region_stats.as_ref());

        MatchAnalysis {
            id: Uuid::new_v4(),
            profile,
            region_stats,
            score,
            advice,
            created_at: Utc::now(),
        }
    }

    fn generate_summary(
        score: f64,
        profile: &UserProfile,
        region_stats: Option<&RegionStats>,
    ) -> String {
        let level = match score {
            s if s >= 0.8 => "Excellent",
            s if s >= 0.6 => "Good",
            s if s >= 0.4 => "Average",
            _ => "Low",
        };

        let region_info = region_stats
            .map(|r| format!(" (region: {})", r.name))
            .unwrap_or_default();

        format!(
            "{level} compatibility with {name}{region_info}",
            name = profile.display_name,
        )
    }

    fn generate_advice(
        score: &CompatibilityScore,
        profile: &UserProfile,
        region_stats: Option<&RegionStats>,
    ) -> String {
        let mut parts = Vec::new();

        if score.value >= 0.7 {
            parts.push(format!(
                "Strong match with {}. Consider engaging in a conversation.",
                profile.display_name
            ));
        } else if score.value >= 0.4 {
            parts.push(format!(
                "Moderate compatibility with {}. Worth exploring but manage expectations.",
                profile.display_name
            ));
        } else {
            parts.push(format!(
                "Low compatibility with {}. Significant differences detected.",
                profile.display_name
            ));
        }

        if profile.traits.seriousness_score < 0.3 {
            parts.push("This profile leans casual — don't expect long-term commitment signals.".into());
        } else if profile.traits.seriousness_score > 0.7 {
            parts.push("This profile signals serious relationship intent.".into());
        }

        if let Some(stats) = region_stats {
            if let Some(rate) = stats.unemployment_rate {
                if rate > 0.15 {
                    parts.push(format!(
                        "Note: {} has a high unemployment rate ({:.1}%). Economic context may affect lifestyle expectations.",
                        stats.name,
                        rate * 100.0,
                    ));
                }
            }
        }

        parts.join(" ")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::entities::{DatingSite, InferredTraits, RegionCode};

    fn make_profile() -> UserProfile {
        UserProfile {
            id: "test-1".into(),
            site: DatingSite::Tinder,
            display_name: "Alice".into(),
            age: Some(28),
            city: Some("Paris".into()),
            region_code: Some(RegionCode::new("75")),
            bio: Some("Loves hiking".into()),
            photos: vec![],
            traits: InferredTraits {
                extraversion: 0.7,
                agreeableness: 0.8,
                conscientiousness: 0.6,
                neuroticism: 0.3,
                openness: 0.9,
                seriousness_score: 0.75,
            },
        }
    }

    fn make_prefs() -> UserPreferences {
        UserPreferences {
            age_min: Some(25),
            age_max: Some(35),
            relationship_type: RelationshipType::Serious,
            min_seriousness: Some(0.5),
            ..Default::default()
        }
    }

    #[test]
    fn test_score_within_bounds() {
        let profile = make_profile();
        let prefs = make_prefs();
        let score = CompatibilityService::compute_score(&profile, None, &prefs);
        assert!(score.value >= 0.0 && score.value <= 1.0);
        assert!(score.confidence >= 0.0 && score.confidence <= 1.0);
    }

    #[test]
    fn test_score_with_region_stats() {
        let profile = make_profile();
        let prefs = make_prefs();
        let stats = RegionStats {
            code: RegionCode::new("75"),
            name: "Paris".into(),
            population: Some(2_161_000),
            median_income: Some(27_000.0),
            poverty_rate: Some(0.15),
            unemployment_rate: Some(0.08),
            updated_at: Utc::now(),
        };
        let score = CompatibilityService::compute_score(&profile, Some(&stats), &prefs);
        assert!(score.value >= 0.0 && score.value <= 1.0);
    }

    #[test]
    fn test_build_analysis_produces_advice() {
        let profile = make_profile();
        let prefs = make_prefs();
        let analysis = CompatibilityService::build_analysis(profile, None, &prefs);
        assert!(!analysis.advice.is_empty());
        assert!(!analysis.score.summary.is_empty());
    }
}
