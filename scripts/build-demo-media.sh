#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p docs/media

SHOTS=(
  "docs/screenshots/home.png"
  "docs/screenshots/prejoin.png"
  "docs/screenshots/meeting-grid.png"
  "docs/screenshots/meeting-chat-polls.png"
  "docs/screenshots/meeting-settings.png"
  "docs/screenshots/meeting-whiteboard.png"
  "docs/screenshots/meeting-visitor-dialog.png"
  "docs/screenshots/login.png"
)

for s in "${SHOTS[@]}"; do
  if [[ ! -f "$s" ]]; then
    echo "Missing screenshot: $s" >&2
    exit 1
  fi
done

echo "Encoding docs/media/nova-demo.mp4 (1280x800 H.264, smooth crossfades)..."
ffmpeg -y \
  -loop 1 -t 2.2 -i "${SHOTS[0]}" \
  -loop 1 -t 2.2 -i "${SHOTS[1]}" \
  -loop 1 -t 2.2 -i "${SHOTS[2]}" \
  -loop 1 -t 2.2 -i "${SHOTS[3]}" \
  -loop 1 -t 2.2 -i "${SHOTS[4]}" \
  -loop 1 -t 2.2 -i "${SHOTS[5]}" \
  -loop 1 -t 2.2 -i "${SHOTS[6]}" \
  -loop 1 -t 2.2 -i "${SHOTS[7]}" \
  -filter_complex "\
    [0:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v0]; \
    [1:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v1]; \
    [2:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v2]; \
    [3:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v3]; \
    [4:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v4]; \
    [5:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v5]; \
    [6:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v6]; \
    [7:v]scale=1280:800:flags=lanczos,fps=30,format=yuv420p,setsar=1[v7]; \
    [v0][v1]xfade=transition=fade:duration=0.4:offset=1.8[x01]; \
    [x01][v2]xfade=transition=fade:duration=0.4:offset=3.6[x02]; \
    [x02][v3]xfade=transition=fade:duration=0.4:offset=5.4[x03]; \
    [x03][v4]xfade=transition=fade:duration=0.4:offset=7.2[x04]; \
    [x04][v5]xfade=transition=fade:duration=0.4:offset=9.0[x05]; \
    [x05][v6]xfade=transition=fade:duration=0.4:offset=10.8[x06]; \
    [x06][v7]xfade=transition=fade:duration=0.4:offset=12.6[vout]" \
  -map "[vout]" \
  -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart \
  docs/media/nova-demo.mp4

echo "Encoding docs/media/nova-demo.gif (960x600, 10fps, 2-pass palette)..."
PALETTE="$(mktemp /tmp/nova-palette.XXXXXX.png)"
trap 'rm -f "$PALETTE"' EXIT

ffmpeg -y -i docs/media/nova-demo.mp4 \
  -vf "fps=10,scale=960:-1:flags=lanczos,palettegen=max_colors=128:stats_mode=diff" \
  "$PALETTE"

ffmpeg -y -i docs/media/nova-demo.mp4 -i "$PALETTE" \
  -lavfi "fps=10,scale=960:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" \
  -loop 0 \
  docs/media/nova-demo.gif

ls -lh docs/media/nova-demo.mp4 docs/media/nova-demo.gif
