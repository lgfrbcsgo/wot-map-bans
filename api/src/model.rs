use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::api_client::Region;
use crate::error::{ApiError, Result};
use crate::util::Validate;

#[derive(Debug, Deserialize)]
pub struct CreatePlayedMapPayload {
    pub server: String,
    pub map: String,
    pub mode: String,
    pub bottom_tier: i16,
    pub top_tier: i16,
}

impl Validate<ApiError> for CreatePlayedMapPayload {
    fn validate(&self) -> Result<()> {
        if self.server.len() > 10 {
            Err(ApiError::Validation("Server name too long."))?;
        }

        if self.map.len() > 50 {
            Err(ApiError::Validation("Map name too long."))?;
        }

        if self.mode.len() > 50 {
            Err(ApiError::Validation("Mode name too long."))?;
        }

        if self.bottom_tier < 1 || 10 < self.bottom_tier {
            Err(ApiError::Validation("Invalid bottom tier."))?;
        }

        if self.top_tier < 1 || 10 < self.top_tier {
            Err(ApiError::Validation("Invalid top tier."))?;
        }

        let tier_spread = self.top_tier - self.bottom_tier;
        if tier_spread < 0 || 2 < tier_spread {
            Err(ApiError::Validation("Invalid tier spread."))?;
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct GetCurrentMapsQuery {
    pub server: String,
    pub min_tier: i16,
    pub max_tier: i16,
}

impl Validate<ApiError> for GetCurrentMapsQuery {
    fn validate(&self) -> Result<()> {
        if self.server.len() > 10 {
            Err(ApiError::Validation("Server name too long."))?;
        }

        if self.min_tier < 1 || 10 < self.min_tier {
            Err(ApiError::Validation("Invalid min tier."))?;
        }

        if self.max_tier < 1 || 10 < self.max_tier {
            Err(ApiError::Validation("Invalid max tier."))?;
        }

        Ok(())
    }
}

#[derive(Debug, Deserialize)]
pub struct CurrentMap {
    pub map: String,
    pub mode: String,
    pub count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct GetCurrentMapsResponse {
    pub total: usize,
    pub modes: HashMap<String, HashMap<String, usize>>,
}

impl GetCurrentMapsResponse {
    pub fn from_rows(rows: Vec<CurrentMap>) -> Self {
        let total = rows.len();
        let mut modes: HashMap<String, HashMap<String, usize>> = HashMap::new();
        for row in rows {
            if let Some(count) = row.count {
                let maps = modes.entry(row.mode).or_insert_with(HashMap::new);
                maps.insert(row.map, usize::try_from(count).unwrap_or(0));
            }
        }
        Self { total, modes }
    }
}

#[derive(Debug, Deserialize)]
pub struct CurrentServer {
    pub name: String,
    pub region: String,
    pub count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct GetCurrentServersResponse {
    pub total: usize,
    pub regions: HashMap<String, HashMap<String, usize>>,
}

impl GetCurrentServersResponse {
    pub fn from_rows(rows: Vec<CurrentServer>) -> Self {
        let total = rows.len();
        let mut regions: HashMap<String, HashMap<String, usize>> = HashMap::new();
        for row in rows {
            if let Some(count) = row.count {
                let servers = regions.entry(row.region).or_insert_with(HashMap::new);
                servers.insert(row.name, usize::try_from(count).unwrap_or(0));
            }
        }
        Self { total, regions }
    }
}

#[derive(Debug, Deserialize)]
pub struct AuthenticatePayload {
    pub region: Region,
    pub access_token: String,
}

impl Validate<ApiError> for AuthenticatePayload {
    fn validate(&self) -> Result<()> {
        if self.access_token.len() > 500 {
            Err(ApiError::Validation("Access token too long."))?;
        }
        Ok(())
    }
}
