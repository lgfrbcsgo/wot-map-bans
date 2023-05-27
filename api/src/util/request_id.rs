use axum::body::Body;
use axum::http::{HeaderName, HeaderValue, Request};
use tower_http::request_id::{MakeRequestId, RequestId};
use tracing::{error_span, Span};
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

pub fn make_request_span(request: &Request<Body>) -> Span {
    if let Some(request_id) = request.headers().get(&X_REQUEST_ID) {
        error_span!("request",
            request_id = ?request_id,
            method = %request.method(),
            uri = %request.uri(),
            version = ?request.version(),
        )
    } else {
        error_span!("request",
            method = %request.method(),
            uri = %request.uri(),
            version = ?request.version(),
        )
    }
}
