use crate::db::{self, UserRow};
use anyhow::{Context, Result};
use argon2::{
    Algorithm, Argon2, Params, PasswordHash, PasswordHasher, PasswordVerifier, Version, password_hash::SaltString,
};
use axum::{
    Json, Router,
    extract::State,
    http::{HeaderMap, StatusCode, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::Utc;
use hmac::{Hmac, Mac};
use jsonwebtoken::{Algorithm as JwtAlg, DecodingKey, EncodingKey, Header, Validation, decode, encode};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

type HmacSha256 = Hmac<Sha256>;

pub const SESSION_COOKIE: &str = "nova_session";

#[derive(Debug, Clone)]
pub struct AuthConfig {
    pub session_secret: String,
    pub jwt_app_id: String,
    pub jwt_app_secret: String,
    pub secure_cookies: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionUser {
    pub id: String,
    pub email: String,
    pub display_name: String,
    pub role: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct SessionTokenPayload {
    uid: String,
    exp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiJwtUser {
    pub name: Option<String>,
    pub email: Option<String>,
    #[serde(default)]
    pub moderator: Option<bool>,
    #[serde(default)]
    pub visitor: Option<bool>,
    pub avatar: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiJwtContext {
    pub user: Option<JitsiJwtUser>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JitsiJwtClaims {
    pub aud: String,
    pub iss: String,
    pub sub: String,
    pub room: String,
    pub exp: usize,
    #[serde(default)]
    pub moderator: Option<bool>,
    #[serde(default)]
    pub visitor: Option<bool>,
    pub context: Option<JitsiJwtContext>,
}

pub fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, Params::default());
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("argon2 hash failed: {e}"))?;
    Ok(hash.to_string())
}

pub fn verify_password(password: &str, phc_hash: &str) -> bool {
    let Ok(parsed) = PasswordHash::new(phc_hash) else {
        return false;
    };
    Argon2::default().verify_password(password.as_bytes(), &parsed).is_ok()
}

pub fn sign_session_cookie(uid: &str, secret: &str, ttl_secs: i64) -> Result<String> {
    let payload = SessionTokenPayload {
        uid: uid.to_string(),
        exp: Utc::now().timestamp() + ttl_secs,
    };
    let encoded = URL_SAFE_NO_PAD.encode(serde_json::to_vec(&payload)?);
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).context("invalid session secret")?;
    mac.update(encoded.as_bytes());
    let sig = URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes());
    Ok(format!("{encoded}.{sig}"))
}

pub fn verify_session_cookie(cookie_val: &str, secret: &str) -> Option<String> {
    let (encoded, sig_b64) = cookie_val.split_once('.')?;
    let sig = URL_SAFE_NO_PAD.decode(sig_b64).ok()?;
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(encoded.as_bytes());
    mac.verify_slice(&sig).ok()?;
    let raw = URL_SAFE_NO_PAD.decode(encoded).ok()?;
    let payload: SessionTokenPayload = serde_json::from_slice(&raw).ok()?;
    if payload.exp < Utc::now().timestamp() {
        return None;
    }
    Some(payload.uid)
}

pub fn extract_cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    let raw = headers.get(header::COOKIE)?.to_str().ok()?;
    for part in raw.split(';') {
        let trimmed = part.trim();
        if let Some((k, v)) = trimmed.split_once('=')
            && k.trim() == name
        {
            return Some(v.trim().to_string());
        }
    }
    None
}

pub async fn current_session_user(pool: &SqlitePool, cfg: &AuthConfig, headers: &HeaderMap) -> Option<SessionUser> {
    let cookie = extract_cookie_value(headers, SESSION_COOKIE)?;
    let uid = verify_session_cookie(&cookie, &cfg.session_secret)?;
    let row: UserRow = db::find_user_by_id(pool, &uid).await.ok()??;
    Some(SessionUser {
        id: row.id,
        email: row.email,
        display_name: row.display_name,
        role: row.role,
    })
}

pub fn mint_room_jwt(
    cfg: &AuthConfig,
    room: &str,
    display_name: &str,
    email: Option<&str>,
    moderator: bool,
    ttl_secs: i64,
) -> Result<String> {
    let exp = usize::try_from((Utc::now().timestamp() + ttl_secs).max(0)).unwrap_or(usize::MAX);
    let claims = JitsiJwtClaims {
        aud: cfg.jwt_app_id.clone(),
        iss: cfg.jwt_app_id.clone(),
        sub: "nova".to_string(),
        room: room.to_string(),
        exp,
        moderator: Some(moderator),
        visitor: None,
        context: Some(JitsiJwtContext {
            user: Some(JitsiJwtUser {
                name: Some(display_name.to_string()),
                email: email.map(ToString::to_string),
                moderator: Some(moderator),
                visitor: None,
                avatar: None,
            }),
        }),
    };
    encode(
        &Header::new(JwtAlg::HS256),
        &claims,
        &EncodingKey::from_secret(cfg.jwt_app_secret.as_bytes()),
    )
    .context("failed to sign room JWT")
}

pub fn verify_room_jwt(cfg: &AuthConfig, token: &str, room: &str) -> Option<JitsiJwtClaims> {
    let mut validation = Validation::new(JwtAlg::HS256);
    validation.set_audience(&[cfg.jwt_app_id.as_str()]);
    let data = decode::<JitsiJwtClaims>(
        token,
        &DecodingKey::from_secret(cfg.jwt_app_secret.as_bytes()),
        &validation,
    )
    .ok()?;
    if data.claims.room != "*" && data.claims.room != room {
        return None;
    }
    Some(data.claims)
}

#[derive(Clone)]
pub struct AuthRouterState {
    pub db: SqlitePool,
    pub auth: Arc<AuthConfig>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterReq {
    pub email: String,
    pub display_name: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginReq {
    pub email: String,
    pub password: String,
}

pub fn routes(db: SqlitePool, auth: Arc<AuthConfig>) -> Router {
    let state = AuthRouterState { db, auth };
    Router::new()
        .route("/api/auth/register", post(handle_register))
        .route("/api/auth/login", post(handle_login))
        .route("/api/auth/logout", post(handle_logout))
        .route("/api/auth/me", get(handle_me))
        .with_state(state)
}

fn cookie_header_value(token: &str, secure: bool, max_age: i64) -> String {
    let secure_flag = if secure { "; Secure" } else { "" };
    format!("{SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure_flag}")
}

async fn handle_register(State(st): State<AuthRouterState>, Json(req): Json<RegisterReq>) -> Response {
    if req.email.trim().is_empty() || !req.email.contains('@') || req.display_name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "valid email and display_name required"})),
        )
            .into_response();
    }
    if req.password.len() < 8 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "password must be at least 8 characters"})),
        )
            .into_response();
    }
    match db::find_user_by_email(&st.db, &req.email).await {
        Ok(Some(_)) => {
            return (
                StatusCode::CONFLICT,
                Json(serde_json::json!({"error": "email already registered"})),
            )
                .into_response();
        }
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response();
        }
        Ok(None) => {}
    }

    let Ok(pw_hash) = hash_password(&req.password) else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "password hashing failed"})),
        )
            .into_response();
    };
    let uid = Uuid::new_v4().to_string();
    let user = match db::create_user(&st.db, &uid, &req.email, &req.display_name, &pw_hash, "host").await {
        Ok(u) => u,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": e.to_string()})),
            )
                .into_response();
        }
    };

    let Ok(cookie_tok) = sign_session_cookie(&user.id, &st.auth.session_secret, 60 * 60 * 24 * 7) else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "session signing failed"})),
        )
            .into_response();
    };

    (
        StatusCode::CREATED,
        [(
            header::SET_COOKIE,
            cookie_header_value(&cookie_tok, st.auth.secure_cookies, 60 * 60 * 24 * 7),
        )],
        Json(serde_json::json!({
            "user": SessionUser {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                role: user.role,
            }
        })),
    )
        .into_response()
}

async fn handle_login(State(st): State<AuthRouterState>, Json(req): Json<LoginReq>) -> Response {
    let Ok(Some(user)) = db::find_user_by_email(&st.db, &req.email).await else {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "invalid credentials"})),
        )
            .into_response();
    };
    if !verify_password(&req.password, &user.password_hash) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "invalid credentials"})),
        )
            .into_response();
    }
    let Ok(cookie_tok) = sign_session_cookie(&user.id, &st.auth.session_secret, 60 * 60 * 24 * 7) else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({"error": "session signing failed"})),
        )
            .into_response();
    };

    (
        StatusCode::OK,
        [(
            header::SET_COOKIE,
            cookie_header_value(&cookie_tok, st.auth.secure_cookies, 60 * 60 * 24 * 7),
        )],
        Json(serde_json::json!({
            "user": SessionUser {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                role: user.role,
            }
        })),
    )
        .into_response()
}

async fn handle_logout(State(st): State<AuthRouterState>) -> Response {
    (
        StatusCode::OK,
        [(header::SET_COOKIE, cookie_header_value("", st.auth.secure_cookies, 0))],
        Json(serde_json::json!({"ok": true})),
    )
        .into_response()
}

async fn handle_me(State(st): State<AuthRouterState>, headers: HeaderMap) -> Response {
    match current_session_user(&st.db, &st.auth, &headers).await {
        Some(user) => (StatusCode::OK, Json(serde_json::json!({ "user": user }))).into_response(),
        None => (StatusCode::OK, Json(serde_json::json!({ "user": null }))).into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn argon2id_and_session_and_jwt_roundtrip() {
        let hash = hash_password("NovaPass-2026!").expect("hash");
        assert!(hash.starts_with("$argon2id$"));
        assert!(verify_password("NovaPass-2026!", &hash));
        assert!(!verify_password("wrong", &hash));

        let cookie = sign_session_cookie("u-1", "super-secret-key", 600).expect("sign cookie");
        assert_eq!(
            verify_session_cookie(&cookie, "super-secret-key").as_deref(),
            Some("u-1")
        );
        assert!(verify_session_cookie(&cookie, "other-secret").is_none());

        let cfg = AuthConfig {
            session_secret: "super-secret-key".into(),
            jwt_app_id: "nova-meet".into(),
            jwt_app_secret: "jwt-secret".into(),
            secure_cookies: false,
        };
        let jwt = mint_room_jwt(&cfg, "standup", "Alice", Some("alice@nova.dev"), true, 600).expect("mint jwt");
        let claims = verify_room_jwt(&cfg, &jwt, "standup").expect("verify jwt");
        assert_eq!(claims.room, "standup");
        assert_eq!(claims.moderator, Some(true));
        assert!(verify_room_jwt(&cfg, &jwt, "other-room").is_none());
    }
}
