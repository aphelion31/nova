use anyhow::{Context, Result};
use chrono::Utc;
use nova_core::protocol::{ChatMessage, Poll, PollOption};
use sqlx::{
    Row, SqlitePool,
    sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions, SqliteSynchronous},
};
use std::str::FromStr;

#[derive(Debug, Clone)]
pub struct UserRow {
    pub id: String,
    pub email: String,
    pub display_name: String,
    pub password_hash: String,
    pub role: String,
}

#[derive(Debug, Clone)]
pub struct RoomRecord {
    pub name: String,
    #[expect(dead_code, reason = "persisted room creator retained for audit/admin views")]
    pub created_by: Option<String>,
    pub subject: String,
    pub locked: bool,
    pub password_hash: Option<String>,
    pub lobby_enabled: bool,
    pub e2ee_enabled: bool,
    #[expect(dead_code, reason = "persisted timestamp retained for room metadata")]
    pub created_at: i64,
    pub last_active_at: i64,
}

pub async fn connect_and_migrate(database_url: &str) -> Result<SqlitePool> {
    let opts = SqliteConnectOptions::from_str(database_url)
        .with_context(|| format!("invalid DATABASE_URL: {database_url}"))?
        .create_if_missing(true)
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal);

    let pool = SqlitePoolOptions::new()
        .max_connections(8)
        .connect_with(opts)
        .await
        .context("failed to connect to sqlite")?;

    let schema = include_str!("../migrations/0001_init.sql");
    sqlx::raw_sql(schema)
        .execute(&pool)
        .await
        .context("failed to run initial sqlite schema")?;

    Ok(pool)
}

pub async fn find_user_by_email(pool: &SqlitePool, email: &str) -> Result<Option<UserRow>> {
    let row =
        sqlx::query("SELECT id, email, display_name, password_hash, role FROM users WHERE lower(email) = lower(?)")
            .bind(email.trim())
            .fetch_optional(pool)
            .await?;

    Ok(row.map(|r| UserRow {
        id: r.get("id"),
        email: r.get("email"),
        display_name: r.get("display_name"),
        password_hash: r.get("password_hash"),
        role: r.get("role"),
    }))
}

pub async fn find_user_by_id(pool: &SqlitePool, id: &str) -> Result<Option<UserRow>> {
    let row = sqlx::query("SELECT id, email, display_name, password_hash, role FROM users WHERE id = ?")
        .bind(id)
        .fetch_optional(pool)
        .await?;

    Ok(row.map(|r| UserRow {
        id: r.get("id"),
        email: r.get("email"),
        display_name: r.get("display_name"),
        password_hash: r.get("password_hash"),
        role: r.get("role"),
    }))
}

pub async fn create_user(
    pool: &SqlitePool,
    id: &str,
    email: &str,
    display_name: &str,
    password_hash: &str,
    role: &str,
) -> Result<UserRow> {
    let now = Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO users (id, email, display_name, password_hash, role, created_at) VALUES (?, lower(?), ?, ?, ?, ?)",
    )
    .bind(id)
    .bind(email.trim())
    .bind(display_name.trim())
    .bind(password_hash)
    .bind(role)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(UserRow {
        id: id.to_string(),
        email: email.trim().to_lowercase(),
        display_name: display_name.trim().to_string(),
        password_hash: password_hash.to_string(),
        role: role.to_string(),
    })
}

pub async fn get_or_create_room(pool: &SqlitePool, name: &str, created_by: Option<&str>) -> Result<RoomRecord> {
    if let Some(existing) = get_room(pool, name).await? {
        let now = Utc::now().timestamp();
        sqlx::query("UPDATE rooms SET last_active_at = ? WHERE name = ?")
            .bind(now)
            .bind(name)
            .execute(pool)
            .await?;
        return Ok(existing);
    }

    let now = Utc::now().timestamp();
    sqlx::query(
        "INSERT INTO rooms (name, created_by, subject, locked, password_hash, lobby_enabled, e2ee_enabled, created_at, last_active_at)
         VALUES (?, ?, ?, 0, NULL, 0, 0, ?, ?)
         ON CONFLICT(name) DO UPDATE SET last_active_at = excluded.last_active_at",
    )
    .bind(name)
    .bind(created_by)
    .bind(name)
    .bind(now)
    .bind(now)
    .execute(pool)
    .await?;

    Ok(RoomRecord {
        name: name.to_string(),
        created_by: created_by.map(ToString::to_string),
        subject: name.to_string(),
        locked: false,
        password_hash: None,
        lobby_enabled: false,
        e2ee_enabled: false,
        created_at: now,
        last_active_at: now,
    })
}

pub async fn get_room(pool: &SqlitePool, name: &str) -> Result<Option<RoomRecord>> {
    let row = sqlx::query(
        "SELECT name, created_by, subject, locked, password_hash, lobby_enabled, e2ee_enabled, created_at, last_active_at
         FROM rooms WHERE name = ?",
    )
    .bind(name)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| RoomRecord {
        name: r.get("name"),
        created_by: r.get("created_by"),
        subject: r.get("subject"),
        locked: r.get::<i64, _>("locked") != 0,
        password_hash: r.get("password_hash"),
        lobby_enabled: r.get::<i64, _>("lobby_enabled") != 0,
        e2ee_enabled: r.get::<i64, _>("e2ee_enabled") != 0,
        created_at: r.get("created_at"),
        last_active_at: r.get("last_active_at"),
    }))
}

pub async fn list_recent_rooms(pool: &SqlitePool, limit: i64) -> Result<Vec<RoomRecord>> {
    let rows = sqlx::query(
        "SELECT name, created_by, subject, locked, password_hash, lobby_enabled, e2ee_enabled, created_at, last_active_at
         FROM rooms ORDER BY last_active_at DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| RoomRecord {
            name: r.get("name"),
            created_by: r.get("created_by"),
            subject: r.get("subject"),
            locked: r.get::<i64, _>("locked") != 0,
            password_hash: r.get("password_hash"),
            lobby_enabled: r.get::<i64, _>("lobby_enabled") != 0,
            e2ee_enabled: r.get::<i64, _>("e2ee_enabled") != 0,
            created_at: r.get("created_at"),
            last_active_at: r.get("last_active_at"),
        })
        .collect())
}

pub async fn update_room_security(
    pool: &SqlitePool,
    name: &str,
    subject: &str,
    locked: bool,
    password_hash: Option<&str>,
    lobby_enabled: bool,
    e2ee_enabled: bool,
) -> Result<()> {
    let now = Utc::now().timestamp();
    sqlx::query(
        "UPDATE rooms
         SET subject = ?, locked = ?, password_hash = ?, lobby_enabled = ?, e2ee_enabled = ?, last_active_at = ?
         WHERE name = ?",
    )
    .bind(subject)
    .bind(i64::from(locked))
    .bind(password_hash)
    .bind(i64::from(lobby_enabled))
    .bind(i64::from(e2ee_enabled))
    .bind(now)
    .bind(name)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn insert_chat_message(pool: &SqlitePool, room_name: &str, msg: &ChatMessage) -> Result<()> {
    sqlx::query(
        "INSERT INTO chat_messages (id, room_name, sender_id, sender_name, recipient_id, body, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&msg.id)
    .bind(room_name)
    .bind(&msg.sender_id)
    .bind(&msg.sender_name)
    .bind(&msg.recipient_id)
    .bind(&msg.body)
    .bind(msg.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn load_public_messages(pool: &SqlitePool, room_name: &str, limit: i64) -> Result<Vec<ChatMessage>> {
    let rows = sqlx::query(
        "SELECT id, sender_id, sender_name, recipient_id, body, created_at
         FROM chat_messages
         WHERE room_name = ? AND recipient_id IS NULL
         ORDER BY created_at ASC
         LIMIT ?",
    )
    .bind(room_name)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(rows
        .into_iter()
        .map(|r| ChatMessage {
            id: r.get("id"),
            sender_id: r.get("sender_id"),
            sender_name: r.get("sender_name"),
            recipient_id: r.get("recipient_id"),
            body: r.get("body"),
            created_at: r.get("created_at"),
        })
        .collect())
}

pub async fn upsert_poll(pool: &SqlitePool, room_name: &str, poll: &Poll) -> Result<()> {
    let options_json = serde_json::to_string(&poll.options)?;
    sqlx::query(
        "INSERT INTO polls (id, room_name, creator_id, creator_name, question, options_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET options_json = excluded.options_json",
    )
    .bind(&poll.id)
    .bind(room_name)
    .bind(&poll.creator_id)
    .bind(&poll.creator_name)
    .bind(&poll.question)
    .bind(options_json)
    .bind(poll.created_at)
    .execute(pool)
    .await?;
    Ok(())
}

pub async fn load_polls(pool: &SqlitePool, room_name: &str) -> Result<Vec<Poll>> {
    let rows = sqlx::query(
        "SELECT id, creator_id, creator_name, question, options_json, created_at
         FROM polls WHERE room_name = ? ORDER BY created_at ASC",
    )
    .bind(room_name)
    .fetch_all(pool)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for r in rows {
        let options_json: String = r.get("options_json");
        let options: Vec<PollOption> = serde_json::from_str(&options_json).unwrap_or_default();
        out.push(Poll {
            id: r.get("id"),
            creator_id: r.get("creator_id"),
            creator_name: r.get("creator_name"),
            question: r.get("question"),
            options,
            created_at: r.get("created_at"),
        });
    }
    Ok(out)
}
