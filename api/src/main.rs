use axum::body::Body;
use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use crate::util::{UuidRequestId, X_REQUEST_ID};
use axum::extract::FromRef;
use axum::http::Request;
use axum::Server;
use dotenvy::dotenv;
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::request_id::{PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::{error_span, info};

use crate::router::router;

mod error;
mod model;
mod router;
mod util;

#[derive(Clone, FromRef)]
pub struct AppContext {
    pool: PgPool,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    let db_connection_str =
        std::env::var("DATABASE_URL").expect("Env var `DATABASE_URL` is not set.");

    let pool = util::retry(60, Duration::from_secs(1), || {
        info!("Connecting to database.");
        PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(Duration::from_secs(1))
            .connect(&db_connection_str)
    })
    .await
    .expect("Cannot connect to database.");

    info!("Migrating database.");
    sqlx::migrate!()
        .run(&pool)
        .await
        .expect("DB migration failed.");

    let trace_layer = TraceLayer::new_for_http().make_span_with(|request: &Request<Body>| {
        if let Some(request_id) = request.headers().get(X_REQUEST_ID.clone()) {
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
    });

    let app_context = AppContext { pool };
    let app = router()
        .with_state(app_context)
        .layer(trace_layer)
        .layer(SetRequestIdLayer::new(
            X_REQUEST_ID.clone(),
            UuidRequestId::new(),
        ))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.clone()));

    let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, 8080));
    info!("Starting server on {}.", addr);
    Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .expect("Server start up failed.");
}
