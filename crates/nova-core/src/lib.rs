pub mod e2ee;
pub mod protocol;
pub mod state;

use crate::protocol::{ClientMessage, ModerationAction, ServerMessage};
use crate::state::RoomSnapshot;
use std::sync::Mutex;
use thiserror::Error;
use url::Url;

uniffi::setup_scaffolding!();

#[derive(Debug, Error, uniffi::Error)]
pub enum NovaCoreError {
    #[error("invalid meeting url: {detail}")]
    InvalidUrl { detail: String },
    #[error("invalid payload: {detail}")]
    InvalidPayload { detail: String },
    #[error("encryption error: {detail}")]
    Crypto { detail: String },
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaParsedMeetingUrl {
    pub ws_url: String,
    pub http_origin: String,
    pub room: String,
    pub token: Option<String>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaParticipant {
    pub id: String,
    pub display_name: String,
    pub is_moderator: bool,
    pub audio_muted: bool,
    pub video_muted: bool,
    pub screen_sharing: bool,
    pub hand_raised: bool,
    pub audio_level: f32,
    pub breakout_id: Option<String>,
    pub speaking_ms: u64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaLobbyEntry {
    pub peer_id: String,
    pub display_name: String,
    pub requested_at: i64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaChatMessage {
    pub id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub recipient_id: Option<String>,
    pub body: String,
    pub created_at: i64,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaPollOption {
    pub text: String,
    pub vote_count: u32,
    pub voted_by_self: bool,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaPoll {
    pub id: String,
    pub creator_name: String,
    pub question: String,
    pub options: Vec<NovaPollOption>,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaBreakoutRoom {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaRoomSecurity {
    pub locked: bool,
    pub lobby_enabled: bool,
    pub e2ee_enabled: bool,
    pub has_password: bool,
    pub subject: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaTrackOwner {
    pub mid: String,
    pub owner_peer_id: String,
}

#[derive(Debug, Clone, uniffi::Record)]
pub struct NovaRoomSnapshot {
    pub self_id: Option<String>,
    pub room: String,
    pub is_moderator: bool,
    pub in_lobby: bool,
    pub lobby_message: Option<String>,
    pub rejected_reason: Option<String>,
    pub last_error: Option<String>,
    pub active_speaker_id: Option<String>,
    pub participants: Vec<NovaParticipant>,
    pub lobby: Vec<NovaLobbyEntry>,
    pub messages: Vec<NovaChatMessage>,
    pub polls: Vec<NovaPoll>,
    pub breakouts: Vec<NovaBreakoutRoom>,
    pub security: NovaRoomSecurity,
    pub sdp_answer: Option<String>,
    pub pending_renegotiate_sdp: Option<String>,
    pub track_owners: Vec<NovaTrackOwner>,
}

impl From<&RoomSnapshot> for NovaRoomSnapshot {
    fn from(s: &RoomSnapshot) -> Self {
        let self_id = s.self_id.as_deref();
        Self {
            self_id: s.self_id.clone(),
            room: s.room.clone(),
            is_moderator: s.is_moderator,
            in_lobby: s.in_lobby,
            lobby_message: s.lobby_message.clone(),
            rejected_reason: s.rejected_reason.clone(),
            last_error: s.last_error.clone(),
            active_speaker_id: s.active_speaker_id.clone(),
            participants: s
                .participants
                .iter()
                .map(|p| NovaParticipant {
                    id: p.id.clone(),
                    display_name: p.display_name.clone(),
                    is_moderator: p.is_moderator,
                    audio_muted: p.audio_muted,
                    video_muted: p.video_muted,
                    screen_sharing: p.screen_sharing,
                    hand_raised: p.hand_raised,
                    audio_level: p.audio_level,
                    breakout_id: p.breakout_id.clone(),
                    speaking_ms: p.speaking_ms,
                })
                .collect(),
            lobby: s
                .lobby
                .iter()
                .map(|l| NovaLobbyEntry {
                    peer_id: l.peer_id.clone(),
                    display_name: l.display_name.clone(),
                    requested_at: l.requested_at,
                })
                .collect(),
            messages: s
                .messages
                .iter()
                .map(|m| NovaChatMessage {
                    id: m.id.clone(),
                    sender_id: m.sender_id.clone(),
                    sender_name: m.sender_name.clone(),
                    recipient_id: m.recipient_id.clone(),
                    body: m.body.clone(),
                    created_at: m.created_at,
                })
                .collect(),
            polls: s
                .polls
                .iter()
                .map(|poll| NovaPoll {
                    id: poll.id.clone(),
                    creator_name: poll.creator_name.clone(),
                    question: poll.question.clone(),
                    options: poll
                        .options
                        .iter()
                        .map(|o| NovaPollOption {
                            text: o.text.clone(),
                            vote_count: u32::try_from(o.voters.len()).unwrap_or(u32::MAX),
                            voted_by_self: self_id.is_some_and(|sid| o.voters.iter().any(|v| v == sid)),
                        })
                        .collect(),
                })
                .collect(),
            breakouts: s
                .breakouts
                .iter()
                .map(|b| NovaBreakoutRoom {
                    id: b.id.clone(),
                    name: b.name.clone(),
                })
                .collect(),
            security: NovaRoomSecurity {
                locked: s.security.locked,
                lobby_enabled: s.security.lobby_enabled,
                e2ee_enabled: s.security.e2ee_enabled,
                has_password: s.security.has_password,
                subject: s.security.subject.clone(),
            },
            sdp_answer: s.sdp_answer.clone(),
            pending_renegotiate_sdp: s.pending_renegotiate_sdp.clone(),
            track_owners: s
                .track_owners
                .iter()
                .map(|(mid, owner_peer_id)| NovaTrackOwner {
                    mid: mid.clone(),
                    owner_peer_id: owner_peer_id.clone(),
                })
                .collect(),
        }
    }
}

/// Validates a room slug (`[a-zA-Z0-9_-]{1,128}`).
#[uniffi::export]
pub fn validate_room_slug(room: String) -> bool {
    !room.is_empty()
        && room.len() <= 128
        && room
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Parses a meeting URL (e.g., `https://meet.example.com/room/standup?jwt=...` or `http://127.0.0.1:3000/standup`).
#[uniffi::export]
pub fn parse_nova_meeting_url(raw_url: String) -> Result<NovaParsedMeetingUrl, NovaCoreError> {
    let trimmed = raw_url.trim();
    let normalized = if trimmed.contains("://") {
        trimmed.to_string()
    } else {
        format!("https://{trimmed}")
    };
    let parsed = Url::parse(&normalized).map_err(|e| NovaCoreError::InvalidUrl { detail: e.to_string() })?;
    let host = parsed.host_str().ok_or_else(|| NovaCoreError::InvalidUrl {
        detail: "missing host".into(),
    })?;

    let segments: Vec<&str> = parsed
        .path_segments()
        .map(|s| s.filter(|seg| !seg.is_empty()).collect())
        .unwrap_or_default();
    let room = match segments.as_slice() {
        ["room", name] | ["embed", name] | [name] => (*name).to_string(),
        _ => {
            return Err(NovaCoreError::InvalidUrl {
                detail: "expected /{room} or /room/{room}".into(),
            });
        }
    };
    if !validate_room_slug(room.clone()) {
        return Err(NovaCoreError::InvalidUrl {
            detail: "room name must match [a-zA-Z0-9_-]{1,128}".into(),
        });
    }

    let ws_scheme = match parsed.scheme() {
        "https" | "wss" => "wss",
        "http" | "ws" => "ws",
        other => {
            return Err(NovaCoreError::InvalidUrl {
                detail: format!("unsupported scheme: {other}"),
            });
        }
    };
    let http_scheme = if ws_scheme == "wss" { "https" } else { "http" };
    let port_suffix = parsed.port().map(|p| format!(":{p}")).unwrap_or_default();
    let http_origin = format!("{http_scheme}://{host}{port_suffix}");
    let ws_url = format!("{ws_scheme}://{host}{port_suffix}/ws/{room}");
    let token = parsed
        .query_pairs()
        .find(|(k, _)| k == "jwt" || k == "token")
        .map(|(_, v)| v.into_owned());

    Ok(NovaParsedMeetingUrl {
        ws_url,
        http_origin,
        room,
        token,
    })
}

/// Thread-safe client signaling & deterministic room state handle shared with Swift and Kotlin apps.
#[derive(Debug, uniffi::Object)]
pub struct NovaClientCore {
    state: Mutex<RoomSnapshot>,
}

fn serialize_client_msg(msg: &ClientMessage) -> Result<String, NovaCoreError> {
    serde_json::to_string(msg).map_err(|e| NovaCoreError::InvalidPayload { detail: e.to_string() })
}

#[uniffi::export]
impl NovaClientCore {
    #[uniffi::constructor]
    pub fn new(room: String) -> Self {
        Self {
            state: Mutex::new(RoomSnapshot::new(room)),
        }
    }

    pub fn parse_meeting_url(&self, raw_url: String) -> Result<NovaParsedMeetingUrl, NovaCoreError> {
        parse_nova_meeting_url(raw_url)
    }

    pub fn build_join_payload(
        &self,
        display_name: String,
        password: Option<String>,
        token: Option<String>,
        audio_muted: bool,
        video_muted: bool,
    ) -> Result<String, NovaCoreError> {
        if display_name.trim().is_empty() {
            return Err(NovaCoreError::InvalidPayload {
                detail: "display_name must not be empty".into(),
            });
        }
        serialize_client_msg(&ClientMessage::Join {
            display_name: display_name.trim().to_string(),
            password,
            token,
            audio_muted,
            video_muted,
            email: None,
            avatar_url: None,
        })
    }

    pub fn build_rtc_offer_payload(&self, sdp: String) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::RtcOffer { sdp })
    }

    pub fn build_rtc_renegotiate_answer_payload(&self, sdp: String) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::RtcRenegotiateAnswer { sdp })
    }

    pub fn build_media_state_payload(
        &self,
        audio_muted: bool,
        video_muted: bool,
        screen_sharing: bool,
        audio_level: f32,
    ) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::MediaState {
            audio_muted,
            video_muted,
            screen_sharing,
            audio_level,
        })
    }

    pub fn build_chat_payload(&self, body: String, recipient_id: Option<String>) -> Result<String, NovaCoreError> {
        if body.trim().is_empty() {
            return Err(NovaCoreError::InvalidPayload {
                detail: "chat message must not be empty".into(),
            });
        }
        serialize_client_msg(&ClientMessage::ChatSend {
            body: body.trim().to_string(),
            recipient_id,
        })
    }

    pub fn build_poll_create_payload(&self, question: String, options: Vec<String>) -> Result<String, NovaCoreError> {
        let clean_opts: Vec<String> = options
            .into_iter()
            .map(|o| o.trim().to_string())
            .filter(|o| !o.is_empty())
            .collect();
        if question.trim().is_empty() || clean_opts.len() < 2 {
            return Err(NovaCoreError::InvalidPayload {
                detail: "poll needs a question and at least 2 options".into(),
            });
        }
        serialize_client_msg(&ClientMessage::PollCreate {
            question: question.trim().to_string(),
            options: clean_opts,
        })
    }

    pub fn build_poll_vote_payload(&self, poll_id: String, option_index: u32) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::PollVote { poll_id, option_index })
    }

    pub fn build_raise_hand_payload(&self, raised: bool) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::RaiseHand { raised })
    }

    pub fn build_reaction_payload(&self, emoji: String) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::Reaction { emoji })
    }

    pub fn build_lobby_decision_payload(&self, peer_id: String, admit: bool) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::LobbyDecision { peer_id, admit })
    }

    pub fn build_moderate_payload(&self, target_id: String, action: String) -> Result<String, NovaCoreError> {
        let parsed = match action.as_str() {
            "mute_audio" => ModerationAction::MuteAudio,
            "mute_video" => ModerationAction::MuteVideo,
            "kick" => ModerationAction::Kick,
            "grant_moderator" => ModerationAction::GrantModerator,
            other => {
                return Err(NovaCoreError::InvalidPayload {
                    detail: format!("unknown moderation action: {other}"),
                });
            }
        };
        serialize_client_msg(&ClientMessage::Moderate {
            target_id,
            action: parsed,
        })
    }

    pub fn build_breakout_create_payload(&self, name: String) -> Result<String, NovaCoreError> {
        let trimmed = name.trim();
        if trimmed.is_empty() {
            return Err(NovaCoreError::InvalidPayload {
                detail: "breakout room name must not be empty".into(),
            });
        }
        serialize_client_msg(&ClientMessage::BreakoutCreate {
            name: trimmed.to_string(),
        })
    }

    pub fn build_breakout_move_payload(&self, breakout_id: Option<String>) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::BreakoutMove { breakout_id })
    }

    pub fn build_room_security_payload(
        &self,
        locked: Option<bool>,
        password: Option<String>,
        clear_password: bool,
        lobby_enabled: Option<bool>,
        e2ee_enabled: Option<bool>,
        subject: Option<String>,
    ) -> Result<String, NovaCoreError> {
        serialize_client_msg(&ClientMessage::RoomSecurity {
            locked,
            password,
            clear_password,
            lobby_enabled,
            e2ee_enabled,
            subject,
        })
    }

    pub fn apply_server_json(&self, json: String) -> Result<NovaRoomSnapshot, NovaCoreError> {
        let msg: ServerMessage =
            serde_json::from_str(&json).map_err(|e| NovaCoreError::InvalidPayload { detail: e.to_string() })?;
        let mut guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
        guard.apply_server_event(&msg);
        Ok(NovaRoomSnapshot::from(&*guard))
    }

    pub fn snapshot(&self) -> NovaRoomSnapshot {
        let guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
        NovaRoomSnapshot::from(&*guard)
    }

    pub fn derive_e2ee_key_b64(&self, passphrase: String, generation: u32) -> Result<String, NovaCoreError> {
        let room = {
            let guard = self.state.lock().unwrap_or_else(|e| e.into_inner());
            guard.room.clone()
        };
        e2ee::derive_media_key_b64(&passphrase, &room, generation)
            .map_err(|e| NovaCoreError::Crypto { detail: e.to_string() })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_meeting_urls_and_rejects_bad_rooms() {
        let ok = parse_nova_meeting_url("http://127.0.0.1:3000/room/daily-sync?jwt=abc".into()).expect("parse ok");
        assert_eq!(ok.room, "daily-sync");
        assert_eq!(ok.ws_url, "ws://127.0.0.1:3000/ws/daily-sync");
        assert_eq!(ok.http_origin, "http://127.0.0.1:3000");
        assert_eq!(ok.token.as_deref(), Some("abc"));

        let short = parse_nova_meeting_url("meet.nova.dev/standup_01".into()).expect("parse bare host");
        assert_eq!(short.room, "standup_01");
        assert_eq!(short.ws_url, "wss://meet.nova.dev/ws/standup_01");

        assert!(parse_nova_meeting_url("https://meet.nova.dev/room/bad room!".into()).is_err());
    }

    #[test]
    fn client_core_builds_and_applies_events() {
        let core = NovaClientCore::new("team".into());
        let join_json = core
            .build_join_payload("Alice".into(), None, None, false, true)
            .expect("join json");
        assert!(join_json.contains("Alice"));

        let joined = serde_json::to_string(&ServerMessage::Joined {
            self_id: "p1".into(),
            room: "team".into(),
            is_moderator: true,
            ice_servers: vec![],
            participants: vec![],
            messages: vec![],
            polls: vec![],
            breakouts: vec![],
            strokes: vec![],
            lobby: vec![],
            security: crate::protocol::RoomSecurityState {
                locked: false,
                lobby_enabled: false,
                e2ee_enabled: false,
                has_password: false,
                subject: "Weekly".into(),
            },
        })
        .expect("serialize joined");
        let snap = core.apply_server_json(joined).expect("apply joined");
        assert_eq!(snap.self_id.as_deref(), Some("p1"));
        assert!(snap.is_moderator);

        let key_b64 = core.derive_e2ee_key_b64("pass123".into(), 1).expect("e2ee key");
        assert!(!key_b64.is_empty());

        let b_create = core
            .build_breakout_create_payload("Group A".into())
            .expect("breakout create");
        assert!(b_create.contains(r#""type":"breakout_create""#));
        let b_move = core.build_breakout_move_payload(None).expect("breakout move");
        assert!(b_move.contains(r#""type":"breakout_move""#));
        let sec = core
            .build_room_security_payload(
                Some(true),
                Some("pw".into()),
                false,
                Some(true),
                None,
                Some("Sync".into()),
            )
            .expect("room security");
        assert!(sec.contains(r#""type":"room_security""#));
    }
}
