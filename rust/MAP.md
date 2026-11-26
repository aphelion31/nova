# Whole-App Port Map (`jitsi-meet` -> `nova`)

Reference: `/Users/beyondb/Halim/Projects/CEG/prjtss/jitsi-meet` (read-only Apache-2.0)
Target: `/Users/beyondb/Halim/Projects/CEG/prjtss/nova` (branch `NVA-001/feat-nova-bootstrap`)
ADRs: [DECISIONS.md](DECISIONS.md) | Terms: [GLOSSARY.md](GLOSSARY.md) | Research: [research/](research/) | Handoff: [HANDOFF.md](HANDOFF.md)

## Wave Status

| Wave | Unit | Target files | State | Notes |
| --- | --- | --- | --- | --- |
| Wave 1 | Reference clone, `rust-anything analyze`, repo & convention bootstrap | `AGENTS.md`, `docs/`, `.githooks/`, `scripts/`, `rust/` | `done` | `NVA-NNN/*` hooks, workflows, ADRs, glossary |
| Wave 2 | Rust workspace: `nova-core` (UniFFI) + `nova-server` (`axum` + `str0m` SFU + `sqlx` SQLite + Argon2id/JWT + `external_api.js`) | `Cargo.toml`, `crates/nova-core/`, `crates/nova-server/` | `done` | 0 clippy warnings, 9/9 unit tests passing |
| Wave 3 | React Router 8 + Tailwind v4 PWA frontend | `web/` | `done` | `tsc` + `react-router build` clean (`548 KiB`) |
| Wave 4 | UniFFI bindings + Native SwiftUI & Kotlin Compose apps (full Jitsi native UI parity) | `mobile/` | `done` | `swift build` clean + `nova_core.kt` generated |
| Wave 5 | Docker, `smoke.sh`, 2-peer Chromium WebRTC E2E, `bench.sh`, REA audit, screenshots & `README.md` | `docker/`, `tools/`, `docs/`, `README.md` | `done` | 2-peer `str0m` SFU connected + decoded remote video, 0 browser errors |

## Out of Scope (`ADR-006`)
- Legacy Prosody XMPP/BOSH XML wire protocol
- Jigasi SIP/PSTN gateway
- Jibri headless Chrome recording / RTMP live streaming
- SaaS third-party integrations (YouTube, Dropbox, Salesforce, Amplitude)
