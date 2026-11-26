CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY NOT NULL,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'host',
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    name TEXT PRIMARY KEY NOT NULL,
    created_by TEXT,
    subject TEXT NOT NULL DEFAULT '',
    locked INTEGER NOT NULL DEFAULT 0,
    password_hash TEXT,
    lobby_enabled INTEGER NOT NULL DEFAULT 0,
    e2ee_enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_active_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY NOT NULL,
    room_name TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    recipient_id TEXT,
    body TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created
    ON chat_messages (room_name, created_at);

CREATE TABLE IF NOT EXISTS polls (
    id TEXT PRIMARY KEY NOT NULL,
    room_name TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    creator_name TEXT NOT NULL,
    question TEXT NOT NULL,
    options_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_polls_room_created
    ON polls (room_name, created_at);

CREATE TABLE IF NOT EXISTS room_sessions (
    id TEXT PRIMARY KEY NOT NULL,
    room_name TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    peak_participants INTEGER NOT NULL DEFAULT 0
);
