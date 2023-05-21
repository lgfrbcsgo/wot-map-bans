use chrono::serde::ts_seconds;
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{EncodingKey, Header};
use serde::{Deserialize, Serialize};

use crate::error::Result;
use crate::ServerSecret;

#[derive(Debug, Serialize, Deserialize)]
pub struct TokenClaims {
    #[serde(with = "ts_seconds")]
    pub exp: DateTime<Utc>,
    pub sub: String,
}

pub fn create_token(account_id: u64, secret: ServerSecret) -> Result<String> {
    let claims = TokenClaims {
        exp: Utc::now() + Duration::days(30),
        // use only the lower 14 bits to make it hard to observe individual users
        // => 16384 possible user IDs
        sub: format!("{:04x}", account_id & 0x3FFF),
    };

    let token = jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.0.as_ref()),
    )?;

    Ok(token)
}
