#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Building nova-core shared library..."
cargo build -p nova-core

EXT="so"
if [[ "$(uname -s)" == "Darwin" ]]; then
  EXT="dylib"
elif [[ "$(uname -s)" == MINGW* || "$(uname -s)" == MSYS* ]]; then
  EXT="dll"
fi

LIB_PATH="$ROOT/target/debug/libnova_core.$EXT"
if [[ ! -f "$LIB_PATH" ]]; then
  echo "Expected shared library not found at $LIB_PATH" >&2
  exit 1
fi

SWIFT_TMP="$ROOT/mobile/ios/Generated"
mkdir -p "$SWIFT_TMP" "$ROOT/mobile/ios/Sources/NovaCoreFFI/include" "$ROOT/mobile/ios/Sources/NovaCore"

echo "Generating Swift UniFFI bindings..."
cargo run -p nova-core --features bindgen --bin uniffi-bindgen -- generate \
  --library "$LIB_PATH" \
  --language swift \
  --out-dir "$SWIFT_TMP"

cp "$SWIFT_TMP/nova_core.swift" "$ROOT/mobile/ios/Sources/NovaCore/nova_core.swift"
cp "$SWIFT_TMP/nova_coreFFI.h" "$ROOT/mobile/ios/Sources/NovaCoreFFI/include/nova_coreFFI.h"
cp "$SWIFT_TMP/nova_coreFFI.modulemap" "$ROOT/mobile/ios/Sources/NovaCoreFFI/include/module.modulemap"
# SwiftPM requires an empty C stub if a C target has headers only
if [[ ! -f "$ROOT/mobile/ios/Sources/NovaCoreFFI/shim.c" ]]; then
  echo "int nova_core_ffi_shim(void) { return 0; }" > "$ROOT/mobile/ios/Sources/NovaCoreFFI/shim.c"
fi

KOTLIN_OUT="$ROOT/mobile/android/app/src/main/java"
mkdir -p "$KOTLIN_OUT"

echo "Generating Kotlin UniFFI bindings..."
cargo run -p nova-core --features bindgen --bin uniffi-bindgen -- generate \
  --library "$LIB_PATH" \
  --language kotlin \
  --out-dir "$KOTLIN_OUT"

echo "✔ Generated Swift bindings in mobile/ios/{Generated,Sources/NovaCore*}"
echo "✔ Generated Kotlin bindings in mobile/android/app/src/main/java/uniffi/nova_core/"
