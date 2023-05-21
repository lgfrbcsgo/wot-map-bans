use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::PgPool;
use tracing::warn;

use crate::error::ApiError;
use crate::model::{CurrentMap, CurrentMapsQuery, CurrentMapsResponse, PlayMapPayload};
use crate::util::{ValidJson, ValidQuery};
use crate::AppContext;

pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/api/played-map", post(create_played_map))
        .route("/api/current-maps", get(get_current_maps))
}

async fn create_played_map(
    State(pool): State<PgPool>,
    ValidJson(payload): ValidJson<PlayMapPayload>,
) -> Result<StatusCode, ApiError> {
    let row = sqlx::query_file!(
        "queries/insert_played_map.sql",
        0,
        payload.server,
        payload.map,
        payload.mode,
        payload.bottom_tier,
        payload.top_tier
    )
    .fetch_optional(&pool)
    .await?;

    match row {
        Some(_) => Ok(StatusCode::NO_CONTENT),
        None => {
            warn!(
                "Unknown server `{}`, map `{}`, or mode `{}`.",
                payload.server, payload.map, payload.mode
            );
            Err(ApiError::Validation("Unknown server, map, or mode."))
        }
    }
}

async fn get_current_maps(
    State(pool): State<PgPool>,
    ValidQuery(query): ValidQuery<CurrentMapsQuery>,
) -> Result<Json<CurrentMapsResponse>, ApiError> {
    let rows = sqlx::query_file_as!(
        CurrentMap,
        "queries/select_current_maps.sql",
        query.server,
        query.min_tier,
        query.max_tier
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(CurrentMapsResponse::from_rows(rows)))
}
