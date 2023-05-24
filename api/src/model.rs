use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationError};

use crate::api_client::Region;
use crate::error::Result;

#[derive(Debug, Deserialize, Validate)]
#[validate(schema(function = "validate_tier_spread"))]
pub struct CreatePlayedMapPayload {
    #[validate(length(max = 10))]
    pub server: String,
    #[validate(length(max = 50))]
    pub map: String,
    #[validate(length(max = 50))]
    pub mode: String,
    #[validate(range(min = 1, max = 10))]
    pub bottom_tier: i16,
    #[validate(range(min = 1, max = 10))]
    pub top_tier: i16,
}

fn validate_tier_spread(payload: &CreatePlayedMapPayload) -> Result<(), ValidationError> {
    let tier_spread = payload.top_tier - payload.bottom_tier;
    if tier_spread < 0 || 2 < tier_spread {
        Err(ValidationError::new("Invalid tier spread."))?;
    }
    Ok(())
}

#[derive(Debug, Deserialize, Validate)]
pub struct GetCurrentMapsQuery {
    #[validate(length(max = 10))]
    pub server: String,
    #[validate(range(min = 1, max = 10))]
    pub min_tier: i16,
    #[validate(range(min = 1, max = 10))]
    pub max_tier: i16,
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

#[derive(Debug, Deserialize, Validate)]
pub struct AuthenticatePayload {
    pub region: Region,
    #[validate(length(max = 500))]
    pub access_token: String,
}

#[derive(Debug, Serialize)]
pub struct AuthenticateResponse {
    pub token: String,
}
