# Nova Port Handoff

- **Release**: `v1.1.0` (`develop` + `master`)
- **Plan & Status**: [MAP.md](MAP.md) | **ADRs**: [DECISIONS.md](DECISIONS.md) | **Terms**: [GLOSSARY.md](GLOSSARY.md)
- **Completed**: Full Jitsi Meet rewrite into Nova (`crates/nova-core` UniFFI + `crates/nova-server` Axum/`str0m` SFU/SQLite/Argon2id/JWT/`external_api.js` + `web/` Jitsi-aligned React Router 8 PWA w/ Settings, CC, Shared Video, File Sharing, Chat Replies, AV Moderation, Follow-Me, Mute Everyone, End Conference, Post-Call Feedback + `mobile/` native SwiftUI & Kotlin Compose apps via UniFFI + Docker/nginx + E2E/benchmark/REA audit).
- **Last Verified**:
  - `cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace --locked` (`11/11` unit tests passing)
  - `(cd web && bun run typecheck && bun run build)` (`561.0 KiB` static client bundle)
  - `./mobile/scripts/generate-bindings.sh` + `(cd mobile/ios && swift build)` (`Build complete!`)
  - `tools/smoke.sh`, 2-peer WebRTC SFU `node tools/e2e.mjs` (ICE connected + decoded remote video + chat + polls + files + settings + whiteboard + live E2EE + `/external_api.js` + 7 retina screenshots + 0 errors), `tools/bench.sh ../jitsi-meet`, and REA artifact inspection (`docs/REA-AUDIT.md`).
- **Next**: Release `v1.1.0` to `master` and back-merge to `develop`.
