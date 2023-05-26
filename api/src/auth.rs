use anyhow::Context;
use axum::async_trait;
use axum::extract::{FromRequestParts, State};
use axum::http::header::AUTHORIZATION;
use axum::http::request::Parts;
use axum::http::{HeaderMap, Request};
use axum::middleware::Next;
use axum::response::Response;
use chrono::serde::ts_seconds;
use chrono::{DateTime, Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

use crate::context::ServerSecret;
use crate::error::{ClientError, Error, Result};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    #[serde(with = "ts_seconds")]
    pub exp: DateTime<Utc>,
    pub sub: String,
}

#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for TokenClaims {
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        match parts.extensions.get::<TokenClaims>() {
            Some(claims) => Ok(claims.clone()),
            None => Err(ClientError::AuthRequired.into()),
        }
    }
}

pub fn create_token(account_id: u64, secret: &ServerSecret) -> Result<String> {
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
    )
    .context("Failed to encode JWT")?;

    Ok(token)
}

pub fn decode_token(token: &str, secret: &ServerSecret) -> Result<TokenClaims> {
    jsonwebtoken::decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.0.as_ref()),
        &Validation::default(),
    )
    .map_err(|_| ClientError::InvalidBearerToken.into())
    .map(|data| data.claims)
}

pub async fn auth_middleware<B>(
    headers: HeaderMap,
    State(secret): State<ServerSecret>,
    mut req: Request<B>,
    next: Next<B>,
) -> Result<Response> {
    if let Some(header) = headers.get(AUTHORIZATION) {
        let header_str = header
            .to_str()
            .map_err(|_| ClientError::ExpectedBearerToken)?;

        match header_str.split_once(' ') {
            Some(("Bearer", token)) => {
                let claims = decode_token(token, &secret)?;
                req.extensions_mut().insert(claims);
            }
            _ => Err(ClientError::ExpectedBearerToken)?,
        }
    }
    Ok(next.run(req).await)
}
