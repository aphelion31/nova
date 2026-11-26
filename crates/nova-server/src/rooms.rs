use crate::auth::{self, AuthConfig};
use crate::db;
use crate::sfu::SfuHandle;
use chrono::Utc;
use dashmap::DashMap;
use nova_core::protocol::{
    BreakoutRoom, ChatMessage, ClientMessage, FollowMeState, LobbyEntry, MediaTrackKind, ModerationAction, Participant,
    Poll, PollOption, RoomSecurityState, ServerMessage, SharedFileMeta, SharedVideoState, SubtitleEntry, TrackMeta,
    WhiteboardStroke,
};
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::{RwLock, mpsc};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct PeerConn {
    pub id: String,
    pub participant: Participant,
    pub tx: mpsc::UnboundedSender<ServerMessage>,
}

#[derive(Debug)]
pub struct RoomState {
    pub name: String,
    pub security: RoomSecurityState,
    pub password_hash: Option<String>,
    pub peers: HashMap<String, PeerConn>,
    pub lobby: HashMap<String, (LobbyEntry, PeerConn)>,
    pub messages: Vec<ChatMessage>,
    pub polls: Vec<Poll>,
    pub breakouts: Vec<BreakoutRoom>,
    pub strokes: Vec<WhiteboardStroke>,
    pub shared_video: Option<SharedVideoState>,
    pub follow_me: Option<FollowMeState>,
    pub files: Vec<SharedFileMeta>,
}

#[derive(Clone)]
pub struct RoomRegistry {
    pub rooms: Arc<DashMap<String, Arc<RwLock<RoomState>>>>,
    pub db: SqlitePool,
    pub auth: Arc<AuthConfig>,
    pub sfu: SfuHandle,
    pub ice_servers: Vec<nova_core::protocol::IceServerConfig>,
}

impl RoomRegistry {
    pub fn new(
        db: SqlitePool,
        auth: Arc<AuthConfig>,
        sfu: SfuHandle,
        ice_servers: Vec<nova_core::protocol::IceServerConfig>,
    ) -> Self {
        Self {
            rooms: Arc::new(DashMap::new()),
            db,
            auth,
            sfu,
            ice_servers,
        }
    }

    pub async fn get_or_load_room(&self, room_name: &str) -> Result<Arc<RwLock<RoomState>>, String> {
        if !nova_core::validate_room_slug(room_name.to_string()) {
            return Err("invalid room slug".to_string());
        }
        if let Some(existing) = self.rooms.get(room_name) {
            return Ok(Arc::clone(existing.value()));
        }

        let record = db::get_or_create_room(&self.db, room_name, None)
            .await
            .map_err(|e| format!("db error: {e}"))?;
        let messages = db::load_public_messages(&self.db, room_name, 100)
            .await
            .unwrap_or_default();
        let polls = db::load_polls(&self.db, room_name).await.unwrap_or_default();
        let files = db::list_room_files(&self.db, room_name, 50).await.unwrap_or_default();

        let state = RoomState {
            name: room_name.to_string(),
            security: RoomSecurityState {
                locked: record.locked,
                lobby_enabled: record.lobby_enabled,
                e2ee_enabled: record.e2ee_enabled,
                has_password: record.password_hash.is_some(),
                subject: if record.subject.is_empty() {
                    room_name.to_string()
                } else {
                    record.subject
                },
                start_audio_muted: record.start_audio_muted,
                start_video_muted: record.start_video_muted,
            },
            password_hash: record.password_hash,
            peers: HashMap::new(),
            lobby: HashMap::new(),
            messages,
            polls,
            breakouts: Vec::new(),
            strokes: Vec::new(),
            shared_video: None,
            follow_me: None,
            files,
        };

        let entry = self
            .rooms
            .entry(room_name.to_string())
            .or_insert_with(|| Arc::new(RwLock::new(state)));
        Ok(Arc::clone(entry.value()))
    }

    pub async fn active_peer_count(&self, room_name: &str) -> usize {
        if let Some(room) = self.rooms.get(room_name) {
            room.read().await.peers.len()
        } else {
            0
        }
    }

    pub async fn broadcast_file_shared(&self, room_name: &str, file: SharedFileMeta) {
        let Some(room_arc) = self.rooms.get(room_name).map(|r| Arc::clone(r.value())) else {
            return;
        };
        let mut room = room_arc.write().await;
        if !room.files.iter().any(|f| f.id == file.id) {
            room.files.push(file.clone());
        }
        broadcast_all(&room, ServerMessage::FileShared { file });
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn join_peer(
        &self,
        room_name: &str,
        peer_id: String,
        display_name: String,
        password: Option<String>,
        token: Option<String>,
        audio_muted: bool,
        video_muted: bool,
        email: Option<String>,
        avatar_url: Option<String>,
        is_authenticated_host: bool,
        tx: mpsc::UnboundedSender<ServerMessage>,
    ) -> Result<(), (String, String)> {
        let room_arc = self
            .get_or_load_room(room_name)
            .await
            .map_err(|e| ("invalid_room".to_string(), e))?;

        let jwt_claims = token
            .as_deref()
            .and_then(|tok| auth::verify_room_jwt(&self.auth, tok, room_name));
        if token.as_deref().is_some_and(|t| !t.trim().is_empty()) && jwt_claims.is_none() {
            return Err(("invalid_token".to_string(), "Invalid or expired room JWT".to_string()));
        }

        let jwt_moderator = jwt_claims
            .as_ref()
            .map(|c| {
                c.moderator.unwrap_or(false)
                    || c.context
                        .as_ref()
                        .and_then(|ctx| ctx.user.as_ref())
                        .and_then(|u| u.moderator)
                        .unwrap_or(false)
            })
            .unwrap_or(false);

        let now = Utc::now().timestamp();
        let clean_name = if display_name.trim().is_empty() {
            jwt_claims
                .as_ref()
                .and_then(|c| c.context.as_ref())
                .and_then(|ctx| ctx.user.as_ref())
                .and_then(|u| u.name.clone())
                .unwrap_or_else(|| "Guest".to_string())
        } else {
            display_name.trim().to_string()
        };

        let mut room = room_arc.write().await;

        let first_in_room = room.peers.is_empty();
        let is_moderator = first_in_room || is_authenticated_host || jwt_moderator;

        if room.security.locked && !is_moderator {
            let Some(expected_hash) = room.password_hash.as_deref() else {
                return Err(("room_locked".to_string(), "Room is locked by the host".to_string()));
            };
            let ok = password
                .as_deref()
                .is_some_and(|pw| auth::verify_password(pw, expected_hash));
            if !ok {
                return Err(("invalid_password".to_string(), "Incorrect room password".to_string()));
            }
        }

        let eff_audio_muted = audio_muted || (!is_moderator && room.security.start_audio_muted);
        let eff_video_muted = video_muted || (!is_moderator && room.security.start_video_muted);

        let participant = Participant {
            id: peer_id.clone(),
            display_name: clean_name.clone(),
            email: email.or_else(|| {
                jwt_claims
                    .as_ref()
                    .and_then(|c| c.context.as_ref())
                    .and_then(|ctx| ctx.user.as_ref())
                    .and_then(|u| u.email.clone())
            }),
            avatar_url,
            is_moderator,
            audio_muted: eff_audio_muted,
            video_muted: eff_video_muted,
            screen_sharing: false,
            hand_raised: false,
            audio_level: 0.0,
            breakout_id: None,
            joined_at: now,
            speaking_ms: 0,
        };

        let conn = PeerConn {
            id: peer_id.clone(),
            participant: participant.clone(),
            tx: tx.clone(),
        };

        if room.security.lobby_enabled && !is_moderator {
            let entry = LobbyEntry {
                peer_id: peer_id.clone(),
                display_name: clean_name,
                requested_at: now,
            };
            room.lobby.insert(peer_id.clone(), (entry.clone(), conn));
            let _ = tx.send(ServerMessage::LobbyWaiting {
                room: room_name.to_string(),
                message: "Waiting for a moderator to admit you…".to_string(),
            });
            for p in room.peers.values() {
                if p.participant.is_moderator {
                    let _ = p.tx.send(ServerMessage::LobbyRequest { entry: entry.clone() });
                }
            }
            return Ok(());
        }

        Self::admit_locked(&mut room, conn, &self.ice_servers);
        Ok(())
    }

    fn admit_locked(room: &mut RoomState, conn: PeerConn, ice_servers: &[nova_core::protocol::IceServerConfig]) {
        let joined_participant = conn.participant.clone();
        room.peers.insert(conn.id.clone(), conn.clone());

        let participants: Vec<Participant> = room.peers.values().map(|p| p.participant.clone()).collect();
        let lobby: Vec<LobbyEntry> = if joined_participant.is_moderator {
            room.lobby.values().map(|(e, _)| e.clone()).collect()
        } else {
            Vec::new()
        };

        let visible_messages: Vec<ChatMessage> = room
            .messages
            .iter()
            .filter(|m| {
                m.recipient_id.is_none() || m.recipient_id.as_deref() == Some(&conn.id) || m.sender_id == conn.id
            })
            .cloned()
            .collect();

        let _ = conn.tx.send(ServerMessage::Joined {
            self_id: conn.id.clone(),
            room: room.name.clone(),
            is_moderator: joined_participant.is_moderator,
            ice_servers: ice_servers.to_vec(),
            participants,
            messages: visible_messages,
            polls: room.polls.clone(),
            breakouts: room.breakouts.clone(),
            strokes: room.strokes.clone(),
            lobby,
            security: room.security.clone(),
            shared_video: room.shared_video.clone(),
            follow_me: room.follow_me.clone(),
            files: room.files.clone(),
        });

        for other in room.peers.values() {
            if other.id != conn.id {
                let _ = other.tx.send(ServerMessage::ParticipantJoined {
                    participant: joined_participant.clone(),
                });
            }
        }
    }

    pub async fn handle_client_message(&self, room_name: &str, peer_id: &str, msg: ClientMessage) {
        let Some(room_arc) = self.rooms.get(room_name).map(|r| Arc::clone(r.value())) else {
            return;
        };

        match msg {
            ClientMessage::RtcOffer { sdp } => {
                let (breakout_id, signal_tx) = {
                    let room = room_arc.read().await;
                    let Some(peer) = room.peers.get(peer_id) else {
                        return;
                    };
                    (peer.participant.breakout_id.clone(), peer.tx.clone())
                };
                match self
                    .sfu
                    .accept_offer(
                        room_name.to_string(),
                        breakout_id,
                        peer_id.to_string(),
                        sdp,
                        signal_tx.clone(),
                    )
                    .await
                {
                    Ok(()) => {}
                    Err(err) => {
                        let _ = signal_tx.send(ServerMessage::Error {
                            code: "sfu_offer_failed".to_string(),
                            message: err,
                        });
                    }
                }
            }
            ClientMessage::RtcRenegotiateAnswer { sdp } => {
                let signal_tx = {
                    let room = room_arc.read().await;
                    room.peers.get(peer_id).map(|p| p.tx.clone())
                };
                if let Err(err) = self.sfu.accept_answer(peer_id.to_string(), sdp).await
                    && let Some(tx) = signal_tx
                {
                    let _ = tx.send(ServerMessage::Error {
                        code: "sfu_answer_failed".to_string(),
                        message: err,
                    });
                }
            }
            ClientMessage::MediaState {
                audio_muted,
                video_muted,
                screen_sharing,
                audio_level,
            } => {
                let mut room = room_arc.write().await;
                if let Some(peer) = room.peers.get_mut(peer_id) {
                    peer.participant.audio_muted = audio_muted;
                    peer.participant.video_muted = video_muted;
                    peer.participant.screen_sharing = screen_sharing;
                    peer.participant.audio_level = audio_level.clamp(0.0, 1.0);
                    if !audio_muted && audio_level > 0.08 {
                        peer.participant.speaking_ms = peer.participant.speaking_ms.saturating_add(500);
                    }
                    let updated = peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            ClientMessage::SetDisplayName { display_name } => {
                let clean = display_name.trim();
                if clean.is_empty() {
                    return;
                }
                let mut room = room_arc.write().await;
                if let Some(peer) = room.peers.get_mut(peer_id) {
                    peer.participant.display_name = clean.to_string();
                    let updated = peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            ClientMessage::ChatSend {
                body,
                recipient_id,
                reply_to_id,
            } => {
                let trimmed = body.trim();
                if trimmed.is_empty() {
                    return;
                }
                let chat_msg = {
                    let mut room = room_arc.write().await;
                    let (sender_name, sender_tx) = {
                        let Some(sender) = room.peers.get(peer_id) else {
                            return;
                        };
                        (sender.participant.display_name.clone(), sender.tx.clone())
                    };
                    let reply_target = reply_to_id.as_deref().and_then(|rid| {
                        room.messages
                            .iter()
                            .find(|m| {
                                m.id == rid
                                    && (m.recipient_id.is_none()
                                        || m.sender_id == peer_id
                                        || m.recipient_id.as_deref() == Some(peer_id))
                            })
                            .map(|m| {
                                (
                                    m.id.clone(),
                                    m.sender_name.clone(),
                                    m.body.chars().take(140).collect::<String>(),
                                )
                            })
                    });
                    let msg = ChatMessage {
                        id: Uuid::new_v4().to_string(),
                        sender_id: peer_id.to_string(),
                        sender_name,
                        recipient_id: recipient_id.clone(),
                        body: trimmed.to_string(),
                        created_at: Utc::now().timestamp(),
                        reply_to_id: reply_target.as_ref().map(|(id, _, _)| id.clone()),
                        reply_to_sender: reply_target.as_ref().map(|(_, s, _)| s.clone()),
                        reply_to_body: reply_target.map(|(_, _, b)| b),
                    };
                    room.messages.push(msg.clone());
                    if let Some(ref target_id) = recipient_id {
                        let _ = sender_tx.send(ServerMessage::ChatMessage { message: msg.clone() });
                        if let Some(target) = room.peers.get(target_id)
                            && target_id != peer_id
                        {
                            let _ = target.tx.send(ServerMessage::ChatMessage { message: msg.clone() });
                        }
                    } else {
                        broadcast_all(&room, ServerMessage::ChatMessage { message: msg.clone() });
                    }
                    msg
                };
                if chat_msg.recipient_id.is_none() {
                    let _ = db::insert_chat_message(&self.db, room_name, &chat_msg).await;
                }
            }
            ClientMessage::Reaction { emoji } => {
                let room = room_arc.read().await;
                if let Some(sender) = room.peers.get(peer_id) {
                    broadcast_all(
                        &room,
                        ServerMessage::Reaction {
                            peer_id: peer_id.to_string(),
                            display_name: sender.participant.display_name.clone(),
                            emoji,
                        },
                    );
                }
            }
            ClientMessage::RaiseHand { raised } => {
                let mut room = room_arc.write().await;
                if let Some(peer) = room.peers.get_mut(peer_id) {
                    peer.participant.hand_raised = raised;
                    let updated = peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            ClientMessage::PollCreate { question, options } => {
                let q = question.trim();
                let clean_opts: Vec<PollOption> = options
                    .into_iter()
                    .map(|o| o.trim().to_string())
                    .filter(|o| !o.is_empty())
                    .map(|text| PollOption {
                        text,
                        voters: Vec::new(),
                    })
                    .collect();
                if q.is_empty() || clean_opts.len() < 2 {
                    return;
                }
                let poll = {
                    let mut room = room_arc.write().await;
                    let Some(sender) = room.peers.get(peer_id) else {
                        return;
                    };
                    let poll = Poll {
                        id: Uuid::new_v4().to_string(),
                        creator_id: peer_id.to_string(),
                        creator_name: sender.participant.display_name.clone(),
                        question: q.to_string(),
                        options: clean_opts,
                        created_at: Utc::now().timestamp(),
                    };
                    room.polls.push(poll.clone());
                    broadcast_all(&room, ServerMessage::PollUpdated { poll: poll.clone() });
                    poll
                };
                let _ = db::upsert_poll(&self.db, room_name, &poll).await;
            }
            ClientMessage::PollVote { poll_id, option_index } => {
                let updated_poll = {
                    let mut room = room_arc.write().await;
                    if !room.peers.contains_key(peer_id) {
                        return;
                    }
                    let Some(poll) = room.polls.iter_mut().find(|p| p.id == poll_id) else {
                        return;
                    };
                    let idx = usize::try_from(option_index).unwrap_or(usize::MAX);
                    if idx >= poll.options.len() {
                        return;
                    }
                    for opt in &mut poll.options {
                        opt.voters.retain(|v| v != peer_id);
                    }
                    poll.options[idx].voters.push(peer_id.to_string());
                    let snapshot = poll.clone();
                    broadcast_all(&room, ServerMessage::PollUpdated { poll: snapshot.clone() });
                    snapshot
                };
                let _ = db::upsert_poll(&self.db, room_name, &updated_poll).await;
            }
            ClientMessage::WhiteboardStroke { mut stroke } => {
                let mut room = room_arc.write().await;
                if !room.peers.contains_key(peer_id) {
                    return;
                }
                stroke.author_id = peer_id.to_string();
                room.strokes.push(stroke.clone());
                if room.strokes.len() > 2000 {
                    let drain_to = room.strokes.len() - 2000;
                    room.strokes.drain(0..drain_to);
                }
                broadcast_all(&room, ServerMessage::WhiteboardStroke { stroke });
            }
            ClientMessage::WhiteboardClear => {
                let mut room = room_arc.write().await;
                if !room.peers.contains_key(peer_id) {
                    return;
                }
                room.strokes.clear();
                broadcast_all(&room, ServerMessage::WhiteboardCleared);
            }
            ClientMessage::BreakoutCreate { name } => {
                let clean = name.trim();
                if clean.is_empty() {
                    return;
                }
                let mut room = room_arc.write().await;
                let Some(peer) = room.peers.get(peer_id) else {
                    return;
                };
                if !peer.participant.is_moderator {
                    let _ = peer.tx.send(ServerMessage::Error {
                        code: "forbidden".to_string(),
                        message: "Only moderators can create breakout rooms".to_string(),
                    });
                    return;
                }
                room.breakouts.push(BreakoutRoom {
                    id: Uuid::new_v4().to_string()[..8].to_string(),
                    name: clean.to_string(),
                });
                broadcast_all(
                    &room,
                    ServerMessage::BreakoutUpdated {
                        breakouts: room.breakouts.clone(),
                    },
                );
            }
            ClientMessage::BreakoutMove { breakout_id } => {
                let moved = {
                    let mut room = room_arc.write().await;
                    if let Some(ref bid) = breakout_id
                        && !room.breakouts.iter().any(|b| &b.id == bid)
                    {
                        return;
                    }
                    let Some(peer) = room.peers.get_mut(peer_id) else {
                        return;
                    };
                    peer.participant.breakout_id = breakout_id.clone();
                    let updated = peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                    Some(breakout_id)
                };
                if let Some(bid) = moved {
                    self.sfu.update_breakout(peer_id.to_string(), bid).await;
                }
            }
            ClientMessage::RoomSecurity {
                locked,
                password,
                clear_password,
                lobby_enabled,
                e2ee_enabled,
                subject,
            } => {
                let updated = {
                    let mut room = room_arc.write().await;
                    let Some(actor) = room.peers.get(peer_id) else {
                        return;
                    };
                    if !actor.participant.is_moderator {
                        let _ = actor.tx.send(ServerMessage::Error {
                            code: "forbidden".to_string(),
                            message: "Only moderators can change room security".to_string(),
                        });
                        return;
                    }
                    if let Some(l) = locked {
                        room.security.locked = l;
                    }
                    if let Some(lob) = lobby_enabled {
                        room.security.lobby_enabled = lob;
                    }
                    if let Some(e2) = e2ee_enabled {
                        room.security.e2ee_enabled = e2;
                    }
                    if let Some(subj) = subject
                        && !subj.trim().is_empty()
                    {
                        room.security.subject = subj.trim().to_string();
                    }
                    if clear_password {
                        room.password_hash = None;
                        room.security.has_password = false;
                        room.security.locked = false;
                    } else if let Some(pw) = password
                        && !pw.is_empty()
                        && let Ok(hash) = auth::hash_password(&pw)
                    {
                        room.password_hash = Some(hash);
                        room.security.has_password = true;
                        room.security.locked = true;
                    }
                    broadcast_all(
                        &room,
                        ServerMessage::RoomSecurityUpdated {
                            security: room.security.clone(),
                        },
                    );
                    (room.security.clone(), room.password_hash.clone())
                };
                let (sec, pw_hash) = updated;
                let _ = db::update_room_security(
                    &self.db,
                    room_name,
                    &sec.subject,
                    sec.locked,
                    pw_hash.as_deref(),
                    sec.lobby_enabled,
                    sec.e2ee_enabled,
                )
                .await;
            }
            ClientMessage::LobbyDecision {
                peer_id: target_id,
                admit,
            } => {
                let mut room = room_arc.write().await;
                let is_mod = room.peers.get(peer_id).is_some_and(|p| p.participant.is_moderator);
                if !is_mod {
                    return;
                }
                if let Some((_entry, conn)) = room.lobby.remove(&target_id) {
                    if admit {
                        Self::admit_locked(&mut room, conn, &self.ice_servers);
                    } else {
                        let _ = conn.tx.send(ServerMessage::LobbyRejected {
                            reason: "Entry declined by moderator".to_string(),
                        });
                    }
                    for mod_peer in room.peers.values() {
                        if mod_peer.participant.is_moderator {
                            let _ = mod_peer.tx.send(ServerMessage::LobbyResolved {
                                peer_id: target_id.clone(),
                                admitted: admit,
                            });
                        }
                    }
                }
            }
            ClientMessage::Moderate { target_id, action } => {
                let mut kick_target = false;
                {
                    let mut room = room_arc.write().await;
                    let Some(actor) = room.peers.get(peer_id) else {
                        return;
                    };
                    if !actor.participant.is_moderator {
                        let _ = actor.tx.send(ServerMessage::Error {
                            code: "forbidden".to_string(),
                            message: "Only moderators can moderate participants".to_string(),
                        });
                        return;
                    }
                    let actor_name = actor.participant.display_name.clone();
                    match action {
                        ModerationAction::MuteAudio => {
                            if let Some(target) = room.peers.get_mut(&target_id) {
                                target.participant.audio_muted = true;
                                let _ = target.tx.send(ServerMessage::Moderated {
                                    action: ModerationAction::MuteAudio,
                                    by_name: actor_name,
                                });
                                let updated = target.participant.clone();
                                broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                            }
                        }
                        ModerationAction::MuteVideo => {
                            if let Some(target) = room.peers.get_mut(&target_id) {
                                target.participant.video_muted = true;
                                let _ = target.tx.send(ServerMessage::Moderated {
                                    action: ModerationAction::MuteVideo,
                                    by_name: actor_name,
                                });
                                let updated = target.participant.clone();
                                broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                            }
                        }
                        ModerationAction::GrantModerator => {
                            if let Some(target) = room.peers.get_mut(&target_id) {
                                target.participant.is_moderator = true;
                                let _ = target.tx.send(ServerMessage::Moderated {
                                    action: ModerationAction::GrantModerator,
                                    by_name: actor_name,
                                });
                                let updated = target.participant.clone();
                                broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                            }
                        }
                        ModerationAction::Kick => {
                            if let Some(target) = room.peers.remove(&target_id) {
                                let _ = target.tx.send(ServerMessage::Moderated {
                                    action: ModerationAction::Kick,
                                    by_name: actor_name,
                                });
                                broadcast_all(
                                    &room,
                                    ServerMessage::ParticipantLeft {
                                        peer_id: target_id.clone(),
                                    },
                                );
                                kick_target = true;
                            }
                        }
                    }
                }
                if kick_target {
                    self.sfu.remove_peer(target_id).await;
                }
            }
            ClientMessage::SetProfile {
                display_name,
                email,
                avatar_url,
            } => {
                let mut room = room_arc.write().await;
                if let Some(peer) = room.peers.get_mut(peer_id) {
                    if let Some(name) = display_name {
                        let clean = name.trim();
                        if !clean.is_empty() {
                            peer.participant.display_name = clean.chars().take(64).collect();
                        }
                    }
                    if let Some(em) = email {
                        let clean = em.trim();
                        peer.participant.email = if clean.is_empty() {
                            None
                        } else {
                            Some(clean.chars().take(128).collect())
                        };
                    }
                    if let Some(av) = avatar_url {
                        let clean = av.trim();
                        if clean.is_empty() {
                            peer.participant.avatar_url = None;
                        } else if clean.starts_with("https://") || clean.starts_with("http://") {
                            peer.participant.avatar_url = Some(clean.chars().take(512).collect());
                        }
                    }
                    let updated = peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            ClientMessage::Subtitle { text, is_final } => {
                let clean: String = text.trim().chars().take(500).collect();
                if clean.is_empty() {
                    return;
                }
                let room = room_arc.read().await;
                let Some(peer) = room.peers.get(peer_id) else {
                    return;
                };
                let entry = SubtitleEntry {
                    id: Uuid::new_v4().to_string(),
                    peer_id: peer_id.to_string(),
                    display_name: peer.participant.display_name.clone(),
                    text: clean,
                    is_final,
                    created_at: Utc::now().timestamp(),
                };
                broadcast_all(&room, ServerMessage::Subtitle { entry });
            }
            ClientMessage::SharedVideo {
                url,
                playing,
                time_secs,
            } => {
                let mut room = room_arc.write().await;
                let Some((sender_name, sender_tx)) = room
                    .peers
                    .get(peer_id)
                    .map(|p| (p.participant.display_name.clone(), p.tx.clone()))
                else {
                    return;
                };
                match url {
                    Some(raw) => {
                        let clean = raw.trim();
                        if clean.is_empty() {
                            room.shared_video = None;
                        } else if clean.starts_with("https://") || clean.starts_with("http://") {
                            room.shared_video = Some(SharedVideoState {
                                url: clean.chars().take(1024).collect(),
                                owner_id: peer_id.to_string(),
                                owner_name: sender_name,
                                playing,
                                time_secs: time_secs.max(0.0),
                                updated_at: Utc::now().timestamp(),
                            });
                        } else {
                            let _ = sender_tx.send(ServerMessage::Error {
                                code: "invalid_url".to_string(),
                                message: "Shared video URL must use http:// or https://".to_string(),
                            });
                            return;
                        }
                    }
                    None => {
                        if time_secs < 0.0 {
                            room.shared_video = None;
                        } else if let Some(ref mut sv) = room.shared_video {
                            sv.playing = playing;
                            sv.time_secs = time_secs.max(0.0);
                            sv.updated_at = Utc::now().timestamp();
                        } else {
                            return;
                        }
                    }
                }
                let state = room.shared_video.clone();
                broadcast_all(&room, ServerMessage::SharedVideoUpdated { state });
            }
            ClientMessage::AvModeration {
                start_audio_muted,
                start_video_muted,
            } => {
                let updated_sec = {
                    let mut room = room_arc.write().await;
                    let Some(actor) = room.peers.get(peer_id) else {
                        return;
                    };
                    if !actor.participant.is_moderator {
                        let _ = actor.tx.send(ServerMessage::Error {
                            code: "forbidden".to_string(),
                            message: "Only moderators can configure AV moderation".to_string(),
                        });
                        return;
                    }
                    room.security.start_audio_muted = start_audio_muted;
                    room.security.start_video_muted = start_video_muted;
                    let sec = room.security.clone();
                    broadcast_all(&room, ServerMessage::RoomSecurityUpdated { security: sec.clone() });
                    sec
                };
                let _ = db::update_room_av_moderation(
                    &self.db,
                    room_name,
                    updated_sec.start_audio_muted,
                    updated_sec.start_video_muted,
                )
                .await;
            }
            ClientMessage::FollowMe {
                enabled,
                pinned_peer_id,
                tile_view,
            } => {
                let mut room = room_arc.write().await;
                let Some(actor) = room.peers.get(peer_id) else {
                    return;
                };
                if !actor.participant.is_moderator {
                    let _ = actor.tx.send(ServerMessage::Error {
                        code: "forbidden".to_string(),
                        message: "Only moderators can enable Follow-Me mode".to_string(),
                    });
                    return;
                }
                let state = FollowMeState {
                    enabled,
                    leader_id: enabled.then(|| peer_id.to_string()),
                    pinned_peer_id: if enabled { pinned_peer_id } else { None },
                    tile_view,
                };
                room.follow_me = Some(state.clone());
                broadcast_all(&room, ServerMessage::FollowMeUpdated { state });
            }
            ClientMessage::MuteEveryone { include_video } => {
                let mut room = room_arc.write().await;
                let Some(actor) = room.peers.get(peer_id) else {
                    return;
                };
                if !actor.participant.is_moderator {
                    let _ = actor.tx.send(ServerMessage::Error {
                        code: "forbidden".to_string(),
                        message: "Only moderators can mute everyone".to_string(),
                    });
                    return;
                }
                let actor_name = actor.participant.display_name.clone();
                let mut updates = Vec::new();
                for (pid, p) in &mut room.peers {
                    if pid == peer_id {
                        continue;
                    }
                    p.participant.audio_muted = true;
                    let _ = p.tx.send(ServerMessage::Moderated {
                        action: ModerationAction::MuteAudio,
                        by_name: actor_name.clone(),
                    });
                    if include_video {
                        p.participant.video_muted = true;
                        let _ = p.tx.send(ServerMessage::Moderated {
                            action: ModerationAction::MuteVideo,
                            by_name: actor_name.clone(),
                        });
                    }
                    updates.push(p.participant.clone());
                }
                for updated in updates {
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            ClientMessage::EndConference => {
                let peer_ids: Vec<String> = {
                    let mut room = room_arc.write().await;
                    let Some(actor) = room.peers.get(peer_id) else {
                        return;
                    };
                    if !actor.participant.is_moderator {
                        let _ = actor.tx.send(ServerMessage::Error {
                            code: "forbidden".to_string(),
                            message: "Only moderators can end the conference for everyone".to_string(),
                        });
                        return;
                    }
                    let by_name = actor.participant.display_name.clone();
                    broadcast_all(&room, ServerMessage::ConferenceEnded { by_name });
                    let ids: Vec<String> = room.peers.keys().cloned().collect();
                    room.lobby.clear();
                    room.peers.clear();
                    ids
                };
                for pid in peer_ids {
                    self.sfu.remove_peer(pid).await;
                }
                self.rooms.remove(room_name);
            }
            ClientMessage::Join { .. } => {}
            ClientMessage::Ping { ts } => {
                let room = room_arc.read().await;
                if let Some(peer) = room.peers.get(peer_id) {
                    let _ = peer.tx.send(ServerMessage::Pong { ts });
                }
            }
        }
    }

    pub async fn leave_peer(&self, room_name: &str, peer_id: &str) {
        self.sfu.remove_peer(peer_id.to_string()).await;
        let Some(room_arc) = self.rooms.get(room_name).map(|r| Arc::clone(r.value())) else {
            return;
        };
        let mut remove_room = false;
        {
            let mut room = room_arc.write().await;
            let was_active = room.peers.remove(peer_id).is_some();
            if room.lobby.remove(peer_id).is_some() {
                for mod_peer in room.peers.values() {
                    if mod_peer.participant.is_moderator {
                        let _ = mod_peer.tx.send(ServerMessage::LobbyResolved {
                            peer_id: peer_id.to_string(),
                            admitted: false,
                        });
                    }
                }
            }
            if was_active {
                broadcast_all(
                    &room,
                    ServerMessage::ParticipantLeft {
                        peer_id: peer_id.to_string(),
                    },
                );
                // Promote next participant if no moderators remain.
                if !room.peers.is_empty()
                    && !room.peers.values().any(|p| p.participant.is_moderator)
                    && let Some(next_id) = room.peers.keys().next().cloned()
                    && let Some(next_peer) = room.peers.get_mut(&next_id)
                {
                    next_peer.participant.is_moderator = true;
                    let updated = next_peer.participant.clone();
                    broadcast_all(&room, ServerMessage::ParticipantUpdated { participant: updated });
                }
            }
            if room.peers.is_empty() && room.lobby.is_empty() {
                remove_room = true;
            }
        }
        if remove_room {
            self.rooms.remove(room_name);
        }
    }
}

fn broadcast_all(room: &RoomState, msg: ServerMessage) {
    for peer in room.peers.values() {
        let _ = peer.tx.send(msg.clone());
    }
}

#[allow(dead_code)]
fn _keep_track_meta_imported(_: TrackMeta, _: MediaTrackKind) {}
