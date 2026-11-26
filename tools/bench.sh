#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="${1:-../jitsi-meet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Source, Tree & Dependency Metrics ==="
python3 - "$UPSTREAM" <<'PY'
import json, os, re, sys

upstream = sys.argv[1]

def measure_tree(root, exts, exclude_dirs):
    files = 0
    loc = 0
    nbytes = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        for fn in filenames:
            if exts is None or any(fn.endswith(e) for e in exts):
                p = os.path.join(dirpath, fn)
                if not os.path.islink(p):
                    try:
                        nbytes += os.stat(p).st_size
                        files += 1
                        with open(p, "rb") as f:
                            loc += sum(1 for _ in f)
                    except OSError:
                        pass
    return files, loc, nbytes

def dir_size(root, exclude_dirs):
    total = 0
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        for fn in filenames:
            p = os.path.join(dirpath, fn)
            if not os.path.islink(p):
                try:
                    total += os.stat(p).st_size
                except OSError:
                    pass
    return total

def parse_cargo_deps(paths):
    deps = set()
    for p in paths:
        if not os.path.isfile(p):
            continue
        in_deps = False
        for line in open(p):
            s = line.strip()
            if s.startswith("["):
                in_deps = s == "[dependencies]"
                continue
            if in_deps and "=" in s and not s.startswith("#"):
                name = s.split("=", 1)[0].strip()
                if name != "nova-core":
                    deps.add(name)
    return deps

if os.path.isdir(upstream):
    jf, jloc, jbytes = measure_tree(
        upstream,
        (".ts", ".tsx", ".js", ".jsx", ".scss", ".css", ".java", ".swift", ".kt"),
        {".git", "node_modules", "libs", "build", "dist"},
    )
    j_clean = dir_size(upstream, {".git", "node_modules"})
    j_disk = dir_size(upstream, set())
    pkg = json.load(open(os.path.join(upstream, "package.json")))
    j_deps = len(pkg.get("dependencies", {}))
    j_dev = len(pkg.get("devDependencies", {}))
    print(f"Upstream code: {jf} files, {jloc} LOC, {jbytes / 1048576:.2f} MiB")
    print(f"Upstream clean source tree: {j_clean / 1048576:.2f} MiB ({j_clean / 1e6:.2f} MB)")
    print(f"Upstream checkout on disk (w/.git): {j_disk / 1048576:.2f} MiB")
    print(f"Upstream npm packages: {j_deps + j_dev} ({j_deps} runtime + {j_dev} dev)")

rf, rloc, rbytes = measure_tree("crates", (".rs", ".sql"), {"target"})
wf, wloc, wbytes = measure_tree("web/app", (".ts", ".tsx", ".css"), {"node_modules", "build"})

ios_f, ios_loc, ios_b = measure_tree("mobile/ios/Sources/NovaApp", (".swift",), set())
and_f, and_loc, and_b = measure_tree("mobile/android/app/src/main/java/dev", (".kt",), set())
man_b = os.stat("mobile/android/app/src/main/AndroidManifest.xml").st_size if os.path.isfile("mobile/android/app/src/main/AndroidManifest.xml") else 0
man_loc = sum(1 for _ in open("mobile/android/app/src/main/AndroidManifest.xml", "rb")) if man_b else 0
mf = ios_f + and_f + (1 if man_b else 0)
mloc = ios_loc + and_loc + man_loc
mbytes = ios_b + and_b + man_b

n_clean = dir_size(".", {".git", "node_modules", "target", "build", ".build", ".react-router"})
rust_deps = parse_cargo_deps(["crates/nova-core/Cargo.toml", "crates/nova-server/Cargo.toml"])
web_pkg = json.load(open("web/package.json"))
w_deps = len(web_pkg.get("dependencies", {}))
w_dev = len(web_pkg.get("devDependencies", {}))

print(f"Nova Rust backend+core (.rs+.sql): {rf} files, {rloc} LOC, {rbytes / 1024:.1f} KiB ({rbytes / 1048576:.2f} MiB)")
print(f"Nova Web (React Router web/app): {wf} files, {wloc} LOC, {wbytes / 1024:.1f} KiB ({wbytes / 1048576:.2f} MiB)")
print(f"Nova Mobile native UI (SwiftUI+Compose): {mf} files, {mloc} LOC, {mbytes / 1024:.1f} KiB ({mbytes / 1048576:.2f} MiB)")
print(f"Nova total authored code: {rf + wf + mf} files, {rloc + wloc + mloc} LOC, {(rbytes + wbytes + mbytes) / 1048576:.2f} MiB")
print(f"Nova clean source tree: {n_clean / 1048576:.2f} MiB ({n_clean / 1e6:.2f} MB)")
print(f"Nova direct deps: {len(rust_deps)} Rust crates + {w_deps + w_dev} npm packages ({w_deps} runtime + {w_dev} dev)")

bin = "target/release/nova"
if os.path.isfile(bin):
    bb = os.stat(bin).st_size
    print(f"Nova release binary: {bb} bytes ({bb / 1048576:.2f} MiB)")
if os.path.isdir("web/build/client"):
    wb = dir_size("web/build/client", set())
    wa = dir_size("web/build/client/assets", set()) if os.path.isdir("web/build/client/assets") else 0
    wba = dir_size("web/build/client/brand-assets", set()) if os.path.isdir("web/build/client/brand-assets") else 0
    print(f"Nova web/build/client: {wb} bytes ({wb / 1024:.1f} KiB / {wb / 1048576:.2f} MiB) [assets={wa / 1024:.1f} KiB, brand-assets={wba / 1024:.1f} KiB]")
sw_gen = dir_size("mobile/ios/Generated", set()) if os.path.isdir("mobile/ios/Generated") else 0
kt_gen = dir_size("mobile/android/app/src/main/java/uniffi", set()) if os.path.isdir("mobile/android/app/src/main/java/uniffi") else 0
print(f"Nova UniFFI generated bindings: Swift={sw_gen / 1024:.1f} KiB, Kotlin={kt_gen / 1024:.1f} KiB")
PY

BIN="target/release/nova"
if [[ ! -x "$BIN" ]]; then
  cargo build --release --locked -p nova-server
fi

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
echo "=== Runtime Startup & Memory ==="
echo "nova cold startup: ${COLD_MS} ms"
echo "nova idle RSS: $(awk -v v="$IDLE_RSS_KB" 'BEGIN {printf "%.2f MiB", v/1024}') ($IDLE_RSS_KB KiB)"

if command -v oha >/dev/null 2>&1; then
  echo "=== oha GET /api/status (5s, 32 concurrent) ==="
  oha -z 5s -c 32 --no-tui "http://127.0.0.1:$PORT/api/status" | grep -E 'Requests/sec|Average|50\.00%|95\.00%|99\.00%|Status code|\[200\]' || true
  echo "=== oha GET /external_api.js (5s, 32 concurrent) ==="
  oha -z 5s -c 32 --no-tui "http://127.0.0.1:$PORT/external_api.js" | grep -E 'Requests/sec|Average|50\.00%|95\.00%|99\.00%|Status code|\[200\]' || true
fi

LOAD_RSS_KB=$(ps -o rss= -p "$PID" | tr -d ' ')
echo "nova post-load RSS: $(awk -v v="$LOAD_RSS_KB" 'BEGIN {printf "%.2f MiB", v/1024}') ($LOAD_RSS_KB KiB)"
