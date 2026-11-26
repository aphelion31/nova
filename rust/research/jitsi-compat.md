# Research: Upstream `jitsi/jitsi-meet` Analysis & Compatibility Targets

Primary sources:
- Upstream repo metadata & `package.json` / `CLAUDE.md` / `modules/API/external/external_api.js`
- `rust/research/jitsi-analyze.md` (from `rust-anything analyze --whole-app`)

## Key Findings
1. **Upstream scale:** 83+ feature modules under `react/features/` using React + React Native + Redux + Webpack + `lib-jitsi-meet` + jQuery + MUI + TensorFlow/MediaPipe + XMPP/Strophe + prosody/jicofo/jvb.
2. **Core UX contract preserved in Nova:**
   - Direct room URLs (`/{room}`) and embed URLs (`/embed/{room}`).
   - Prejoin device check, audio/video mute, screen sharing, tile/speaker/spotlight view, active speaker ring, lobby + room password lock, host moderator actions, public + private chat, emoji reactions, raise hand, live polls, breakout rooms, collaborative whiteboard, speaker stats, E2EE, virtual background blur, local recording, EN/ID i18n.
   - Drop-in `/external_api.js` (`JitsiMeetExternalAPI`), `/config.js`, `/interface_config.js`, and HS256 JWT `context.user` claims.
