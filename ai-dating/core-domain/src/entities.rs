use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Dating site identifiers.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DatingSite {
    Tinder,
    Bumble,
    Hinge,
}

impl DatingSite {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Tinder => "tinder",
            Self::Bumble => "bumble",
            Self::Hinge => "hinge",
        }
    }
}

impl std::fmt::Display for DatingSite {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(self.as_str())
    }
}

impl std::str::FromStr for DatingSite {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "tinder" => Ok(Self::Tinder),
            "bumble" => Ok(Self::Bumble),
            "hinge" => Ok(Self::Hinge),
            other => Err(format!("unknown dating site: {other}")),
        }
    }
}

/// Big-Five approximate scores + seriousness indicator (all 0.0–1.0).
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct InferredTraits {
    pub extraversion: f64,
    pub agreeableness: f64,
    pub conscientiousness: f64,
    pub neuroticism: f64,
    pub openness: f64,
    pub seriousness_score: f64,
}

/// A user profile retrieved from a dating site.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserProfile {
    pub id: String,
    pub site: DatingSite,
    pub display_name: String,
    pub age: Option<u32>,
    pub city: Option<String>,
    pub region_code: Option<RegionCode>,
    pub bio: Option<String>,
    pub photos: Vec<String>,
    pub traits: InferredTraits,
}

/// INSEE region or commune code.
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct RegionCode(pub String);

impl RegionCode {
    pub fn new(code: impl Into<String>) -> Self {
        Self(code.into())
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

/// Socio-economic statistics for a region/commune from INSEE.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegionStats {
    pub code: RegionCode,
    pub name: String,
    pub population: Option<i64>,
    pub median_income: Option<f64>,
    pub poverty_rate: Option<f64>,
    pub unemployment_rate: Option<f64>,
    pub updated_at: DateTime<Utc>,
}

/// Relationship type preference.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationshipType {
    Serious,
    Casual,
    Any,
}

impl Default for RelationshipType {
    fn default() -> Self {
        Self::Any
    }
}

/// User's matching preferences.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPreferences {
    pub age_min: Option<u32>,
    pub age_max: Option<u32>,
    pub relationship_type: RelationshipType,
    pub target_sites: Vec<DatingSite>,
    pub min_agreeableness: Option<f64>,
    pub max_neuroticism: Option<f64>,
    pub min_seriousness: Option<f64>,
}

impl Default for UserPreferences {
    fn default() -> Self {
        Self {
            age_min: Some(18),
            age_max: Some(99),
            relationship_type: RelationshipType::Any,
            target_sites: vec![],
            min_agreeableness: None,
            max_neuroticism: None,
            min_seriousness: None,
        }
    }
}

/// Compatibility score between 0.0 and 1.0.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompatibilityScore {
    pub value: f64,
    pub confidence: f64,
    pub summary: String,
}

/// Full match analysis: profile + region stats + score + advice.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MatchAnalysis {
    pub id: Uuid,
    pub profile: UserProfile,
    pub region_stats: Option<RegionStats>,
    pub score: CompatibilityScore,
    pub advice: String,
    pub created_at: DateTime<Utc>,
}
