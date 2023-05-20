use crate::error::ApiError;
use crate::AppContext;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Json, Router};
use sqlx::PgPool;
use tracing::warn;

use crate::model::{
    CreateMapReportPayload, GetRecentMapsQuery, GetRecentMapsResponse, RecentMapRow,
};
use crate::util::{ValidJson, ValidQuery};

pub fn router() -> Router<AppContext> {
    Router::new()
        .route("/api/map-report", post(create_map_report))
        .route("/api/recent-maps", get(get_recent_maps))
}

async fn create_map_report(
    State(pool): State<PgPool>,
    ValidJson(payload): ValidJson<CreateMapReportPayload>,
) -> Result<StatusCode, ApiError> {
    let row = sqlx::query_file!(
        "queries/insert_map_report.sql",
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

async fn get_recent_maps(
    State(pool): State<PgPool>,
    ValidQuery(query): ValidQuery<GetRecentMapsQuery>,
) -> Result<Json<GetRecentMapsResponse>, ApiError> {
    let rows = sqlx::query_file_as!(
        RecentMapRow,
        "queries/get_recent_maps.sql",
        query.server,
        query.min_tier,
        query.max_tier
    )
    .fetch_all(&pool)
    .await?;

    Ok(Json(GetRecentMapsResponse::from_rows(rows)))
}
