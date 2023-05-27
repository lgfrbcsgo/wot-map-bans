use anyhow::Context;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::PgPool;
use tracing::warn;

use crate::auth::{create_token, TokenClaims};
use crate::error::{ClientError, Result};
use crate::model::{
    AuthenticateResponse, CreatePlayedMapPayload, CurrentMap, CurrentServer, GetCurrentMapsQuery,
    GetCurrentMapsResponse, GetCurrentServersResponse,
};
use crate::service::api_client::ApiClient;
use crate::service::openid_client::{OpenIDClient, OpenIDPayload};
use crate::util::validation::{ValidForm, ValidJson, ValidQuery};
use crate::{AppContext, AppId, ServerSecret};

pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/api/played-map", post(create_played_map))
        .route("/api/current-maps", get(get_current_maps))
        .route("/api/current-servers", get(get_current_servers))
        .route("/api/authenticate", post(authenticate))
}

async fn create_played_map(
    State(pool): State<PgPool>,
    claims: TokenClaims,
    ValidJson(payload): ValidJson<CreatePlayedMapPayload>,
) -> Result<StatusCode> {
    let row = sqlx::query_file!(
        "queries/insert_played_map.sql",
        claims.sub,
        payload.server,
        payload.map,
        payload.mode,
        payload.bottom_tier,
        payload.top_tier
    )
    .fetch_optional(&pool)
    .await
    .with_context(|| format!("Failed to insert played map: {:?}", payload))?;

    if row.is_none() {
        warn!(
            "Unrecognized server, map, or mode: {}, {}, {}",
            payload.server, payload.map, payload.mode
        )
    }
    Ok(StatusCode::NO_CONTENT)
}

async fn get_current_maps(
    State(pool): State<PgPool>,
    ValidQuery(query): ValidQuery<GetCurrentMapsQuery>,
) -> Result<Json<GetCurrentMapsResponse>> {
    let rows = sqlx::query_file_as!(
        CurrentMap,
        "queries/select_current_maps.sql",
        query.server,
        query.min_tier,
        query.max_tier
    )
    .fetch_all(&pool)
    .await
    .with_context(|| format!("Failed to select current maps: {:?}", query))?;

    Ok(Json(GetCurrentMapsResponse::from_rows(rows)))
}

async fn get_current_servers(
    State(pool): State<PgPool>,
) -> Result<Json<GetCurrentServersResponse>> {
    let rows = sqlx::query_file_as!(CurrentServer, "queries/select_current_servers.sql")
        .fetch_all(&pool)
        .await
        .context("Failed to select current servers")?;

    Ok(Json(GetCurrentServersResponse::from_rows(rows)))
}

async fn authenticate(
    State(app_id): State<AppId>,
    State(server_secret): State<ServerSecret>,
    ValidForm(payload): ValidForm<OpenIDPayload>,
) -> Result<Json<AuthenticateResponse>> {
    let openid_client = OpenIDClient::new();
    let api_client = ApiClient::new(payload.endpoint.api_realm(), app_id);

    let account = openid_client
        .verify_id(payload)
        .await
        .context("Failed to verify account with OpenID provider")?
        .ok_or(ClientError::OpenIDRejected)?;

    let account_info = api_client
        .get_public_account_info(account.account_id)
        .await
        .with_context(|| format!("Failed to fetch number of battles: {:?}", account))?;

    if account_info.statistics.all.battles < 200 {
        Err(ClientError::NotEnoughBattles)?;
    }

    let token = create_token(account.account_id, &server_secret)?;
    Ok(Json(AuthenticateResponse { token }))
}
