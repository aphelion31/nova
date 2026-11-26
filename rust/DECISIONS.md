# Architecture Decisions (Jitsi Meet -> Nova)

## ADR-001: Single-binary Rust Axum + str0m WebRTC SFU replacing Prosody + Jicofo + JVB
Status: accepted (2026-11-26)
Context: Upstream Jitsi Meet requires Nginx, Prosody (Lua XMPP/MUC/BOSH), Jicofo (Java), and Jitsi Videobridge (Java SFU) across multiple containers and JVMs.
Decision: Build `nova` as a single Rust workspace (`crates/nova-core` + `crates/nova-server`) using `axum 0.8` HTTP/WebSocket signaling and `str0m 0.26` (`default-features = false, features = ["aws-lc-rs"]`) Sans-IO WebRTC SFU over a multiplexed UDP socket. Keep `../jitsi-meet` read-only reference.
Consequences: Zero JVM/Lua/XMPP runtime dependencies; deterministic in-process SFU scheduling and breakout room media isolation.

## ADR-002: Embedded SQLite persistence via sqlx
Status: accepted (2026-11-26)
Context: Jitsi Meet rooms are mostly ephemeral unless backed by Prosody files/DB. Nova needs persistent host accounts, room locks, chat history, polls, and session records while remaining zero-dependency out of the box.
Decision: Use `sqlx 0.8` with embedded SQLite (`sqlite://nova.db?mode=rwc`, WAL mode) and auto-applied migrations in `crates/nova-server/migrations/0001_init.sql`.
Consequences: Single-command `./nova serve` works with zero external database process.

## ADR-003: Argon2id host authentication & Jitsi-compatible HS256 room JWTs
Status: accepted (2026-11-26)
Context: Host authentication and moderator room tokens must reject weak password hashes while supporting Jitsi-style JWT claims (`aud`, `iss`, `sub`, `room`, `context.user`).
Decision: Use `argon2 0.5` (`Algorithm::Argon2id`, `Version::V0x13`) for host passwords, HMAC-SHA256 `HttpOnly` `nova_session` cookies for host sessions, and `jsonwebtoken` HS256 tokens for room moderator elevation.
Consequences: Compatible with Jitsi JWT embed workflows and strong password storage.

## ADR-004: React Router 8 + Tailwind CSS v4 PWA frontend
Status: accepted (2026-11-26)
Context: Match the frontend stack established in `pulsar` and `520pdf` (`React Router 8` SPA mode, React 19, Tailwind v4, Vite 8, Bun `1.4.4`, `lucide-react`) rather than Jitsi's heavy Webpack + Redux + MUI + jQuery bundle.
Decision: Build `web/` (`ssr: false`) as an installable PWA served directly by `nova`, communicating strictly over HTTP + `/ws/{room}` + `/external_api.js` `postMessage`.
Consequences: Tiny static client bundle, fast builds, instant mobile browser join via PWA.

## ADR-005: Shared `nova-core` with UniFFI 0.33 + Native SwiftUI & Kotlin Compose mobile clients
Status: accepted (2026-11-26)
Context: Mobile WebRTC apps need low battery/CPU overhead, CallKit/ForegroundService audio routing, and small binary size without React Native Hermes/Metro or Flutter Dart VM overhead.
Decision: Place signaling protocol, deterministic room reducer, URL parser, and HKDF/AES-256-GCM E2EE key derivation in `crates/nova-core` using UniFFI 0.33 proc-macros (`uniffi::setup_scaffolding!()`), generate Swift and Kotlin bindings via `mobile/scripts/generate-bindings.sh`, and build thin native SwiftUI (`mobile/ios/`) and Jetpack Compose (`mobile/android/`) UIs.
Consequences: Business logic is written and tested once in Rust; native mobile packages avoid VM bloat.

## ADR-006: Drop-in `/external_api.js` compatibility & intentional scope exclusions
Status: accepted (2026-11-26)
Context: Embedders expect `new JitsiMeetExternalAPI(domain, options)`, `config.js`, and `interface_config.js`. Legacy Prosody XMPP XML, Jigasi SIP, Jibri Chrome recording, and SaaS telemetry add heavy non-core surface.
Decision: Provide drop-in `/external_api.js`, `/config.js`, and `/interface_config.js` alongside REST/WS APIs; mark XMPP/BOSH wire protocol, Jigasi, Jibri, and SaaS integrations out of scope for v1.0.0.
Consequences: Standard Jitsi iframe embedders work directly against Nova without Java/Lua XMPP servers.

## ADR-007: Verification gates & release audit bar
Status: accepted (2026-11-26)
Context: Video conferencing requires proving real ICE/media transport, not just HTTP 200 checks.
Decision: Enforce `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `(cd web && bun run typecheck && bun run build)`, UniFFI Swift/Kotlin binding generation, `tools/smoke.sh`, two-peer Playwright Chromium WebRTC SFU E2E (`tools/e2e.mjs` verifying connected ICE + decoded remote video), `tools/bench.sh`, and release artifact inspection (`docs/REA-AUDIT.md`).
Consequences: Every shipped binary and bundle is verified end-to-end across HTTP, WebSocket, and UDP WebRTC media.
