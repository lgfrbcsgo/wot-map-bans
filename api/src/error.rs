use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::Json;
use serde::Serialize;
use serde_json::json;
use tracing::{debug, error};
use validator::ValidationErrors;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(thiserror::Error, Debug, Serialize)]
#[serde(tag = "error", content = "detail")]
pub enum ClientError {
    #[error("Incorrect type: {0}")]
    IncorrectType(String),
    #[error("Invalid: {0}")]
    Invalid(ValidationErrors),
    #[error("Expected bearer token")]
    ExpectedBearerToken,
    #[error("Invalid bearer token")]
    InvalidBearerToken,
    #[error("Authentication required")]
    AuthRequired,
    #[error("OpenID rejected")]
    OpenIDRejected,
    #[error("Not enough battles")]
    NotEnoughBattles,
}

impl ClientError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::IncorrectType(_) => StatusCode::BAD_REQUEST,
            Self::Invalid(_) => StatusCode::BAD_REQUEST,
            Self::ExpectedBearerToken => StatusCode::UNAUTHORIZED,
            Self::InvalidBearerToken => StatusCode::UNAUTHORIZED,
            Self::AuthRequired => StatusCode::UNAUTHORIZED,
            Self::OpenIDRejected => StatusCode::UNAUTHORIZED,
            Self::NotEnoughBattles => StatusCode::UNAUTHORIZED,
        }
    }
}

#[derive(thiserror::Error, Debug)]
pub enum Error {
    #[error(transparent)]
    ClientError(#[from] ClientError),
    #[error(transparent)]
    InternalError(#[from] anyhow::Error),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, body) = match &self {
            Self::ClientError(e) => (e.status_code(), json!(e)),
            Self::InternalError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                json!({ "error": "InternalError" }),
            ),
        };
        let mut response = (status, Json(body)).into_response();
        response.extensions_mut().insert(self);
        response
    }
}

pub fn log_embedded_errors(response: &Response) {
    let e = response.extensions().get::<Error>();
    match e {
        Some(Error::InternalError(e)) => error!("{:?}", e),
        Some(Error::ClientError(e)) => debug!("{:?}", e),
        None => {}
    }
}
