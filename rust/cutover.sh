#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Nova Cutover & Production Readiness Checklist ==="
echo "1. Ensure web SPA is built into web/build/client"
read -r -p "Press Enter to verify web/build/client exists..." _
test -f web/build/client/index.html && echo "✔ web/build/client/index.html found"

echo "2. Ensure release binary is built (target/release/nova)"
read -r -p "Press Enter to verify target/release/nova..." _
test -x target/release/nova && echo "✔ target/release/nova ready"

echo "3. Set production secrets in .env (SECRET_KEY_BASE, JWT_APP_SECRET, SFU_PUBLIC_IP)"
read -r -p "Press Enter once .env and firewall UDP 10000/udp are configured..." _

echo "4. Start Nova and verify /health and /ready"
read -r -p "Press Enter to probe http://127.0.0.1:3000/ready (Ctrl+C to skip)..." _
curl -fsS http://127.0.0.1:3000/ready && echo ""

echo "✔ Nova cutover check finished. Legacy Jitsi containers (prosody/jicofo/jvb) can be stopped."
