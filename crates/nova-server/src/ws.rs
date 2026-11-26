use crate::auth::{self, AuthConfig};
use crate::rooms::RoomRegistry;
use axum::{
    Router,
    extract::{
        Path, State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::get,
};
use futures::{SinkExt, StreamExt};
use nova_core::protocol::{ClientMessage, ServerMessage};
use sqlx::SqlitePool;
use std::sync::Arc;
use tokio::sync::mpsc;
use tracing::{debug, warn};
use uuid::Uuid;

#[derive(Clone)]
pub struct WsState {
    pub registry: RoomRegistry,
    pub db: SqlitePool,
    pub auth: Arc<AuthConfig>,
}

pub fn routes(registry: RoomRegistry, db: SqlitePool, auth: Arc<AuthConfig>) -> Router {
    let st = WsState { registry, db, auth };
    Router::new().route("/ws/{room}", get(ws_upgrade)).with_state(st)
}

async fn ws_upgrade(
    Path(room): Path<String>,
    headers: HeaderMap,
    ws: WebSocketUpgrade,
    State(st): State<WsState>,
) -> impl IntoResponse {
    if !nova_core::validate_room_slug(room.clone()) {
        return (StatusCode::BAD_REQUEST, "invalid room name").into_response();
    }
    let session_user = auth::current_session_user(&st.db, &st.auth, &headers).await;
    ws.on_upgrade(move |socket| handle_socket(socket, room, session_user.is_some(), st))
        .into_response()
}

async fn handle_socket(socket: WebSocket, room: String, is_host: bool, st: WsState) {
    let peer_id = format!("p-{}", &Uuid::new_v4().to_string()[..8]);
    let (mut ws_tx, mut ws_rx) = socket.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<ServerMessage>();

    let writer = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let Ok(text) = serde_json::to_string(&msg) else {
                continue;
            };
            if ws_tx.send(Message::Text(text.into())).await.is_err() {
                break;
            }
        }
    });

    let mut joined = false;

    while let Some(Ok(frame)) = ws_rx.next().await {
        match frame {
            Message::Text(text) => {
                let parsed: ClientMessage = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(e) => {
                        let _ = tx.send(ServerMessage::Error {
                            code: "bad_json".to_string(),
                            message: format!("invalid signaling message: {e}"),
                        });
                        continue;
                    }
                };
                match parsed {
                    ClientMessage::Join {
                        display_name,
                        password,
                        token,
                        audio_muted,
                        video_muted,
                        email,
                        avatar_url,
                    } => {
                        if joined {
                            continue;
                        }
                        match st
                            .registry
                            .join_peer(
                                &room,
                                peer_id.clone(),
                                display_name,
                                password,
                                token,
                                audio_muted,
                                video_muted,
                                email,
                                avatar_url,
                                is_host,
                                tx.clone(),
                            )
                            .await
                        {
                            Ok(()) => {
                                joined = true;
                                debug!(room = %room, peer_id = %peer_id, "peer joined signaling");
                            }
                            Err((code, message)) => {
                                let _ = tx.send(ServerMessage::Error { code, message });
                            }
                        }
                    }
                    other => {
                        if !joined {
                            let _ = tx.send(ServerMessage::Error {
                                code: "not_joined".to_string(),
                                message: "Send join before signaling".to_string(),
                            });
                            continue;
                        }
                        st.registry.handle_client_message(&room, &peer_id, other).await;
                    }
                }
            }
            Message::Close(_) => break,
            Message::Ping(_) | Message::Pong(_) | Message::Binary(_) => {}
        }
    }

    if joined {
        st.registry.leave_peer(&room, &peer_id).await;
    }
    writer.abort();
    warn!(room = %room, peer_id = %peer_id, "ws disconnected");
}
