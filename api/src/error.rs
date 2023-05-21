use crate::api_client::ApiClientError;
use axum::extract::rejection::{JsonRejection, QueryRejection};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde_json::json;
use thiserror::Error;
use tracing::error;

pub type Result<T> = core::result::Result<T, ApiError>;

#[derive(Error, Debug)]
pub enum ApiError {
    #[error("Validation error: {0}")]
    Validation(&'static str),
    #[error("WG API error: {0}")]
    ApiClient(#[from] ApiClientError),
    #[error(transparent)]
    JsonExtractor(#[from] JsonRejection),
    #[error(transparent)]
    QueryExtractor(#[from] QueryRejection),
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        match self {
            Self::Validation(message) => {
                error_response(StatusCode::BAD_REQUEST, message.to_string())
            }
            Self::JsonExtractor(rejection) => {
                error_response(StatusCode::BAD_REQUEST, rejection.body_text())
            }
            Self::QueryExtractor(rejection) => {
                error_response(StatusCode::BAD_REQUEST, rejection.body_text())
            }
            Self::ApiClient(ApiClientError::InvalidAccessToken) => {
                error_response(StatusCode::BAD_REQUEST, "Invalid access token.".into())
            }
            _ => {
                error!("{}", self);
                error_response(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Internal server error.".into(),
                )
            }
        }
    }
}

fn error_response(status: StatusCode, message: String) -> Response {
    let body = json!({ "error": message });
    (status, Json(body)).into_response()
}
