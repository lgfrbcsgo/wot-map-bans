use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationError};

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
    if !(0..=2).contains(&tier_spread) {
        Err(ValidationError::new("Invalid tier spread."))?;
    }
    Ok(())
}

#[derive(Debug, Deserialize, Validate)]
#[validate(schema(function = "validate_max_tier_goe_min_tier"))]
pub struct GetCurrentMapsQuery {
    #[validate(length(max = 10))]
    pub server: String,
    #[validate(range(min = 1, max = 10))]
    pub min_tier: i16,
    #[validate(range(min = 1, max = 10))]
    pub max_tier: i16,
}

fn validate_max_tier_goe_min_tier(payload: &GetCurrentMapsQuery) -> Result<(), ValidationError> {
    if payload.min_tier <= payload.max_tier {
        Err(ValidationError::new("Invalid tier range."))?;
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
pub struct CurrentMap {
    pub map: String,
    pub mode: String,
    pub count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct GetCurrentMapsResponse {
    pub total: i64,
    pub modes: HashMap<String, HashMap<String, i64>>,
}

impl GetCurrentMapsResponse {
    pub fn from_rows(rows: Vec<CurrentMap>) -> Self {
        let total = i64::try_from(rows.len()).unwrap();
        let mut modes: HashMap<String, HashMap<String, i64>> = HashMap::new();
        for row in rows {
            if let Some(count) = row.count {
                let maps = modes.entry(row.mode).or_insert_with(HashMap::new);
                maps.insert(row.map, count);
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
    pub total: i64,
    pub regions: HashMap<String, HashMap<String, i64>>,
}

impl GetCurrentServersResponse {
    pub fn from_rows(rows: Vec<CurrentServer>) -> Self {
        let total = i64::try_from(rows.len()).unwrap();
        let mut regions: HashMap<String, HashMap<String, i64>> = HashMap::new();
        for row in rows {
            if let Some(count) = row.count {
                let servers = regions.entry(row.region).or_insert_with(HashMap::new);
                servers.insert(row.name, count);
            }
        }
        Self { total, regions }
    }
}

#[derive(Debug, Serialize)]
pub struct AuthenticateResponse {
    pub token: String,
}
