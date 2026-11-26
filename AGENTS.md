# AGENTS.md

Guidance for AI agents working in this repository.

## What this is

Nova is a lightweight rewrite of [Jitsi Meet](https://github.com/jitsi/jitsi-meet): Prosody (XMPP), Jicofo, Jitsi Videobridge (Java SFU), and Nginx are replaced by one compiled Rust binary (`axum 0.8` + `str0m 0.26` WebRTC SFU + `sqlx 0.8` SQLite), paired with a React Router 8 PWA frontend (`web/`) and native iOS SwiftUI + Android Kotlin Compose mobile apps powered by shared Rust logic via UniFFI (`crates/nova-core`).

| Path | Role |
| --- | --- |
| `crates/nova-core/` | Shared Rust protocol, deterministic room state machine, E2EE key schedule, and UniFFI exports |
| `crates/nova-server/` | Rust backend (`nova` binary): Axum HTTP/WS signaling, `str0m` SFU, SQLite persistence, Argon2id/JWT auth, `/external_api.js` |
| `web/` | React Router 8 SPA + PWA (Vite 8, Tailwind v4, Bun `1.4.4`, `lucide-react`) |
| `mobile/` | Native SwiftUI (`mobile/ios/`) + Kotlin Compose (`mobile/android/`) clients + `mobile/scripts/generate-bindings.sh` |
| `tools/` | API/WS smoke test (`smoke.sh`), Playwright 2-peer WebRTC E2E (`e2e.mjs`), size & `oha` benchmark (`bench.sh`) |
| `scripts/` | Git hook checks, branch helper, and frontend build helper |
| `docs/` | Architecture, compatibility, deployment, REA audit, and git process docs |
| `rust/` | `rust-anything` port tracking (`MAP.md`, `DECISIONS.md`, `GLOSSARY.md`, `HANDOFF.md`, `research/`, `app-cases/`) |

Read [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) before making structural changes.

## Non-negotiables

**Bind every SQL value.** Use `sqlx::query(...).bind(...)`. Never format request input into SQL.

**Enforce moderator, lock, and lobby checks server-side.** Room passwords, lobby admission, breakout room isolation, and moderation (`mute_audio`, `mute_video`, `kick`, `grant_moderator`) are validated on the server before updating room state or broadcasting SFU media.

**Breakout room media isolation.** Peers in different breakout rooms (`breakout_id`) must never receive each other's RTP/RTCP media packets or tracks from `crates/nova-server/src/sfu.rs`.

**Never pass `0.0.0.0` as an ICE host candidate.** `str0m` host candidates must use a reachable IPv4 address (`SFU_PUBLIC_IP`, detected LAN IP, or `127.0.0.1`).

**Argon2id for host passwords.** Passwords are hashed and verified exclusively with `argon2` (`Algorithm::Argon2id`, `Version::V0x13`). No plaintext passwords stored or compared.

**The frontend talks to the backend over HTTP + WebSocket only.** `web/` never imports Rust crates directly; `mobile/` shares state/protocol exclusively through generated UniFFI bindings in `crates/nova-core`.

**React 19 `useEffect` safety.** A `useEffect` callback must return `undefined` or a cleanup function, never a Promise or return value.

## Commands

```bash
cargo fmt --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo build --release --locked

(cd web && bun install --frozen-lockfile && bun run typecheck && bun run build)
./mobile/scripts/generate-bindings.sh

BASE=http://127.0.0.1:3000 ./tools/smoke.sh
BASE=http://127.0.0.1:3000 node tools/e2e.mjs
```

Verification before claiming work is done: `cargo fmt --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `(cd web && bun run typecheck && bun run build)`, and end-to-end verification against a running `--release` binary.

## Conventions

Branches are `NVA-<number>/<type>-<description>` cut from `develop` (`scripts/new-branch.sh`).
Commits are Conventional Commits in English. Both are enforced by `.githooks/`, along with a block on direct pushes to `develop` and `master`. Never add AI co-author trailers to commits. See [`docs/github/`](docs/github/).

Rust: `cargo fmt` style (`max_width = 120`). TypeScript: two-space indent, double quotes.
