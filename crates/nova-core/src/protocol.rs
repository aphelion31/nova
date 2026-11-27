use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MediaTrackKind {
    Audio,
    Video,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TrackMeta {
    pub owner_peer_id: String,
    pub kind: MediaTrackKind,
    #[serde(default)]
    pub screen: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct IceServerConfig {
    pub urls: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Participant {
    pub id: String,
    pub display_name: String,
    pub email: Option<String>,
    pub avatar_url: Option<String>,
    pub is_moderator: bool,
    pub audio_muted: bool,
    pub video_muted: bool,
    pub screen_sharing: bool,
    pub hand_raised: bool,
    pub audio_level: f32,
    pub breakout_id: Option<String>,
    pub joined_at: i64,
    pub speaking_ms: u64,
    #[serde(default)]
    pub is_visitor: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LobbyEntry {
    pub peer_id: String,
    pub display_name: String,
    pub requested_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct ChatMessage {
    pub id: String,
    pub sender_id: String,
    pub sender_name: String,
    pub recipient_id: Option<String>,
    pub body: String,
    pub created_at: i64,
    #[serde(default)]
    pub reply_to_id: Option<String>,
    #[serde(default)]
    pub reply_to_sender: Option<String>,
    #[serde(default)]
    pub reply_to_body: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct PollOption {
    pub text: String,
    pub voters: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Poll {
    pub id: String,
    pub creator_id: String,
    pub creator_name: String,
    pub question: String,
    pub options: Vec<PollOption>,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct BreakoutRoom {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WhiteboardPoint {
    pub x: f32,
    pub y: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WhiteboardStroke {
    pub id: String,
    pub author_id: String,
    pub color: String,
    pub width: f32,
    pub points: Vec<WhiteboardPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RoomSecurityState {
    pub locked: bool,
    pub lobby_enabled: bool,
    pub e2ee_enabled: bool,
    pub has_password: bool,
    pub subject: String,
    #[serde(default)]
    pub start_audio_muted: bool,
    #[serde(default)]
    pub start_video_muted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SharedVideoState {
    pub url: String,
    pub owner_id: String,
    pub owner_name: String,
    pub playing: bool,
    pub time_secs: f64,
    pub updated_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SubtitleEntry {
    pub id: String,
    pub peer_id: String,
    pub display_name: String,
    pub text: String,
    pub is_final: bool,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SharedFileMeta {
    pub id: String,
    pub room_name: String,
    pub sender_name: String,
    pub filename: String,
    pub mime_type: String,
    pub size_bytes: u64,
    pub created_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FollowMeState {
    pub enabled: bool,
    pub leader_id: Option<String>,
    pub pinned_peer_id: Option<String>,
    pub tile_view: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ModerationAction {
    MuteAudio,
    MuteVideo,
    Kick,
    GrantModerator,
    PromoteVisitor,
    DemoteVisitor,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Join {
        display_name: String,
        #[serde(default)]
        password: Option<String>,
        #[serde(default)]
        token: Option<String>,
        #[serde(default)]
        audio_muted: bool,
        #[serde(default)]
        video_muted: bool,
        #[serde(default)]
        email: Option<String>,
        #[serde(default)]
        avatar_url: Option<String>,
        #[serde(default)]
        visitor: bool,
    },
    RtcOffer {
        sdp: String,
    },
    RtcRenegotiateAnswer {
        sdp: String,
    },
    MediaState {
        audio_muted: bool,
        video_muted: bool,
        screen_sharing: bool,
        audio_level: f32,
    },
    ChatSend {
        body: String,
        #[serde(default)]
        recipient_id: Option<String>,
        #[serde(default)]
        reply_to_id: Option<String>,
    },
    Reaction {
        emoji: String,
    },
    RaiseHand {
        raised: bool,
    },
    PollCreate {
        question: String,
        options: Vec<String>,
    },
    PollVote {
        poll_id: String,
        option_index: u32,
    },
    WhiteboardStroke {
        stroke: WhiteboardStroke,
    },
    WhiteboardClear,
    BreakoutCreate {
        name: String,
    },
    BreakoutMove {
        breakout_id: Option<String>,
    },
    RoomSecurity {
        #[serde(default)]
        locked: Option<bool>,
        #[serde(default)]
        password: Option<String>,
        #[serde(default)]
        clear_password: bool,
        #[serde(default)]
        lobby_enabled: Option<bool>,
        #[serde(default)]
        e2ee_enabled: Option<bool>,
        #[serde(default)]
        subject: Option<String>,
    },
    LobbyDecision {
        peer_id: String,
        admit: bool,
    },
    Moderate {
        target_id: String,
        action: ModerationAction,
    },
    SetDisplayName {
        display_name: String,
    },
    SetProfile {
        #[serde(default)]
        display_name: Option<String>,
        #[serde(default)]
        email: Option<String>,
        #[serde(default)]
        avatar_url: Option<String>,
    },
    Subtitle {
        text: String,
        #[serde(default)]
        is_final: bool,
    },
    SharedVideo {
        #[serde(default)]
        url: Option<String>,
        #[serde(default)]
        playing: bool,
        #[serde(default)]
        time_secs: f64,
    },
    AvModeration {
        start_audio_muted: bool,
        start_video_muted: bool,
    },
    FollowMe {
        enabled: bool,
        #[serde(default)]
        pinned_peer_id: Option<String>,
        #[serde(default)]
        tile_view: bool,
    },
    MuteEveryone {
        #[serde(default)]
        include_video: bool,
    },
    EndConference,
    Ping {
        ts: i64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
#[expect(
    clippy::large_enum_variant,
    reason = "Joined snapshot carries full room state once per connect; keep flat wire JSON"
)]
pub enum ServerMessage {
    Joined {
        self_id: String,
        room: String,
        is_moderator: bool,
        ice_servers: Vec<IceServerConfig>,
        participants: Vec<Participant>,
        messages: Vec<ChatMessage>,
        polls: Vec<Poll>,
        breakouts: Vec<BreakoutRoom>,
        strokes: Vec<WhiteboardStroke>,
        lobby: Vec<LobbyEntry>,
        security: RoomSecurityState,
        #[serde(default)]
        shared_video: Option<SharedVideoState>,
        #[serde(default)]
        follow_me: Option<FollowMeState>,
        #[serde(default)]
        files: Vec<SharedFileMeta>,
        #[serde(default)]
        is_visitor: bool,
    },
    LobbyWaiting {
        room: String,
        message: String,
    },
    LobbyRequest {
        entry: LobbyEntry,
    },
    LobbyResolved {
        peer_id: String,
        admitted: bool,
    },
    LobbyRejected {
        reason: String,
    },
    RtcAnswer {
        sdp: String,
    },
    RtcRenegotiateOffer {
        sdp: String,
        track_map: HashMap<String, TrackMeta>,
    },
    ParticipantJoined {
        participant: Participant,
    },
    ParticipantUpdated {
        participant: Participant,
    },
    ParticipantLeft {
        peer_id: String,
    },
    ChatMessage {
        message: ChatMessage,
    },
    Reaction {
        peer_id: String,
        display_name: String,
        emoji: String,
    },
    PollUpdated {
        poll: Poll,
    },
    WhiteboardStroke {
        stroke: WhiteboardStroke,
    },
    WhiteboardCleared,
    BreakoutUpdated {
        breakouts: Vec<BreakoutRoom>,
    },
    RoomSecurityUpdated {
        security: RoomSecurityState,
    },
    Subtitle {
        entry: SubtitleEntry,
    },
    SharedVideoUpdated {
        state: Option<SharedVideoState>,
    },
    FollowMeUpdated {
        state: FollowMeState,
    },
    FileShared {
        file: SharedFileMeta,
    },
    ConferenceEnded {
        by_name: String,
    },
    Moderated {
        action: ModerationAction,
        by_name: String,
    },
    Error {
        code: String,
        message: String,
    },
    Pong {
        ts: i64,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn client_and_server_messages_roundtrip_json() {
        let join = ClientMessage::Join {
            display_name: "Alice".into(),
            password: None,
            token: Some("jwt".into()),
            audio_muted: false,
            video_muted: true,
            email: Some("alice@example.com".into()),
            avatar_url: None,
            visitor: false,
        };
        let raw = serde_json::to_string(&join).expect("serialize join");
        assert!(raw.contains(r#""type":"join""#));
        let back: ClientMessage = serde_json::from_str(&raw).expect("deserialize join");
        match back {
            ClientMessage::Join {
                display_name,
                video_muted,
                ..
            } => {
                assert_eq!(display_name, "Alice");
                assert!(video_muted);
            }
            _ => panic!("unexpected variant"),
        }

        let err = ServerMessage::Error {
            code: "invalid_password".into(),
            message: "Room password is incorrect".into(),
        };
        let eraw = serde_json::to_string(&err).expect("serialize err");
        let eback: ServerMessage = serde_json::from_str(&eraw).expect("deserialize err");
        match eback {
            ServerMessage::Error { code, .. } => assert_eq!(code, "invalid_password"),
            _ => panic!("unexpected variant"),
        }

        let follow = ClientMessage::FollowMe {
            enabled: true,
            pinned_peer_id: Some("p2".into()),
            tile_view: false,
        };
        let fraw = serde_json::to_string(&follow).expect("serialize follow_me");
        assert!(fraw.contains(r#""type":"follow_me""#));
        let fback: ClientMessage = serde_json::from_str(&fraw).expect("deserialize follow_me");
        assert!(matches!(
            fback,
            ClientMessage::FollowMe {
                enabled: true,
                tile_view: false,
                ..
            }
        ));

        let sv = ServerMessage::SharedVideoUpdated {
            state: Some(SharedVideoState {
                url: "https://example.com/video.mp4".into(),
                owner_id: "p1".into(),
                owner_name: "Alice".into(),
                playing: true,
                time_secs: 12.5,
                updated_at: 1000,
            }),
        };
        let sraw = serde_json::to_string(&sv).expect("serialize shared_video_updated");
        let sback: ServerMessage = serde_json::from_str(&sraw).expect("deserialize shared_video_updated");
        assert!(matches!(sback, ServerMessage::SharedVideoUpdated { state: Some(_) }));

        for (action, expected) in [
            (ModerationAction::PromoteVisitor, r#""promote_visitor""#),
            (ModerationAction::DemoteVisitor, r#""demote_visitor""#),
        ] {
            let raw = serde_json::to_string(&action).expect("serialize moderation action");
            assert_eq!(raw, expected);
            let back: ModerationAction = serde_json::from_str(&raw).expect("deserialize moderation action");
            assert_eq!(back, action);
        }
    }
}
