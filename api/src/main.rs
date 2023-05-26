use std::net::{Ipv4Addr, SocketAddr};
use std::time::Duration;

use anyhow::Context;
use axum::extract::FromRef;
use axum::response::Response;
use axum::{middleware, Router, Server};
use context::AppContext;
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
mod context;
mod error;
mod model;
mod openid_client;
mod regions;
mod router;
mod util;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv().ok();

    tracing_subscriber::fmt::init();

    info!("Initializing app context.");
    let app_context = AppContext::init()
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

fn configure_app(app_context: AppContext) -> Router {
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

    router()
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
        .with_state(app_context)
}
