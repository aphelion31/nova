use crate::protocol::{
    BreakoutRoom, ChatMessage, LobbyEntry, Participant, Poll, RoomSecurityState, ServerMessage, WhiteboardStroke,
};
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct RoomSnapshot {
    pub self_id: Option<String>,
    pub room: String,
    pub is_moderator: bool,
    pub in_lobby: bool,
    pub lobby_message: Option<String>,
    pub rejected_reason: Option<String>,
    pub last_error: Option<String>,
    pub active_speaker_id: Option<String>,
    pub participants: Vec<Participant>,
    pub lobby: Vec<LobbyEntry>,
    pub messages: Vec<ChatMessage>,
    pub polls: Vec<Poll>,
    pub breakouts: Vec<BreakoutRoom>,
    pub strokes: Vec<WhiteboardStroke>,
    pub security: RoomSecurityState,
    pub sdp_answer: Option<String>,
    pub pending_renegotiate_sdp: Option<String>,
    pub track_owners: HashMap<String, String>,
}

impl RoomSnapshot {
    pub fn new(room: impl Into<String>) -> Self {
        let room_name = room.into();
        Self {
            self_id: None,
            room: room_name.clone(),
            is_moderator: false,
            in_lobby: false,
            lobby_message: None,
            rejected_reason: None,
            last_error: None,
            active_speaker_id: None,
            participants: Vec::new(),
            lobby: Vec::new(),
            messages: Vec::new(),
            polls: Vec::new(),
            breakouts: Vec::new(),
            strokes: Vec::new(),
            security: RoomSecurityState {
                locked: false,
                lobby_enabled: false,
                e2ee_enabled: false,
                has_password: false,
                subject: room_name,
            },
            sdp_answer: None,
            pending_renegotiate_sdp: None,
            track_owners: HashMap::new(),
        }
    }

    pub fn apply_server_event(&mut self, ev: &ServerMessage) {
        self.sdp_answer = None;
        self.pending_renegotiate_sdp = None;
        match ev {
            ServerMessage::Joined {
                self_id,
                room,
                is_moderator,
                participants,
                messages,
                polls,
                breakouts,
                strokes,
                lobby,
                security,
                ..
            } => {
                self.self_id = Some(self_id.clone());
                self.room = room.clone();
                self.is_moderator = *is_moderator;
                self.in_lobby = false;
                self.lobby_message = None;
                self.rejected_reason = None;
                self.last_error = None;
                self.participants = participants.clone();
                self.messages = messages.clone();
                self.polls = polls.clone();
                self.breakouts = breakouts.clone();
                self.strokes = strokes.clone();
                self.lobby = lobby.clone();
                self.security = security.clone();
                self.recompute_active_speaker();
            }
            ServerMessage::LobbyWaiting { room, message } => {
                self.room = room.clone();
                self.in_lobby = true;
                self.lobby_message = Some(message.clone());
            }
            ServerMessage::LobbyRequest { entry } => {
                if !self.lobby.iter().any(|item| item.peer_id == entry.peer_id) {
                    self.lobby.push(entry.clone());
                }
            }
            ServerMessage::LobbyResolved { peer_id, .. } => {
                self.lobby.retain(|item| &item.peer_id != peer_id);
            }
            ServerMessage::LobbyRejected { reason } => {
                self.in_lobby = false;
                self.rejected_reason = Some(reason.clone());
            }
            ServerMessage::RtcAnswer { sdp } => {
                self.sdp_answer = Some(sdp.clone());
            }
            ServerMessage::RtcRenegotiateOffer { sdp, track_map } => {
                self.pending_renegotiate_sdp = Some(sdp.clone());
                for (mid, meta) in track_map {
                    self.track_owners.insert(mid.clone(), meta.owner_peer_id.clone());
                }
            }
            ServerMessage::ParticipantJoined { participant } => {
                if let Some(existing) = self.participants.iter_mut().find(|p| p.id == participant.id) {
                    *existing = participant.clone();
                } else {
                    self.participants.push(participant.clone());
                }
                self.recompute_active_speaker();
            }
            ServerMessage::ParticipantUpdated { participant } => {
                if self.self_id.as_deref() == Some(participant.id.as_str()) {
                    self.is_moderator = participant.is_moderator;
                }
                if let Some(existing) = self.participants.iter_mut().find(|p| p.id == participant.id) {
                    *existing = participant.clone();
                } else {
                    self.participants.push(participant.clone());
                }
                self.recompute_active_speaker();
            }
            ServerMessage::ParticipantLeft { peer_id } => {
                self.participants.retain(|p| &p.id != peer_id);
                self.recompute_active_speaker();
            }
            ServerMessage::ChatMessage { message } => {
                if !self.messages.iter().any(|m| m.id == message.id) {
                    self.messages.push(message.clone());
                }
            }
            ServerMessage::PollUpdated { poll } => {
                if let Some(existing) = self.polls.iter_mut().find(|p| p.id == poll.id) {
                    *existing = poll.clone();
                } else {
                    self.polls.push(poll.clone());
                }
            }
            ServerMessage::WhiteboardStroke { stroke } => {
                self.strokes.push(stroke.clone());
            }
            ServerMessage::WhiteboardCleared => {
                self.strokes.clear();
            }
            ServerMessage::BreakoutUpdated { breakouts } => {
                self.breakouts = breakouts.clone();
            }
            ServerMessage::RoomSecurityUpdated { security } => {
                self.security = security.clone();
            }
            ServerMessage::Error { message, .. } => {
                self.last_error = Some(message.clone());
            }
            ServerMessage::Reaction { .. } | ServerMessage::Moderated { .. } | ServerMessage::Pong { .. } => {}
        }
    }

    fn recompute_active_speaker(&mut self) {
        self.active_speaker_id = self
            .participants
            .iter()
            .filter(|p| !p.audio_muted && p.audio_level > 0.05)
            .max_by(|a, b| a.audio_level.total_cmp(&b.audio_level))
            .map(|p| p.id.clone());
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_participant(id: &str, level: f32, muted: bool) -> Participant {
        Participant {
            id: id.into(),
            display_name: id.into(),
            email: None,
            avatar_url: None,
            is_moderator: false,
            audio_muted: muted,
            video_muted: false,
            screen_sharing: false,
            hand_raised: false,
            audio_level: level,
            breakout_id: None,
            joined_at: 100,
            speaking_ms: 0,
        }
    }

    #[test]
    fn reducer_tracks_lobby_participants_polls_and_speaker() {
        let mut snap = RoomSnapshot::new("standup");
        snap.apply_server_event(&ServerMessage::LobbyWaiting {
            room: "standup".into(),
            message: "Waiting for host".into(),
        });
        assert!(snap.in_lobby);

        snap.apply_server_event(&ServerMessage::Joined {
            self_id: "p1".into(),
            room: "standup".into(),
            is_moderator: true,
            ice_servers: vec![],
            participants: vec![mk_participant("p1", 0.2, false), mk_participant("p2", 0.85, false)],
            messages: vec![],
            polls: vec![],
            breakouts: vec![],
            strokes: vec![],
            lobby: vec![],
            security: RoomSecurityState {
                locked: false,
                lobby_enabled: true,
                e2ee_enabled: false,
                has_password: false,
                subject: "Daily".into(),
            },
        });
        assert!(!snap.in_lobby);
        assert!(snap.is_moderator);
        assert_eq!(snap.active_speaker_id.as_deref(), Some("p2"));

        snap.apply_server_event(&ServerMessage::ParticipantLeft { peer_id: "p2".into() });
        assert_eq!(snap.active_speaker_id.as_deref(), Some("p1"));
    }

    #[test]
    fn transient_sdp_fields_reset_on_subsequent_events() {
        let mut snap = RoomSnapshot::new("standup");
        snap.apply_server_event(&ServerMessage::RtcAnswer {
            sdp: "v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n".into(),
        });
        assert!(snap.sdp_answer.is_some());
        assert!(snap.pending_renegotiate_sdp.is_none());

        snap.apply_server_event(&ServerMessage::ChatMessage {
            message: ChatMessage {
                id: "m1".into(),
                sender_id: "p1".into(),
                sender_name: "Alice".into(),
                recipient_id: None,
                body: "hello".into(),
                created_at: 1,
            },
        });
        assert!(snap.sdp_answer.is_none());

        snap.apply_server_event(&ServerMessage::RtcRenegotiateOffer {
            sdp: "v=0\r\no=- 2 2 IN IP4 127.0.0.1\r\n".into(),
            track_map: HashMap::new(),
        });
        assert!(snap.pending_renegotiate_sdp.is_some());

        snap.apply_server_event(&ServerMessage::ParticipantUpdated {
            participant: mk_participant("p1", 0.1, false),
        });
        assert!(snap.pending_renegotiate_sdp.is_none());
    }
}
