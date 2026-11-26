# Whole-App Port Map (`jitsi-meet` -> `nova`)

Reference: `/Users/beyondb/Halim/Projects/CEG/prjtss/jitsi-meet` (read-only Apache-2.0)
Target: `/Users/beyondb/Halim/Projects/CEG/prjtss/nova` (branch `NVA-001/feat-nova-bootstrap`)
ADRs: [DECISIONS.md](DECISIONS.md) | Terms: [GLOSSARY.md](GLOSSARY.md) | Research: [research/](research/)

## Wave Status

| Wave | Unit | Target files | State | Notes |
| --- | --- | --- | --- | --- |
| Wave 1 | Reference clone, `rust-anything analyze`, repo & convention bootstrap | `AGENTS.md`, `docs/`, `.githooks/`, `scripts/`, `rust/` | `in_progress` | `NVA-NNN/*` hooks + workflows + ADRs |
| Wave 2 | Rust workspace: `nova-core` (UniFFI) + `nova-server` (`axum` + `str0m` SFU + `sqlx` SQLite + Argon2id/JWT + `external_api.js`) | `Cargo.toml`, `crates/nova-core/`, `crates/nova-server/` | `pending` | Zero clippy warnings, full unit tests |
| Wave 3 | React Router 8 + Tailwind v4 PWA frontend | `web/` | `pending` | Prejoin, SFU WebRTC, chat, polls, breakout, whiteboard, blur, E2EE, recorder |
| Wave 4 | UniFFI bindings + Native SwiftUI & Kotlin Compose apps | `mobile/` | `pending` | Real generated Swift + Kotlin UniFFI bindings |
| Wave 5 | Docker, `smoke.sh`, 2-peer Chromium WebRTC E2E, `bench.sh`, REA audit, screenshots & `README.md` | `docker/`, `tools/`, `docs/`, `README.md` | `pending` | Full local verification gate |

## Out of Scope (`ADR-006`)
- Legacy Prosody XMPP/BOSH XML wire protocol
- Jigasi SIP/PSTN gateway
- Jibri headless Chrome recording / RTMP live streaming
- SaaS third-party integrations (YouTube, Dropbox, Salesforce, Amplitude)
