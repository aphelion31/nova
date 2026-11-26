# Nova Port Handoff

- **Branch**: `NVA-001/feat-nova-bootstrap`
- **Plan & Status**: [MAP.md](MAP.md) | **ADRs**: [DECISIONS.md](DECISIONS.md) | **Terms**: [GLOSSARY.md](GLOSSARY.md)
- **Completed**: Full Jitsi Meet rewrite into Nova (`crates/nova-core` UniFFI + `crates/nova-server` Axum/`str0m` SFU/SQLite/Argon2id/JWT/`external_api.js` + `web/` React Router 8 PWA + `mobile/` native SwiftUI & Kotlin Compose apps via UniFFI + Docker/nginx + E2E/benchmark/REA audit).
- **Last Verified**:
  - `cargo fmt --check && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace` (9/9 unit tests passing)
  - `(cd web && bun run typecheck && bun run build)` (`548 KiB` static client bundle)
  - `./mobile/scripts/generate-bindings.sh` + `(cd mobile/ios && swift build)` (`Build complete!`)
  - `tools/smoke.sh`, 2-peer WebRTC SFU `node tools/e2e.mjs` (ICE connected + decoded remote video + chat + polls + whiteboard + `/external_api.js` + 6 retina screenshots + 0 errors), `tools/bench.sh ../jitsi-meet`, and REA artifact inspection (`docs/REA-AUDIT.md`).
- **Next**: Ready for PR / review into `develop`.
