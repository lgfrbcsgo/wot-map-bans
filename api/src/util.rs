use crate::error::ApiError;
use axum::body::HttpBody;
use axum::extract::{FromRequest, FromRequestParts, Query};
use axum::http::request::Parts;
use axum::http::{HeaderName, HeaderValue, Request};
use axum::{async_trait, BoxError, Json};
use serde::de::DeserializeOwned;
use std::fmt::Display;
use std::future::Future;
use std::time::Duration;
use tower_http::request_id::{MakeRequestId, RequestId};
use tracing::warn;
use uuid::Uuid;

pub static X_REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");

#[derive(Clone)]
pub struct UuidRequestId {}

impl UuidRequestId {
    pub fn new() -> Self {
        UuidRequestId {}
    }
}

impl MakeRequestId for UuidRequestId {
    fn make_request_id<B>(&mut self, _request: &Request<B>) -> Option<RequestId> {
        let uuid = Uuid::new_v4().to_string();
        let header_value = HeaderValue::from_str(uuid.as_str()).ok()?;
        Some(header_value.into())
    }
}

pub trait Validate {
    fn validate(&self) -> Result<(), ApiError>;
}

pub struct ValidJson<T>(pub T);

#[async_trait]
impl<T, S, B> FromRequest<S, B> for ValidJson<T>
where
    T: Validate + DeserializeOwned,
    B: HttpBody + Send + 'static,
    B::Data: Send,
    B::Error: Into<BoxError>,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request(req: Request<B>, state: &S) -> Result<Self, Self::Rejection> {
        let Json(data): Json<T> = Json::from_request(req, state).await?;
        data.validate()?;
        Ok(ValidJson(data))
    }
}

pub struct ValidQuery<T>(pub T);

#[async_trait]
impl<S, T> FromRequestParts<S> for ValidQuery<T>
where
    T: Validate + DeserializeOwned,
    S: Send + Sync,
{
    type Rejection = ApiError;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Query(data): Query<T> = Query::from_request_parts(parts, state).await?;
        data.validate()?;
        Ok(ValidQuery(data))
    }
}

pub async fn retry<T, E: Display, Fut: Future<Output = Result<T, E>>, F: Fn() -> Fut>(
    mut retries: u8,
    interval: Duration,
    func: F,
) -> Result<T, E> {
    loop {
        let result = func().await;
        match result {
            Ok(v) => return Ok(v),
            Err(e) => {
                if retries == 0 {
                    return Err(e);
                } else {
                    retries -= 1;
                    warn!("Retrying {} more times. Error: {}", retries, e);
                    tokio::time::sleep(interval).await;
                }
            }
        }
    }
}
