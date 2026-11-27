use crate::protocol::{
    BreakoutRoom, ChatMessage, FollowMeState, LobbyEntry, Participant, Poll, RoomSecurityState, ServerMessage,
    SharedFileMeta, SharedVideoState, SubtitleEntry, WhiteboardStroke,
};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveDialog {
    VisitorJoinMeeting,
}

#[derive(Debug, Clone)]
pub struct RoomSnapshot {
    pub self_id: Option<String>,
    pub room: String,
    pub is_moderator: bool,
    pub is_visitor: bool,
    pub active_dialog: Option<ActiveDialog>,
    pub in_pip_mode: bool,
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
    pub shared_video: Option<SharedVideoState>,
    pub follow_me: Option<FollowMeState>,
    pub files: Vec<SharedFileMeta>,
    pub subtitles: Vec<SubtitleEntry>,
    pub conference_ended_by: Option<String>,
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
            is_visitor: false,
            active_dialog: None,
            in_pip_mode: false,
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
                start_audio_muted: false,
                start_video_muted: false,
            },
            shared_video: None,
            follow_me: None,
            files: Vec::new(),
            subtitles: Vec::new(),
            conference_ended_by: None,
            sdp_answer: None,
            pending_renegotiate_sdp: None,
            track_owners: HashMap::new(),
        }
    }

    pub fn hide_dialog(&mut self) {
        self.active_dialog = None;
    }

    pub fn set_pip_mode(&mut self, enabled: bool) {
        self.in_pip_mode = enabled;
    }

    pub fn should_show_visitor_join_dialog(&self) -> bool {
        !self.in_pip_mode && self.active_dialog == Some(ActiveDialog::VisitorJoinMeeting)
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
                shared_video,
                follow_me,
                files,
                is_visitor,
                ..
            } => {
                self.self_id = Some(self_id.clone());
                self.room = room.clone();
                self.is_moderator = *is_moderator;
                self.is_visitor = *is_visitor;
                self.active_dialog = is_visitor.then_some(ActiveDialog::VisitorJoinMeeting);
                self.in_lobby = false;
                self.lobby_message = None;
                self.rejected_reason = None;
                self.last_error = None;
                self.conference_ended_by = None;
                self.participants = participants.clone();
                self.messages = messages.clone();
                self.polls = polls.clone();
                self.breakouts = breakouts.clone();
                self.strokes = strokes.clone();
                self.lobby = lobby.clone();
                self.security = security.clone();
                self.shared_video = shared_video.clone();
                self.follow_me = follow_me.clone();
                self.files = files.clone();
                self.recompute_active_speaker();
            }
            ServerMessage::LobbyWaiting { room, message } => {
                self.room = room.clone();
                self.in_lobby = true;
                self.lobby_message = Some(message.clone());
                self.active_dialog = None;
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
                self.active_dialog = None;
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
                    self.is_visitor = participant.is_visitor;
                    if !participant.is_visitor && self.active_dialog == Some(ActiveDialog::VisitorJoinMeeting) {
                        self.active_dialog = None;
                    }
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
            ServerMessage::Subtitle { entry } => {
                self.subtitles.push(entry.clone());
                if self.subtitles.len() > 100 {
                    let drain = self.subtitles.len() - 100;
                    self.subtitles.drain(0..drain);
                }
            }
            ServerMessage::SharedVideoUpdated { state } => {
                self.shared_video = state.clone();
            }
            ServerMessage::FollowMeUpdated { state } => {
                self.follow_me = Some(state.clone());
            }
            ServerMessage::FileShared { file } => {
                if !self.files.iter().any(|f| f.id == file.id) {
                    self.files.push(file.clone());
                }
            }
            ServerMessage::ConferenceEnded { by_name } => {
                self.conference_ended_by = Some(by_name.clone());
                self.active_dialog = None;
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
            is_visitor: false,
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
                start_audio_muted: false,
                start_video_muted: false,
            },
            shared_video: None,
            follow_me: None,
            files: vec![],
            is_visitor: false,
        });
        assert!(!snap.in_lobby);
        assert!(snap.is_moderator);
        assert_eq!(snap.active_speaker_id.as_deref(), Some("p2"));

        snap.apply_server_event(&ServerMessage::ParticipantLeft { peer_id: "p2".into() });
        assert_eq!(snap.active_speaker_id.as_deref(), Some("p1"));
    }

    #[test]
    fn reducer_tracks_subtitles_shared_video_follow_me_files_and_end() {
        let mut snap = RoomSnapshot::new("demo");
        snap.apply_server_event(&ServerMessage::Subtitle {
            entry: SubtitleEntry {
                id: "s1".into(),
                peer_id: "p1".into(),
                display_name: "Alice".into(),
                text: "Hello world".into(),
                is_final: true,
                created_at: 10,
            },
        });
        assert_eq!(snap.subtitles.len(), 1);

        snap.apply_server_event(&ServerMessage::SharedVideoUpdated {
            state: Some(SharedVideoState {
                url: "https://example.com/demo.mp4".into(),
                owner_id: "p1".into(),
                owner_name: "Alice".into(),
                playing: true,
                time_secs: 4.0,
                updated_at: 11,
            }),
        });
        assert!(snap.shared_video.as_ref().is_some_and(|v| v.playing));

        snap.apply_server_event(&ServerMessage::FollowMeUpdated {
            state: FollowMeState {
                enabled: true,
                leader_id: Some("p1".into()),
                pinned_peer_id: Some("p2".into()),
                tile_view: false,
            },
        });
        assert!(snap.follow_me.as_ref().is_some_and(|f| f.enabled));

        let meta = SharedFileMeta {
            id: "f1".into(),
            room_name: "demo".into(),
            sender_name: "Alice".into(),
            filename: "notes.txt".into(),
            mime_type: "text/plain".into(),
            size_bytes: 42,
            created_at: 12,
        };
        snap.apply_server_event(&ServerMessage::FileShared { file: meta.clone() });
        snap.apply_server_event(&ServerMessage::FileShared { file: meta });
        assert_eq!(snap.files.len(), 1);

        snap.apply_server_event(&ServerMessage::ConferenceEnded {
            by_name: "Alice".into(),
        });
        assert_eq!(snap.conference_ended_by.as_deref(), Some("Alice"));
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
                reply_to_id: None,
                reply_to_sender: None,
                reply_to_body: None,
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

    #[test]
    fn visitor_join_dialog_stays_hidden_across_pip_and_events() {
        let mut visitor_snap = RoomSnapshot::new("stage");
        visitor_snap.apply_server_event(&ServerMessage::Joined {
            self_id: "v1".into(),
            room: "stage".into(),
            is_moderator: false,
            ice_servers: vec![],
            participants: vec![],
            messages: vec![],
            polls: vec![],
            breakouts: vec![],
            strokes: vec![],
            lobby: vec![],
            security: RoomSecurityState {
                locked: false,
                lobby_enabled: false,
                e2ee_enabled: false,
                has_password: false,
                subject: "Stage".into(),
                start_audio_muted: false,
                start_video_muted: false,
            },
            shared_video: None,
            follow_me: None,
            files: vec![],
            is_visitor: true,
        });

        assert!(visitor_snap.is_visitor);
        assert_eq!(visitor_snap.active_dialog, Some(ActiveDialog::VisitorJoinMeeting));
        assert!(visitor_snap.should_show_visitor_join_dialog());

        // Entering PiP before dismissing hides the dialog; exiting PiP restores it.
        visitor_snap.set_pip_mode(true);
        assert!(!visitor_snap.should_show_visitor_join_dialog());
        visitor_snap.set_pip_mode(false);
        assert!(visitor_snap.should_show_visitor_join_dialog());

        // Dismissing clears central active_dialog; PiP transitions and events must not reopen it.
        visitor_snap.hide_dialog();
        assert_eq!(visitor_snap.active_dialog, None);
        assert!(!visitor_snap.should_show_visitor_join_dialog());

        visitor_snap.set_pip_mode(true);
        visitor_snap.set_pip_mode(false);
        assert_eq!(visitor_snap.active_dialog, None);
        assert!(!visitor_snap.should_show_visitor_join_dialog());

        visitor_snap.apply_server_event(&ServerMessage::ParticipantJoined {
            participant: mk_participant("p2", 0.0, true),
        });
        visitor_snap.apply_server_event(&ServerMessage::ChatMessage {
            message: ChatMessage {
                id: "m1".into(),
                sender_id: "p2".into(),
                sender_name: "Host".into(),
                recipient_id: None,
                body: "welcome".into(),
                created_at: 1,
                reply_to_id: None,
                reply_to_sender: None,
                reply_to_body: None,
            },
        });
        assert_eq!(visitor_snap.active_dialog, None);
        assert!(!visitor_snap.should_show_visitor_join_dialog());

        // Promoting a visitor while dialog is open clears it automatically.
        let mut promoted = RoomSnapshot::new("stage");
        promoted.apply_server_event(&ServerMessage::Joined {
            self_id: "v2".into(),
            room: "stage".into(),
            is_moderator: false,
            ice_servers: vec![],
            participants: vec![],
            messages: vec![],
            polls: vec![],
            breakouts: vec![],
            strokes: vec![],
            lobby: vec![],
            security: RoomSecurityState {
                locked: false,
                lobby_enabled: false,
                e2ee_enabled: false,
                has_password: false,
                subject: "Stage".into(),
                start_audio_muted: false,
                start_video_muted: false,
            },
            shared_video: None,
            follow_me: None,
            files: vec![],
            is_visitor: true,
        });
        assert!(promoted.should_show_visitor_join_dialog());
        promoted.apply_server_event(&ServerMessage::ParticipantUpdated {
            participant: mk_participant("v2", 0.0, true),
        });
        assert!(!promoted.is_visitor);
        assert_eq!(promoted.active_dialog, None);
        assert!(!promoted.should_show_visitor_join_dialog());

        // Non-visitor join never opens VisitorJoinMeeting.
        let mut regular = RoomSnapshot::new("stage");
        regular.apply_server_event(&ServerMessage::Joined {
            self_id: "p1".into(),
            room: "stage".into(),
            is_moderator: true,
            ice_servers: vec![],
            participants: vec![],
            messages: vec![],
            polls: vec![],
            breakouts: vec![],
            strokes: vec![],
            lobby: vec![],
            security: RoomSecurityState {
                locked: false,
                lobby_enabled: false,
                e2ee_enabled: false,
                has_password: false,
                subject: "Stage".into(),
                start_audio_muted: false,
                start_video_muted: false,
            },
            shared_video: None,
            follow_me: None,
            files: vec![],
            is_visitor: false,
        });
        assert!(!regular.should_show_visitor_join_dialog());
    }
}
