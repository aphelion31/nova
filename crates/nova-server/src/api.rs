use crate::auth::{self, AuthConfig};
use crate::db;
use crate::rooms::RoomRegistry;
use crate::sfu::SfuHandle;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, StatusCode, header},
    response::IntoResponse,
    routing::{get, post},
};
use base64::Engine as _;
use nova_core::protocol::{IceServerConfig, SharedFileMeta};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
pub struct ApiState {
    pub db: SqlitePool,
    pub auth: Arc<AuthConfig>,
    pub registry: RoomRegistry,
    pub sfu: SfuHandle,
    pub ice_servers: Vec<IceServerConfig>,
}

#[derive(Debug, Deserialize)]
pub struct CreateRoomReq {
    pub name: String,
    #[serde(default)]
    pub subject: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub lobby_enabled: Option<bool>,
    #[serde(default)]
    pub e2ee_enabled: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct MintTokenReq {
    pub display_name: String,
    #[serde(default)]
    pub email: Option<String>,
    #[serde(default)]
    pub moderator: bool,
    #[serde(default)]
    pub ttl_secs: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct RoomSummaryDto {
    pub name: String,
    pub subject: String,
    pub locked: bool,
    pub has_password: bool,
    pub lobby_enabled: bool,
    pub e2ee_enabled: bool,
    pub active_participants: usize,
    pub last_active_at: i64,
}

pub fn routes(
    db: SqlitePool,
    auth: Arc<AuthConfig>,
    registry: RoomRegistry,
    sfu: SfuHandle,
    ice_servers: Vec<IceServerConfig>,
) -> Router {
    let st = ApiState {
        db,
        auth,
        registry,
        sfu,
        ice_servers,
    };
    Router::new()
        .route("/api/config", get(get_config))
        .route("/api/rooms", get(list_rooms).post(create_room))
        .route("/api/rooms/{name}", get(get_room))
        .route("/api/rooms/{name}/token", post(mint_room_token))
        .route("/api/rooms/{name}/messages", get(get_room_messages))
        .route("/api/rooms/{name}/polls", get(get_room_polls))
        .route("/api/rooms/{name}/stats", get(get_room_stats))
        .route(
            "/api/rooms/{name}/files",
            get(list_room_files)
                .post(upload_room_file)
                .layer(DefaultBodyLimit::max(8 * 1024 * 1024)),
        )
        .route("/api/rooms/{name}/files/{id}", get(download_room_file))
        .route("/api/rooms/{name}/feedback", post(submit_room_feedback))
        .with_state(st)
}

async fn get_config(State(st): State<ApiState>) -> impl IntoResponse {
    Json(serde_json::json!({
        "service": "nova",
        "version": env!("CARGO_PKG_VERSION"),
        "sfu": "str0m",
        "iceServers": st.ice_servers,
        "features": {
            "prejoin": true,
            "lobby": true,
            "e2ee": true,
            "polls": true,
            "whiteboard": true,
            "breakoutRooms": true,
            "screenShare": true,
            "subtitles": true,
            "sharedVideo": true,
            "fileSharing": true,
            "avModeration": true,
            "followMe": true,
            "virtualBackground": true,
            "feedback": true,
            "externalApi": true,
            "nativeMobile": ["ios-swiftui-uniffi", "android-compose-uniffi"]
        }
    }))
}

async fn list_rooms(State(st): State<ApiState>) -> impl IntoResponse {
    let records = match db::list_recent_rooms(&st.db, 20).await {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response();
        }
    };
    let mut rooms = Vec::with_capacity(records.len());
    for rec in records {
        let active_participants = st.registry.active_peer_count(&rec.name).await;
        rooms.push(RoomSummaryDto {
            name: rec.name,
            subject: rec.subject,
            locked: rec.locked,
            has_password: rec.password_hash.is_some(),
            lobby_enabled: rec.lobby_enabled,
            e2ee_enabled: rec.e2ee_enabled,
            active_participants,
            last_active_at: rec.last_active_at,
        });
    }
    Json(serde_json::json!({ "rooms": rooms })).into_response()
}

async fn create_room(
    State(st): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateRoomReq>,
) -> impl IntoResponse {
    let clean_name = req.name.trim().to_string();
    if !nova_core::validate_room_slug(clean_name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "room name must match [a-zA-Z0-9_-]{1,128}" })),
        )
            .into_response();
    }
    let user = auth::current_session_user(&st.db, &st.auth, &headers).await;
    let rec = match db::get_or_create_room(&st.db, &clean_name, user.as_ref().map(|u| u.id.as_str())).await {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": e.to_string() })),
            )
                .into_response();
        }
    };

    let mut pw_hash = rec.password_hash;
    let mut locked = rec.locked;
    if let Some(pw) = req.password.as_deref()
        && !pw.is_empty()
    {
        pw_hash = auth::hash_password(pw).ok();
        locked = pw_hash.is_some();
    }
    let subject = req
        .subject
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or(rec.subject.as_str())
        .to_string();
    let lobby = req.lobby_enabled.unwrap_or(rec.lobby_enabled);
    let e2ee = req.e2ee_enabled.unwrap_or(rec.e2ee_enabled);

    if let Err(e) =
        db::update_room_security(&st.db, &clean_name, &subject, locked, pw_hash.as_deref(), lobby, e2ee).await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response();
    }

    if let Some(existing) = st.registry.rooms.get(&clean_name) {
        let mut guard = existing.value().write().await;
        guard.security.subject = subject.clone();
        guard.security.locked = locked;
        guard.security.has_password = pw_hash.is_some();
        guard.security.lobby_enabled = lobby;
        guard.security.e2ee_enabled = e2ee;
        guard.password_hash = pw_hash.clone();
    }

    (
        StatusCode::CREATED,
        Json(serde_json::json!({
            "room": RoomSummaryDto {
                name: clean_name.clone(),
                subject,
                locked,
                has_password: pw_hash.is_some(),
                lobby_enabled: lobby,
                e2ee_enabled: e2ee,
                active_participants: st.registry.active_peer_count(&clean_name).await,
                last_active_at: rec.last_active_at,
            }
        })),
    )
        .into_response()
}

async fn get_room(State(st): State<ApiState>, Path(name): Path<String>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let active = st.registry.active_peer_count(&name).await;
    match db::get_room(&st.db, &name).await {
        Ok(Some(rec)) => Json(serde_json::json!({
            "room": RoomSummaryDto {
                name: rec.name,
                subject: rec.subject,
                locked: rec.locked,
                has_password: rec.password_hash.is_some(),
                lobby_enabled: rec.lobby_enabled,
                e2ee_enabled: rec.e2ee_enabled,
                active_participants: active,
                last_active_at: rec.last_active_at,
            }
        }))
        .into_response(),
        Ok(None) => Json(serde_json::json!({
            "room": {
                "name": name,
                "subject": name,
                "locked": false,
                "has_password": false,
                "lobby_enabled": false,
                "e2ee_enabled": false,
                "active_participants": active,
                "last_active_at": 0,
                "exists": false
            }
        }))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn mint_room_token(
    State(st): State<ApiState>,
    Path(name): Path<String>,
    headers: HeaderMap,
    Json(req): Json<MintTokenReq>,
) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let session_user = auth::current_session_user(&st.db, &st.auth, &headers).await;
    let is_mod = req.moderator && session_user.is_some();
    let ttl = req.ttl_secs.unwrap_or(3600).clamp(60, 86400);
    match auth::mint_room_jwt(
        &st.auth,
        &name,
        req.display_name.trim(),
        req.email.as_deref(),
        is_mod,
        ttl,
    ) {
        Ok(token) => Json(serde_json::json!({
            "token": token,
            "room": name,
            "moderator": is_mod,
            "expires_in": ttl
        }))
        .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn get_room_messages(State(st): State<ApiState>, Path(name): Path<String>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let messages = db::load_public_messages(&st.db, &name, 100).await.unwrap_or_default();
    Json(serde_json::json!({ "messages": messages })).into_response()
}

async fn get_room_polls(State(st): State<ApiState>, Path(name): Path<String>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let polls = db::load_polls(&st.db, &name).await.unwrap_or_default();
    Json(serde_json::json!({ "polls": polls })).into_response()
}

async fn get_room_stats(State(st): State<ApiState>, Path(name): Path<String>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let sfu_stats = st.sfu.stats().await;
    let active_participants = st.registry.active_peer_count(&name).await;
    let participants = if let Some(r) = st.registry.rooms.get(&name) {
        r.read()
            .await
            .peers
            .values()
            .map(|p| {
                serde_json::json!({
                    "id": p.id,
                    "display_name": p.participant.display_name,
                    "speaking_ms": p.participant.speaking_ms,
                    "breakout_id": p.participant.breakout_id,
                    "is_moderator": p.participant.is_moderator,
                })
            })
            .collect::<Vec<_>>()
    } else {
        Vec::new()
    };

    Json(serde_json::json!({
        "room": name,
        "active_participants": active_participants,
        "sfu_peers": sfu_stats.peer_count,
        "sfu_udp_addr": sfu_stats.udp_addr,
        "speaker_stats": participants
    }))
    .into_response()
}

#[derive(Debug, Deserialize)]
struct UploadFileReq {
    filename: String,
    #[serde(default)]
    mime_type: Option<String>,
    data_base64: String,
    #[serde(default)]
    sender_name: Option<String>,
}

#[derive(Debug, Deserialize)]
struct FeedbackReq {
    rating: u8,
    #[serde(default)]
    comment: Option<String>,
}

fn sanitize_filename(raw: &str) -> String {
    let base = raw.rsplit(['/', '\\']).next().unwrap_or("file").trim();
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '_' | '-') {
                c
            } else {
                '_'
            }
        })
        .collect::<String>()
        .trim_start_matches('.')
        .chars()
        .take(120)
        .collect();
    if cleaned.is_empty() {
        "attachment.bin".to_string()
    } else {
        cleaned
    }
}

fn sanitize_mime(raw: Option<&str>) -> String {
    match raw.unwrap_or("").trim().to_ascii_lowercase().as_str() {
        "application/pdf" | "text/plain" | "text/csv" | "application/json" | "image/png" | "image/jpeg"
        | "image/webp" | "image/gif" => raw.unwrap_or("application/octet-stream").trim().to_string(),
        _ => "application/octet-stream".to_string(),
    }
}

async fn list_room_files(State(st): State<ApiState>, Path(name): Path<String>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let files = db::list_room_files(&st.db, &name, 50).await.unwrap_or_default();
    Json(serde_json::json!({ "files": files })).into_response()
}

async fn upload_room_file(
    State(st): State<ApiState>,
    Path(name): Path<String>,
    headers: HeaderMap,
    Json(req): Json<UploadFileReq>,
) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    let b64_payload = req
        .data_base64
        .split_once(";base64,")
        .map(|(_, rest)| rest)
        .unwrap_or(req.data_base64.as_str())
        .trim();
    let Ok(bytes) = base64::engine::general_purpose::STANDARD.decode(b64_payload) else {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid base64 payload" })),
        )
            .into_response();
    };
    if bytes.is_empty() || bytes.len() > 5 * 1024 * 1024 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "file must be between 1 byte and 5 MiB" })),
        )
            .into_response();
    }

    let session_user = auth::current_session_user(&st.db, &st.auth, &headers).await;
    let sender_name = req
        .sender_name
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(ToString::to_string)
        .or_else(|| session_user.map(|u| u.display_name))
        .unwrap_or_else(|| "Participant".to_string());

    let meta = SharedFileMeta {
        id: Uuid::new_v4().to_string(),
        room_name: name.clone(),
        sender_name: sender_name.chars().take(64).collect(),
        filename: sanitize_filename(&req.filename),
        mime_type: sanitize_mime(req.mime_type.as_deref()),
        size_bytes: u64::try_from(bytes.len()).unwrap_or(u64::MAX),
        created_at: chrono::Utc::now().timestamp(),
    };

    if let Err(e) = db::insert_room_file(&st.db, &meta, &bytes).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response();
    }

    st.registry.broadcast_file_shared(&name, meta.clone()).await;
    (StatusCode::CREATED, Json(serde_json::json!({ "file": meta }))).into_response()
}

async fn download_room_file(State(st): State<ApiState>, Path((name, id)): Path<(String, String)>) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    match db::get_room_file(&st.db, &name, &id).await {
        Ok(Some((meta, bytes))) => {
            let safe_name = sanitize_filename(&meta.filename);
            let safe_mime = sanitize_mime(Some(&meta.mime_type));
            (
                StatusCode::OK,
                [
                    (header::CONTENT_TYPE, safe_mime),
                    (
                        header::CONTENT_DISPOSITION,
                        format!("attachment; filename=\"{safe_name}\""),
                    ),
                    (header::X_CONTENT_TYPE_OPTIONS, "nosniff".to_string()),
                ],
                bytes,
            )
                .into_response()
        }
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({ "error": "file not found" })),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}

async fn submit_room_feedback(
    State(st): State<ApiState>,
    Path(name): Path<String>,
    Json(req): Json<FeedbackReq>,
) -> impl IntoResponse {
    if !nova_core::validate_room_slug(name.clone()) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "invalid room name" })),
        )
            .into_response();
    }
    if !(1..=5).contains(&req.rating) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "rating must be 1..=5" })),
        )
            .into_response();
    }
    let clean_comment: String = req.comment.unwrap_or_default().trim().chars().take(1000).collect();
    let id = Uuid::new_v4().to_string();
    match db::insert_room_feedback(&st.db, &id, &name, req.rating, &clean_comment).await {
        Ok(()) => (StatusCode::CREATED, Json(serde_json::json!({ "ok": true, "id": id }))).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": e.to_string() })),
        )
            .into_response(),
    }
}
