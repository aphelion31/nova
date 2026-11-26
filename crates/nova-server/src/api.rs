use crate::auth::{self, AuthConfig};
use crate::db;
use crate::rooms::RoomRegistry;
use crate::sfu::SfuHandle;
use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
};
use nova_core::protocol::IceServerConfig;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

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
