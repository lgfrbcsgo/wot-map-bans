use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use crate::error::ApiError;
use crate::util::Validate;

#[derive(Debug, Deserialize)]
pub struct PlayMapPayload {
    pub server: String,
    pub map: String,
    pub mode: String,
    pub bottom_tier: i16,
    pub top_tier: i16,
}

impl Validate for PlayMapPayload {
    fn validate(&self) -> Result<(), ApiError> {
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
pub struct CurrentMapsQuery {
    pub server: String,
    pub min_tier: i16,
    pub max_tier: i16,
}

impl Validate for CurrentMapsQuery {
    fn validate(&self) -> Result<(), ApiError> {
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
pub struct CurrentMapsResponse {
    pub total: usize,
    pub modes: HashMap<String, HashMap<String, usize>>,
}

impl CurrentMapsResponse {
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
