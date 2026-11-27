use axum::{
    Json, Router,
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::get,
};
use chrono::Utc;
use sqlx::SqlitePool;
use std::path::PathBuf;
use tower_http::{
    compression::CompressionLayer,
    services::{ServeDir, ServeFile},
};

#[derive(Clone)]
struct WebProbeState {
    db: SqlitePool,
}

const FAVICON_ICO: &[u8] = include_bytes!("../../../web/public/favicon.ico");

pub fn routes(db: SqlitePool, web_dir: PathBuf) -> Router {
    let index_path = web_dir.join("index.html");
    let spa = ServeDir::new(&web_dir)
        .append_index_html_on_directories(true)
        .fallback(ServeFile::new(index_path));

    let probes = Router::new()
        .route("/health", get(handle_health))
        .route("/ready", get(handle_ready))
        .route("/api/status", get(handle_status))
        .route("/favicon.ico", get(handle_favicon))
        .with_state(WebProbeState { db });

    Router::new()
        .merge(probes)
        .fallback_service(spa)
        .layer(CompressionLayer::new())
        .layer(middleware::from_fn(security_headers))
}

async fn security_headers(req: Request, next: Next) -> Response {
    let is_embed = req.uri().path().starts_with("/embed/");
    let mut res = next.run(req).await;
    let headers = res.headers_mut();
    headers
        .entry(header::X_CONTENT_TYPE_OPTIONS)
        .or_insert(HeaderValue::from_static("nosniff"));
    headers
        .entry(header::REFERRER_POLICY)
        .or_insert(HeaderValue::from_static("origin-when-cross-origin"));
    if !is_embed {
        headers
            .entry(header::X_FRAME_OPTIONS)
            .or_insert(HeaderValue::from_static("SAMEORIGIN"));
    }
    res
}

async fn handle_favicon() -> impl IntoResponse {
    (
        StatusCode::OK,
        [
            (header::CONTENT_TYPE, "image/x-icon"),
            (header::CACHE_CONTROL, "public, max-age=86400"),
        ],
        FAVICON_ICO,
    )
}

async fn handle_health() -> impl IntoResponse {
    (StatusCode::OK, Json(serde_json::json!({ "status": "ok" })))
}

async fn handle_ready(State(st): State<WebProbeState>) -> impl IntoResponse {
    match sqlx::query("SELECT 1").execute(&st.db).await {
        Ok(_) => (
            StatusCode::OK,
            Json(serde_json::json!({ "status": "ready", "database": "sqlite" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(serde_json::json!({ "status": "error", "detail": e.to_string() })),
        )
            .into_response(),
    }
}

async fn handle_status() -> impl IntoResponse {
    let ts = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);
    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "ok",
            "service": "nova",
            "version": env!("CARGO_PKG_VERSION"),
            "timestamp": ts
        })),
    )
}
