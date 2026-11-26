# Architecture

Short index. The details live in numbered documents under [`architectures/`](architectures/):

| Doc | Covers |
| --- | --- |
| [01.OVERVIEW.md](architectures/01.OVERVIEW.md) | What Nova replaces, WebRTC SFU loop, signaling, auth |
| [02.STRUCTURE-PROJECT.md](architectures/02.STRUCTURE-PROJECT.md) | Workspace tree, crates, frontend routes, native mobile, env |
| [03.JITSI-COMPAT.md](architectures/03.JITSI-COMPAT.md) | `external_api.js`, `config.js`, JWT rooms, scope boundaries |
| [04.DEPLOY.md](architectures/04.DEPLOY.md) | Building release binary + PWA + mobile bindings + Docker |

Process docs (commit, branch, PR, release) live in [`github/`](github/):

| Doc | Covers |
| --- | --- |
| [01.GIT-COMMIT.md](github/01.GIT-COMMIT.md) | Conventional Commit format and hook checks |
| [02.GIT-BRANCH.md](github/02.GIT-BRANCH.md) | `develop`, `master`, `NVA-NNN/<type>-*` branches, release and hotfix |
| [03.GIT-PR-FLOW.md](github/03.GIT-PR-FLOW.md) | PR titles, review, merge, versioning, release |

## Rules that must not break

- **Server-side room authority.** Room lock/password, lobby admission, breakout isolation, and moderation commands are enforced in `crates/nova-server`.
- **Breakout room media isolation.** Peers in different `breakout_id` rooms never exchange tracks or RTP/RTCP packets in `str0m`.
- **Values are bound in SQL.** Every `sqlx` query uses `.bind(...)` against SQLite.
- **Shared client state lives in `crates/nova-core`.** Mobile Swift/Kotlin clients use generated UniFFI bindings, never duplicated protocol state machines.

## Request & Media Paths

```text
web PWA:      browser (React Router SPA) -> /ws/{room} (WS JSON) + UDP/ICE <-> nova (Axum + str0m SFU)
embed:        host site -> /external_api.js -> iframe /embed/{room} <-> postMessage + /ws/{room}
native apps:  iOS SwiftUI / Android Compose -> UniFFI (nova-core) -> /ws/{room} + native libwebrtc <-> str0m SFU
persistence:  rooms, users (Argon2id), chat messages, polls -> sqlx SQLite (nova.db WAL)
```
