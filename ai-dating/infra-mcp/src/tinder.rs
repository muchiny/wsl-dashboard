use async_trait::async_trait;
use serde::Deserialize;
use serde_json::json;

use core_domain::entities::{
    DatingSite, InferredTraits, RegionCode, UserProfile,
};
use core_domain::error::DomainError;
use core_domain::ports::DatingProfileRepository;

use crate::client::McpClient;

/// DTO returned by the Tinder MCP server.
#[derive(Debug, Deserialize)]
struct TinderProfileDto {
    pub id: String,
    pub name: String,
    pub age: Option<u32>,
    pub city: Option<String>,
    pub region_code: Option<String>,
    pub bio: Option<String>,
    pub photos: Option<Vec<String>>,
}

impl TinderProfileDto {
    fn into_user_profile(self) -> UserProfile {
        UserProfile {
            id: self.id,
            site: DatingSite::Tinder,
            display_name: self.name,
            age: self.age,
            city: self.city,
            region_code: self.region_code.map(RegionCode::new),
            bio: self.bio,
            photos: self.photos.unwrap_or_default(),
            traits: InferredTraits::default(),
        }
    }
}

/// Tinder adapter: implements DatingProfileRepository via MCP.
pub struct TinderMcpRepository {
    client: McpClient,
}

impl TinderMcpRepository {
    pub fn new(client: McpClient) -> Self {
        Self { client }
    }
}

#[async_trait]
impl DatingProfileRepository for TinderMcpRepository {
    async fn get_profile(
        &self,
        _site: DatingSite,
        match_id: &str,
    ) -> Result<UserProfile, DomainError> {
        let result = self
            .client
            .call_tool("get_match_profile", json!({ "match_id": match_id }))
            .await
            .map_err(|e| DomainError::McpError(e.to_string()))?;

        let dto: TinderProfileDto =
            serde_json::from_value(result).map_err(|e| DomainError::McpError(e.to_string()))?;

        Ok(dto.into_user_profile())
    }

    async fn list_recommendations(
        &self,
        _site: DatingSite,
        limit: usize,
    ) -> Result<Vec<UserProfile>, DomainError> {
        let result = self
            .client
            .call_tool("list_recommendations", json!({ "limit": limit }))
            .await
            .map_err(|e| DomainError::McpError(e.to_string()))?;

        let dtos: Vec<TinderProfileDto> =
            serde_json::from_value(result).map_err(|e| DomainError::McpError(e.to_string()))?;

        Ok(dtos.into_iter().map(|d| d.into_user_profile()).collect())
    }
}
