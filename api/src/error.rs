use std::fmt::{Debug, Display, Formatter};

use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::{Serialize, Serializer};
use tracing::{debug, error, warn};
use validator::ValidationErrors;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(thiserror::Error, Debug, Serialize)]
#[serde(tag = "error", content = "detail")]
pub enum Error {
    #[error("Invalid query schema: {0}")]
    InvalidQuerySchema(String),
    #[error("Invalid query: {0}")]
    InvalidQuery(ValidationErrors),
    #[error("Invalid body schema: {0}")]
    InvalidBodySchema(String),
    #[error("Invalid body: {0}")]
    InvalidBody(ValidationErrors),
    #[error("Invalid auth header")]
    InvalidAuthHeader,
    #[error("Invalid bearer token")]
    InvalidBearerToken,
    #[error("Authentication required")]
    AuthRequired,
    #[error("Unrecognized server '{server}', map '{map}', or mode '{mode}'")]
    UnrecognizedValue {
        server: String,
        map: String,
        mode: String,
    },
    #[error("Not enough battles. {required} battles required.")]
    NotEnoughBattles { required: u32 },
    #[error(transparent)]
    InternalError(InternalError),
}

impl Error {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::InvalidQuerySchema(_) => StatusCode::BAD_REQUEST,
            Self::InvalidQuery(_) => StatusCode::BAD_REQUEST,
            Self::InvalidBodySchema(_) => StatusCode::BAD_REQUEST,
            Self::InvalidBody(_) => StatusCode::BAD_REQUEST,
            Self::InvalidAuthHeader => StatusCode::UNAUTHORIZED,
            Self::InvalidBearerToken => StatusCode::UNAUTHORIZED,
            Self::AuthRequired => StatusCode::UNAUTHORIZED,
            Self::UnrecognizedValue {
                server: _,
                map: _,
                mode: _,
            } => StatusCode::BAD_REQUEST,
            Self::NotEnoughBattles { required: _ } => StatusCode::UNAUTHORIZED,
            Self::InternalError(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match &self {
            Self::InternalError(e) => error!("{:?}", e),
            Self::UnrecognizedValue {
                server: _,
                map: _,
                mode: _,
            } => warn!("{:?}", self),
            _ => debug!("{:?}", self),
        }
        (self.status_code(), Json(self)).into_response()
    }
}

impl From<anyhow::Error> for Error {
    fn from(value: anyhow::Error) -> Self {
        Error::InternalError(InternalError(value))
    }
}

pub struct InternalError(anyhow::Error);

impl std::error::Error for InternalError {}

impl Display for InternalError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        std::fmt::Display::fmt(&self.0, f)
    }
}

impl Debug for InternalError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        std::fmt::Debug::fmt(&self.0, f)
    }
}

impl Serialize for InternalError {
    fn serialize<S: Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str("Something went wrong :shrug:")
    }
}
