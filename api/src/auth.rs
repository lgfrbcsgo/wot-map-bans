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

use crate::error::{ApiError, Result};
use crate::ServerSecret;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TokenClaims {
    #[serde(with = "ts_seconds")]
    pub exp: DateTime<Utc>,
    pub sub: String,
}

#[async_trait]
impl<S: Send + Sync> FromRequestParts<S> for TokenClaims {
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        match parts.extensions.get::<TokenClaims>() {
            Some(claims) => Ok(claims.clone()),
            None => Err(ApiError::Unauthorized),
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
    )?;

    Ok(token)
}

pub fn decode_token(token: &str, secret: &ServerSecret) -> Result<TokenClaims> {
    let data = jsonwebtoken::decode::<TokenClaims>(
        token,
        &DecodingKey::from_secret(secret.0.as_ref()),
        &Validation::default(),
    )?;

    Ok(data.claims)
}

pub async fn auth_middleware<B>(
    headers: HeaderMap,
    State(secret): State<ServerSecret>,
    mut req: Request<B>,
    next: Next<B>,
) -> Result<Response> {
    if let Some(claims) = decode_token_from_headers(headers, &secret) {
        req.extensions_mut().insert(claims);
    }
    Ok(next.run(req).await)
}

fn decode_token_from_headers(headers: HeaderMap, secret: &ServerSecret) -> Option<TokenClaims> {
    let header = headers.get(AUTHORIZATION)?.to_str().ok()?;
    match header.split_once(" ") {
        Some(("Bearer", token)) => decode_token(&token, &secret).ok(),
        _ => None,
    }
}
