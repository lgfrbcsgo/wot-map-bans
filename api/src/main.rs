use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use anyhow::Context;
use axum::extract::FromRef;
use axum::response::Response;
use axum::{middleware, Server};
use dotenvy::dotenv;
use sqlx::postgres::{PgPool, PgPoolOptions};
use tower_http::request_id::{PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::{DefaultOnFailure, DefaultOnResponse, OnResponse, TraceLayer};
use tracing::{info, Level, Span};

use crate::auth::auth_middleware;
use crate::error::{log_embedded_errors, Result};
use crate::router::router;
use crate::util::{make_request_span, retry, UuidRequestId, X_REQUEST_ID};

mod api_client;
mod auth;
mod error;
mod model;
mod openid_client;
mod regions;
mod router;
mod util;

#[derive(Debug, Clone)]
pub struct AppId(pub String);

#[derive(Debug, Clone)]
pub struct ServerSecret(pub String);

#[derive(Clone, FromRef)]
pub struct AppContext {
    pool: PgPool,
    app_id: AppId,
    server_secret: ServerSecret,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    let app_id = std::env::var("APP_ID")
        .map(AppId)
        .context("Env var `APP_ID` is not set.")?;

    let server_secret = std::env::var("SERVER_SECRET")
        .map(ServerSecret)
        .context("Env var `SERVER_SECRET` is not set.")?;

    let db_connection_str =
        std::env::var("DATABASE_URL").context("Env var `DATABASE_URL` is not set.")?;

    let pool = retry(60, Duration::from_secs(2), || {
        info!("Connecting to database.");
        PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(Duration::from_secs(1))
            .connect(&db_connection_str)
    })
    .await
    .context("Cannot connect to database.")?;

    info!("Migrating database.");
    sqlx::migrate!()
        .run(&pool)
        .await
        .context("Database migration failed.")?;

    let app_context = AppContext {
        pool,
        app_id,
        server_secret,
    };

    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(make_request_span)
        .on_failure(DefaultOnFailure::new().level(Level::DEBUG))
        .on_response({
            let default = DefaultOnResponse::new();
            |response: &Response, latency: Duration, span: &Span| {
                default.on_response(response, latency, span);
                log_embedded_errors(response);
            }
        });

    let app = router()
        .layer(middleware::from_fn_with_state(
            app_context.server_secret.clone(),
            auth_middleware,
        ))
        .layer(trace_layer)
        .layer(SetRequestIdLayer::new(
            X_REQUEST_ID.clone(),
            UuidRequestId::new(),
        ))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.clone()))
        .with_state(app_context);

    let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, 8080));
    info!("Starting server on {}.", addr);
    Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .context("Server failed to start up.")?;

    Ok(())
}
