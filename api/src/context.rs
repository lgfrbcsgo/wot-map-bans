use crate::error;
use crate::util::retry;
use anyhow::Context;
use axum::extract::FromRef;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::time::Duration;
use tracing::info;

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

impl AppContext {
    pub async fn init() -> error::Result<Self> {
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

        Ok(Self {
            pool,
            app_id,
            server_secret,
        })
    }
}
