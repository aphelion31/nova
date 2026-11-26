#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="${1:-../jitsi-meet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Source & Dependency Metrics ==="
if [[ -d "$UPSTREAM" ]]; then
  JITSI_FILES=$(find "$UPSTREAM" -maxdepth 6 \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.scss' -o -name '*.css' -o -name '*.java' -o -name '*.swift' -o -name '*.kt' \) -not -path '*/node_modules/*' -not -path '*/.git/*' | wc -l | tr -d ' ')
  JITSI_LOC=$(find "$UPSTREAM" -maxdepth 6 \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.scss' -o -name '*.css' -o -name '*.java' -o -name '*.swift' -o -name '*.kt' \) -not -path '*/node_modules/*' -not -path '*/.git/*' -print0 | xargs -0 cat | wc -l | tr -d ' ')
  JITSI_NPM=$(node -e "const p=require('$UPSTREAM/package.json'); console.log(Object.keys(p.dependencies||{}).length + Object.keys(p.devDependencies||{}).length);")
  echo "jitsi-meet source: $JITSI_FILES files, $JITSI_LOC LOC, $JITSI_NPM direct npm packages (+ Prosody + Jicofo + JVB Java)"
fi

RUST_FILES=$(find crates -name '*.rs' | wc -l | tr -d ' ')
RUST_LOC=$(find crates -name '*.rs' -print0 | xargs -0 cat | wc -l | tr -d ' ')
WEB_FILES=$(find web/app -type f | wc -l | tr -d ' ')
WEB_LOC=$(find web/app -type f -print0 | xargs -0 cat | wc -l | tr -d ' ')
MOB_FILES=$(find mobile/ios/Sources/NovaApp mobile/android/app/src/main/java/dev -type f | wc -l | tr -d ' ')
MOB_LOC=$(find mobile/ios/Sources/NovaApp mobile/android/app/src/main/java/dev -type f -print0 | xargs -0 cat | wc -l | tr -d ' ')
echo "nova Rust (core+server): $RUST_FILES files, $RUST_LOC LOC"
echo "nova Web (React Router): $WEB_FILES files, $WEB_LOC LOC"
echo "nova Mobile (SwiftUI+Compose): $MOB_FILES files, $MOB_LOC LOC"

BIN="target/release/nova"
if [[ ! -x "$BIN" ]]; then
  cargo build --release --locked -p nova-server
fi
BIN_BYTES=$(stat -f%z "$BIN" 2>/dev/null || stat -c%s "$BIN")
WEB_KB=$(du -sk web/build/client | awk '{print $1}')
echo "nova release binary: $BIN_BYTES bytes ($(awk -v v="$BIN_BYTES" 'BEGIN {printf "%.2f MiB", v/1048576}'))"
echo "nova web/build/client: ${WEB_KB} KiB ($(awk -v v="$WEB_KB" 'BEGIN {printf "%.2f MiB", v/1024}'))"

PORT="${BENCH_PORT:-3911}"
UDP_PORT="${BENCH_UDP_PORT:-10911}"
TMP_DIR="$(mktemp -d /tmp/nova-bench-XXXXXX)"
TMP_DB="$TMP_DIR/nova.db"
trap 'rm -rf "$TMP_DIR"; kill "${PID:-0}" 2>/dev/null || true' EXIT

START_MS=$(python3 -c 'import time; print(int(time.time()*1000))')
BIND="127.0.0.1:$PORT" SFU_UDP_BIND="127.0.0.1:$UDP_PORT" DATABASE_URL="sqlite://$TMP_DB?mode=rwc" WEB_DIR=web/build/client "$BIN" serve >/tmp/nova-bench.log 2>&1 &
PID=$!
for _ in $(seq 1 100); do
  if curl -fsS "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.02
done
READY_MS=$(python3 -c 'import time; print(int(time.time()*1000))')
COLD_MS=$((READY_MS - START_MS))
IDLE_RSS_KB=$(ps -o rss= -p "$PID" | tr -d ' ')
echo "nova cold startup: ${COLD_MS} ms"
echo "nova idle RSS: $(awk -v v="$IDLE_RSS_KB" 'BEGIN {printf "%.2f MiB", v/1024}') ($IDLE_RSS_KB KiB)"

if command -v oha >/dev/null 2>&1; then
  echo "=== oha GET /api/status (5s, 32 concurrent) ==="
  oha -z 5s -c 32 "http://127.0.0.1:$PORT/api/status" | grep -E 'Requests/sec|Average|p50|p95|p99|Status code|\[200\]' || true
  echo "=== oha GET /external_api.js (5s, 32 concurrent) ==="
  oha -z 5s -c 32 "http://127.0.0.1:$PORT/external_api.js" | grep -E 'Requests/sec|Average|p50|p95|p99|Status code|\[200\]' || true
fi

LOAD_RSS_KB=$(ps -o rss= -p "$PID" | tr -d ' ')
echo "nova post-load RSS: $(awk -v v="$LOAD_RSS_KB" 'BEGIN {printf "%.2f MiB", v/1024}') ($LOAD_RSS_KB KiB)"
