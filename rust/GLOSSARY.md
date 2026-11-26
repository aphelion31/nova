# Domain Glossary (`jitsi-meet` -> `nova`)

| Jitsi Term | Meaning | Nova Rust Type / Module |
| --- | --- | --- |
| Conference / MUC Room | Active meeting room identified by slug (`[a-zA-Z0-9_-]{1,128}`) | `rooms::RoomState`, `nova_core::state::RoomSnapshot` |
| Participant / Endpoint | Connected peer in a room with media & moderation state | `nova_core::protocol::Participant`, `rooms::PeerHandle` |
| JVB (Videobridge) | Selective Forwarding Unit routing RTP/RTCP tracks | `sfu::SfuEngine`, `sfu::SfuPeer` (`str0m::Rtc`) |
| Jicofo | Conference focus managing lobby, lock, moderation, breakouts | `rooms::RoomRegistry`, `ws.rs` |
| Prosody MUC Signaling | WebSocket JSON signaling replacing XMPP/BOSH XML stanzas | `nova_core::protocol::{ClientMessage, ServerMessage}` |
| Prejoin | Device preview & mic/cam selection screen before entering room | `web/app/components/PrejoinView.tsx`, `PrejoinView.swift`, `PrejoinScreen.kt` |
| Lobby / Knock | Waiting queue requiring moderator admittance before media flows | `ServerMessage::LobbyWaiting`, `ClientMessage::LobbyDecision` |
| Breakout Room | Isolated sub-room with separate chat & SFU media forwarding | `Participant.breakout_id`, `SfuCmd::UpdateBreakout` |
| E2EE | Insertable Streams / Encoded Transform media encryption | `nova_core::e2ee`, `web/app/lib/e2ee.ts` |
| External API | `JitsiMeetExternalAPI` iframe controller script | `compat.rs` (`/external_api.js`), `external-bridge.ts` |
| `NovaClientCore` | Thread-safe UniFFI state/protocol handle shared with iOS & Android | `crates/nova-core/src/lib.rs` |
