use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use crate::api_client::AppId;
use axum::extract::FromRef;
use axum::Server;
use dotenvy::dotenv;
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::request_id::{PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::TraceLayer;
use tracing::info;

use crate::router::router;
use crate::util::{make_request_span, retry, UuidRequestId, X_REQUEST_ID};

mod api_client;
mod error;
mod model;
mod router;
mod util;

#[derive(Clone, FromRef)]
pub struct AppContext {
    pool: PgPool,
    app_id: AppId,
}

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    let app_id = std::env::var("APP_ID")
        .map(AppId::new)
        .expect("Env var `APP_ID` is not set.");

    let db_connection_str =
        std::env::var("DATABASE_URL").expect("Env var `DATABASE_URL` is not set.");

    let pool = retry(60, Duration::from_secs(2), || {
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
        .expect("Database migration failed.");

    let app_context = AppContext { pool, app_id };
    let app = router()
        .with_state(app_context)
        .layer(TraceLayer::new_for_http().make_span_with(make_request_span))
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
        .expect("Server failed to start up.");
}
