use async_trait::async_trait;
use reqwest::Client;
use serde::Deserialize;
use tracing::{debug, warn};

use core_domain::entities::{RegionCode, RegionStats};
use core_domain::error::DomainError;
use core_domain::ports::RegionStatsRepository;

/// INSEE HTTP client for the Données Locales / BDM APIs.
pub struct InseeHttpRegionStatsRepository {
    base_url: String,
    api_key: Option<String>,
    http: Client,
}

impl InseeHttpRegionStatsRepository {
    pub fn new(base_url: impl Into<String>, api_key: Option<String>) -> Self {
        Self {
            base_url: base_url.into(),
            api_key,
            http: Client::new(),
        }
    }

    /// Default constructor pointing to the INSEE API.
    pub fn insee_default(api_key: Option<String>) -> Self {
        Self::new("https://api.insee.fr/donnees-locales/V0.1", api_key)
    }
}

/// Response DTO from INSEE Données Locales (simplified).
#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InseeLocalResponse {
    #[serde(default)]
    cellules: Vec<InseeCellule>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct InseeCellule {
    #[serde(default)]
    mesure: Option<String>,
    #[serde(default)]
    valeur: Option<String>,
}

#[async_trait]
impl RegionStatsRepository for InseeHttpRegionStatsRepository {
    async fn get_region_stats(
        &self,
        code: &RegionCode,
    ) -> Result<Option<RegionStats>, DomainError> {
        debug!(code = %code.as_str(), "fetching region stats from INSEE");

        // Try the commune metadata endpoint
        let url = format!(
            "{base}/donnees/geo-commune/{code}@GEO2024/all",
            base = self.base_url,
            code = code.as_str()
        );

        let mut req = self.http.get(&url).header("Accept", "application/json");
        if let Some(ref key) = self.api_key {
            req = req.bearer_auth(key);
        }

        let resp = req
            .send()
            .await
            .map_err(|e| DomainError::InseeError(e.to_string()))?;

        if resp.status() == reqwest::StatusCode::NOT_FOUND {
            debug!(code = %code.as_str(), "no INSEE data found");
            return Ok(None);
        }

        if !resp.status().is_success() {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            warn!(code = %code.as_str(), %status, "INSEE API error");
            return Err(DomainError::InseeError(format!(
                "HTTP {status}: {body}"
            )));
        }

        let data: InseeLocalResponse = resp
            .json()
            .await
            .map_err(|e| DomainError::InseeError(e.to_string()))?;

        // Extract relevant indicators from cellules
        let mut population: Option<i64> = None;
        let mut median_income: Option<f64> = None;
        let mut poverty_rate: Option<f64> = None;
        let mut unemployment_rate: Option<f64> = None;

        for cell in &data.cellules {
            if let (Some(ref mesure), Some(ref valeur)) = (&cell.mesure, &cell.valeur) {
                match mesure.as_str() {
                    "POP" | "P_POP" => population = valeur.parse().ok(),
                    "MED" | "SNHM" => median_income = valeur.parse().ok(),
                    "TP60" => poverty_rate = valeur.parse::<f64>().ok().map(|v| v / 100.0),
                    "TCHOM" => unemployment_rate = valeur.parse::<f64>().ok().map(|v| v / 100.0),
                    _ => {}
                }
            }
        }

        Ok(Some(RegionStats {
            code: code.clone(),
            name: code.as_str().to_string(), // Would be enriched from a name lookup
            population,
            median_income,
            poverty_rate,
            unemployment_rate,
            updated_at: chrono::Utc::now(),
        }))
    }
}
