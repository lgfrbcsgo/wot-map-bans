use std::env;
use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use anyhow::Context;
use axum::extract::FromRef;
use axum::http::HeaderValue;
use axum::response::Response;
use axum::{middleware, Router, Server};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use tower_http::cors::{AllowHeaders, AllowMethods, AllowOrigin, CorsLayer};
use tower_http::request_id::{PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::trace::{DefaultOnFailure, DefaultOnResponse, OnResponse, TraceLayer};
use tracing::{info, Level, Span};
use util::request_id::{make_request_span, UuidRequestId, X_REQUEST_ID};

use crate::auth::auth_middleware;
use crate::error::{log_embedded_errors, Result};

mod auth;
mod error;
mod model;
mod router;
mod service;
mod util;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    info!("Initializing app context.");
    let app_context = init_app_context()
        .await
        .context("Failed to initialize app context")?;

    info!("Migrating database.");
    sqlx::migrate!()
        .run(&app_context.pool)
        .await
        .context("Database migration failed.")?;

    let app = configure_app(app_context);
    let addr = SocketAddr::from((Ipv4Addr::UNSPECIFIED, 8080));

    info!("Starting server on {}.", addr);
    Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .context("Server failed to start up.")?;

    Ok(())
}

#[derive(Debug, Clone)]
pub struct AppId(pub String);

#[derive(Debug, Clone)]
pub struct ServerSecret(pub String);

#[derive(Clone, FromRef)]
pub struct AppContext {
    pub pool: PgPool,
    pub app_id: AppId,
    pub server_secret: ServerSecret,
}

async fn init_app_context() -> Result<AppContext> {
    let app_id = env::var("APP_ID")
        .map(AppId)
        .context("Env var `APP_ID` is not set.")?;

    let server_secret = env::var("SERVER_SECRET")
        .map(ServerSecret)
        .context("Env var `SERVER_SECRET` is not set.")?;

    let db_connection_str =
        env::var("DATABASE_URL").context("Env var `DATABASE_URL` is not set.")?;

    let pool = util::retry(60, Duration::from_secs(2), || {
        info!("Connecting to database.");
        PgPoolOptions::new()
            .max_connections(20)
            .acquire_timeout(Duration::from_secs(1))
            .connect(&db_connection_str)
    })
    .await
    .context("Cannot connect to database.")?;

    Ok(AppContext {
        pool,
        app_id,
        server_secret,
    })
}

fn configure_app(app_context: AppContext) -> Router {
    let cors_layer = CorsLayer::new()
        .allow_methods(AllowMethods::any())
        .allow_headers(AllowHeaders::any())
        .allow_origin(AllowOrigin::list([
            HeaderValue::from_str("http://localhost:3000").unwrap(),
            HeaderValue::from_str("https://lgfrbcsgo.github.io").unwrap(),
        ]));

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

    router::router()
        .layer(middleware::from_fn_with_state(
            app_context.server_secret.clone(),
            auth_middleware,
        ))
        .layer(cors_layer)
        .layer(trace_layer)
        .layer(SetRequestIdLayer::new(
            X_REQUEST_ID.clone(),
            UuidRequestId::new(),
        ))
        .layer(PropagateRequestIdLayer::new(X_REQUEST_ID.clone()))
        .with_state(app_context)
}
