# Nova Port Handoff

- **Release**: `v1.1.1` (`master`), active `develop` (`NVA-004` Visitor mode + `NVA-005` brand/docs/media refresh)
- **Plan & Status**: [MAP.md](MAP.md) | **ADRs**: [DECISIONS.md](DECISIONS.md) | **Terms**: [GLOSSARY.md](GLOSSARY.md)
- **Completed**: Full Jitsi Meet rewrite into Nova (`crates/nova-core` UniFFI + `crates/nova-server` Axum/`str0m` SFU/SQLite/Argon2id/JWT/`external_api.js` + `web/` Jitsi-aligned React Router 8 PWA w/ Settings, CC, Shared Video, File Sharing, Chat Replies, AV Moderation, Follow-Me, Mute Everyone, End Conference, Post-Call Feedback, Visitor mode + PiP-safe `JoinMeetingDialog` + `mobile/` native SwiftUI & Kotlin Compose apps via UniFFI + Docker/nginx + E2E/benchmark/REA audit + updated brand assets, 8 retina screenshots & demo MP4/GIF).
- **Last Verified**:
  - `cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace --locked` (`13/13` unit tests passing: `8` `nova-core`, `5` `nova-server`)
  - `(cd web && bun run typecheck && bun run build)`
  - `./mobile/scripts/generate-bindings.sh` + `(cd mobile/ios && swift build)` (`Build complete!`)
  - `tools/smoke.sh`, 2-peer + Visitor WebRTC SFU `node tools/e2e.mjs` (ICE connected + decoded remote video + chat + polls + files + settings + whiteboard + live E2EE + Visitor `JoinMeetingDialog`/PiP + `/external_api.js` + 8 retina screenshots + 0 errors), `./scripts/build-demo-media.sh`, `tools/bench.sh ../jitsi-meet`, and REA artifact inspection (`docs/REA-AUDIT.md`).
- **Next**: Merge `NVA-005` into `develop` and cut next release when requested.
