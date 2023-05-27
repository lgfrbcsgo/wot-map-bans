use axum::body::HttpBody;
use axum::extract::{FromRequest, FromRequestParts, Query};
use axum::http::request::Parts;
use axum::http::Request;
use axum::{async_trait, BoxError, Form, Json};
use serde::de::DeserializeOwned;
use validator::Validate;

use crate::error::{ClientError, Error};

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
    type Rejection = Error;

    async fn from_request(req: Request<B>, state: &S) -> Result<Self, Self::Rejection> {
        let Json(data): Json<T> = Json::from_request(req, state)
            .await
            .map_err(|e| ClientError::IncorrectType(e.body_text()))?;
        data.validate().map_err(ClientError::Invalid)?;
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
    type Rejection = Error;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let Query(data): Query<T> = Query::from_request_parts(parts, state)
            .await
            .map_err(|e| ClientError::IncorrectType(e.body_text()))?;
        data.validate().map_err(ClientError::Invalid)?;
        Ok(ValidQuery(data))
    }
}

pub struct ValidForm<T>(pub T);

#[async_trait]
impl<T, S, B> FromRequest<S, B> for ValidForm<T>
where
    T: Validate + DeserializeOwned,
    B: HttpBody + Send + 'static,
    B::Data: Send,
    B::Error: Into<BoxError>,
    S: Send + Sync,
{
    type Rejection = Error;

    async fn from_request(req: Request<B>, state: &S) -> Result<Self, Self::Rejection> {
        let Form(data): Form<T> = Form::from_request(req, state)
            .await
            .map_err(|e| ClientError::IncorrectType(e.body_text()))?;
        data.validate().map_err(ClientError::Invalid)?;
        Ok(ValidForm(data))
    }
}
