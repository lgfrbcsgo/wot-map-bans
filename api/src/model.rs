use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use validator::{Validate, ValidationError};

use crate::error::Result;

#[derive(Debug, Deserialize, Validate)]
#[validate(schema(function = "validate_tier_spread"))]
pub struct ReportPlayedMapBody {
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

fn validate_tier_spread(body: &ReportPlayedMapBody) -> Result<(), ValidationError> {
    let tier_spread = body.top_tier - body.bottom_tier;
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
    if payload.min_tier > payload.max_tier {
        Err(ValidationError::new("Invalid tier range."))?;
    }
    Ok(())
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CurrentMap {
    pub map: String,
    pub mode: String,
    pub count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct CurrentMaps {
    pub modes: HashMap<String, Vec<CurrentMap>>,
}

impl CurrentMaps {
    pub fn from_rows(rows: Vec<CurrentMap>) -> Self {
        let mut modes = HashMap::new();
        rows.into_iter().for_each(|row| {
            let maps = modes.entry(row.mode.clone()).or_insert_with(Vec::new);
            maps.push(row);
        });
        Self { modes }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct CurrentServer {
    pub name: String,
    pub region: String,
    pub count: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct CurrentServers {
    pub regions: HashMap<String, Vec<CurrentServer>>,
}

impl CurrentServers {
    pub fn from_rows(rows: Vec<CurrentServer>) -> Self {
        let mut regions = HashMap::new();
        rows.into_iter().for_each(|row| {
            let servers = regions.entry(row.region.clone()).or_insert_with(Vec::new);
            servers.push(row);
        });
        Self { regions }
    }
}

#[derive(Debug, Serialize)]
pub struct AuthenticateResponse {
    pub token: String,
}
