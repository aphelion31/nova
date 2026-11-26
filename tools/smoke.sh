#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "1. Checking health, readiness, status, and Jitsi compat scripts..."
curl -fsS "$BASE/health" | grep -q '"ok"'
curl -fsS "$BASE/ready" | grep -q '"ready"'
curl -fsS "$BASE/api/status" | grep -q '"nova"'
curl -fsS "$BASE/api/config" | grep -q '"sharedVideo":true'
curl -fsS "$BASE/config.js" | grep -q 'var config'
curl -fsS "$BASE/interface_config.js" | grep -q '#040404'
curl -fsS "$BASE/external_api.js" | grep -q 'JitsiMeetExternalAPI'

echo "2. Testing Argon2id host register, login, and session cookie..."
EMAIL="smoke-$(date +%s)@nova.local"
REG_CODE=$(curl -s -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -X POST "$BASE/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"display_name\":\"Smoke Host\",\"password\":\"NovaPass-2026!\"}")
[[ "$REG_CODE" == "201" ]]

curl -fsS -b "$COOKIE_JAR" "$BASE/api/auth/me" | grep -q "$EMAIL"
curl -fsS -c "$COOKIE_JAR" -X POST "$BASE/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"NovaPass-2026!\"}" | grep -q "$EMAIL"

echo "3. Testing room creation, password lock, JWT token minting, file upload, and feedback..."
ROOM="smoke-room-$(date +%s)"
curl -fsS -b "$COOKIE_JAR" -X POST "$BASE/api/rooms" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"$ROOM\",\"subject\":\"Smoke Standup\",\"password\":\"secret123\",\"lobby_enabled\":false}" | grep -q "$ROOM"

curl -fsS "$BASE/api/rooms/$ROOM" | grep -q '"has_password":true'
TOK=$(curl -fsS -b "$COOKIE_JAR" -X POST "$BASE/api/rooms/$ROOM/token" \
  -H 'Content-Type: application/json' \
  -d '{"display_name":"Smoke Mod","moderator":true}' | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); if(!d.token || !d.moderator) process.exit(1); console.log(d.token);")

FILE_ID=$(curl -fsS -b "$COOKIE_JAR" -X POST "$BASE/api/rooms/$ROOM/files" \
  -H 'Content-Type: application/json' \
  -d '{"filename":"agenda.txt","mime_type":"text/plain","data_base64":"SGVsbG8gTm92YQo=","sender_name":"Alice"}' | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf8')); console.log(d.file.id);")
curl -fsS "$BASE/api/rooms/$ROOM/files" | grep -q 'agenda.txt'
curl -fsSI "$BASE/api/rooms/$ROOM/files/$FILE_ID" | grep -qi 'X-Content-Type-Options: nosniff'
curl -fsS -X POST "$BASE/api/rooms/$ROOM/feedback" \
  -H 'Content-Type: application/json' \
  -d '{"rating":5,"comment":"Crisp SFU"}' | grep -q '"ok":true'

echo "4. Testing WebSocket signaling (Chat/Reply, Polls, Subtitles, SharedVideo, FollowMe, AVModeration, EndConference)..."
node - "$BASE" "$ROOM" "$TOK" <<'EOF'
const assert = require("node:assert/strict");
const [,, base, room, token] = process.argv;
const wsUrl = base.replace(/^http/, "ws") + `/ws/${room}`;

async function main() {
  const host = new WebSocket(wsUrl);
  const hostMsgs = [];
  await new Promise((res, rej) => {
    host.onopen = () => res();
    host.onerror = rej;
  });
  host.onmessage = (ev) => hostMsgs.push(JSON.parse(ev.data));
  host.send(JSON.stringify({
    type: "join",
    display_name: "Alice",
    token,
    audio_muted: false,
    video_muted: false
  }));

  await waitFor(() => hostMsgs.some((m) => m.type === "joined"));
  const joined = hostMsgs.find((m) => m.type === "joined");
  assert.equal(joined.is_moderator, true);
  assert.equal(joined.files.length, 1);

  const badGuest = new WebSocket(wsUrl);
  const badMsgs = [];
  await new Promise((res) => { badGuest.onopen = res; });
  badGuest.onmessage = (ev) => badMsgs.push(JSON.parse(ev.data));
  badGuest.send(JSON.stringify({ type: "join", display_name: "Bad", password: "wrong" }));
  await waitFor(() => badMsgs.some((m) => m.type === "error" && m.code === "invalid_password"));
  badGuest.close();

  const guest = new WebSocket(wsUrl);
  const guestMsgs = [];
  await new Promise((res) => { guest.onopen = res; });
  guest.onmessage = (ev) => guestMsgs.push(JSON.parse(ev.data));
  guest.send(JSON.stringify({ type: "join", display_name: "Bob", password: "secret123" }));
  await waitFor(() => guestMsgs.some((m) => m.type === "joined"));

  host.send(JSON.stringify({ type: "chat_send", body: "Hello from smoke test", recipient_id: null }));
  await waitFor(() => guestMsgs.some((m) => m.type === "chat_message" && m.message.body === "Hello from smoke test"));
  const msg1 = guestMsgs.find((m) => m.type === "chat_message").message;

  guest.send(JSON.stringify({ type: "chat_send", body: "Reply message", recipient_id: null, reply_to_id: msg1.id }));
  await waitFor(() => hostMsgs.some((m) => m.type === "chat_message" && m.message.reply_to_id === msg1.id));

  host.send(JSON.stringify({ type: "poll_create", question: "Ship Nova?", options: ["Yes", "Now"] }));
  await waitFor(() => guestMsgs.some((m) => m.type === "poll_updated"));
  const poll = guestMsgs.find((m) => m.type === "poll_updated").poll;
  guest.send(JSON.stringify({ type: "poll_vote", poll_id: poll.id, option_index: 0 }));
  await waitFor(() => hostMsgs.some((m) => m.type === "poll_updated" && m.poll.options[0].voters.length === 1));

  host.send(JSON.stringify({ type: "breakout_create", name: "Team A" }));
  await waitFor(() => guestMsgs.some((m) => m.type === "breakout_updated" && m.breakouts.length === 1));

  host.send(JSON.stringify({
    type: "whiteboard_stroke",
    stroke: { id: "s1", author_id: "x", color: "#4687ED", width: 3, points: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.5 }] }
  }));
  await waitFor(() => guestMsgs.some((m) => m.type === "whiteboard_stroke"));

  host.send(JSON.stringify({ type: "subtitle", text: "Testing captions", is_final: true }));
  await waitFor(() => guestMsgs.some((m) => m.type === "subtitle" && m.entry.text === "Testing captions"));

  host.send(JSON.stringify({ type: "shared_video", url: "https://example.com/demo.mp4", playing: true, time_secs: 5 }));
  await waitFor(() => guestMsgs.some((m) => m.type === "shared_video_updated" && m.state && m.state.playing));

  host.send(JSON.stringify({ type: "follow_me", enabled: true, pinned_peer_id: null, tile_view: false }));
  await waitFor(() => guestMsgs.some((m) => m.type === "follow_me_updated" && m.state.enabled));

  host.send(JSON.stringify({ type: "av_moderation", start_audio_muted: true, start_video_muted: false }));
  await waitFor(() => guestMsgs.some((m) => m.type === "room_security_updated" && m.security.start_audio_muted));

  host.send(JSON.stringify({ type: "mute_everyone", include_video: false }));
  await waitFor(() => guestMsgs.some((m) => m.type === "moderated" && m.action === "mute_audio"));

  host.send(JSON.stringify({ type: "end_conference" }));
  await waitFor(() => guestMsgs.some((m) => m.type === "conference_ended"));

  host.close();
  guest.close();

  async function waitFor(pred, timeoutMs = 4000) {
    const start = Date.now();
    while (!pred()) {
      if (Date.now() - start > timeoutMs) throw new Error("Timed out waiting for WS message");
      await new Promise((r) => setTimeout(r, 25));
    }
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
EOF

curl -fsS "$BASE/api/rooms/$ROOM/messages" | grep -q "Reply message"
curl -fsS "$BASE/api/rooms/$ROOM/polls" | grep -q "Ship Nova?"
curl -fsS "$BASE/api/rooms/$ROOM/stats" | grep -q '"sfu_udp_addr"'

echo "✔ PASS: smoke test verified HTTP, files, feedback, Argon2id, JWT, WS signaling, subtitles, shared video, and moderation"
