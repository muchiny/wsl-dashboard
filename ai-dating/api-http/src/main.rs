use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::Deserialize;
use tracing::info;

use app_usecases::analyze_match::AnalyzeMatchUseCase;
use app_usecases::dashboard::GetDashboardStatsUseCase;
use core_domain::entities::{DatingSite, UserPreferences};
use infra_mcp::inmemory::{
    InMemoryDatingRepository, InMemoryMatchHistoryRepository, InMemoryRegionStatsRepository,
};

/// Shared application context holding all use cases.
struct AppContext {
    analyze: AnalyzeMatchUseCase,
    dashboard: GetDashboardStatsUseCase,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,tower_http=debug".into()),
        )
        .init();

    let _ = dotenvy::dotenv();

    // Build repositories (in-memory for now; swap for real impls via config)
    let dating_repo = Arc::new(InMemoryDatingRepository::new());
    let region_repo = Arc::new(InMemoryRegionStatsRepository::new());
    let history_repo = Arc::new(InMemoryMatchHistoryRepository::new());

    let ctx = Arc::new(AppContext {
        analyze: AnalyzeMatchUseCase::new(
            dating_repo.clone(),
            region_repo.clone(),
            history_repo.clone(),
        ),
        dashboard: GetDashboardStatsUseCase::new(history_repo.clone()),
    });

    let app = Router::new()
        .route("/health", get(health))
        .route("/matches/{site}/{match_id}/analyze", post(analyze_match))
        .route("/dashboard/regions", get(dashboard_regions))
        .with_state(ctx);

    let addr = std::env::var("LISTEN_ADDR").unwrap_or_else(|_| "0.0.0.0:3080".into());
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    info!("listening on {addr}");
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health() -> impl IntoResponse {
    Json(serde_json::json!({ "status": "ok" }))
}

#[derive(Deserialize)]
struct AnalyzeBody {
    #[serde(flatten)]
    prefs: UserPreferences,
}

async fn analyze_match(
    State(ctx): State<Arc<AppContext>>,
    Path((site_str, match_id)): Path<(String, String)>,
    Json(body): Json<AnalyzeBody>,
) -> impl IntoResponse {
    let site: DatingSite = match site_str.parse() {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": e })),
            )
                .into_response();
        }
    };

    match ctx.analyze.execute(site, &match_id, &body.prefs).await {
        Ok(analysis) => (StatusCode::OK, Json(serde_json::json!(analysis))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn dashboard_regions(State(ctx): State<Arc<AppContext>>) -> impl IntoResponse {
    match ctx.dashboard.execute().await {
        Ok(stats) => (StatusCode::OK, Json(serde_json::json!(stats))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
