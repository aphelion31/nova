# Nova Native Mobile Clients (SwiftUI + Kotlin Compose + Rust UniFFI)

Nova avoids React Native (`0.85` + Hermes + Metro) and Flutter (Dart VM + Skia/Impeller) overhead on mobile by compiling shared room state, WebSocket signaling codecs, URL parsing, and HKDF/AES-256-GCM E2EE key derivation once in Rust (`crates/nova-core`) and exporting bindings via **UniFFI 0.33** to thin native UIs:

- **iOS (`mobile/ios/`)**: SwiftUI + `AVAudioSession` + CallKit/WebRTC adapter (`NovaCoreFFI` + `NovaCore` + `NovaApp`).
- **Android (`mobile/android/`)**: Jetpack Compose Material3 + `CallForegroundService` + `stream-webrtc-android` + `OkHttp` (`uniffi.nova_core`).

## Generate Swift & Kotlin UniFFI Bindings

```bash
./mobile/scripts/generate-bindings.sh
```

## Cross-Compile Native Binaries

### iOS (`arm64` device + simulator XCFramework)
```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim
cargo build -p nova-core --release --target aarch64-apple-ios
cargo build -p nova-core --release --target aarch64-apple-ios-sim
xcodebuild -create-xcframework \
  -library target/aarch64-apple-ios/release/libnova_core.a -headers mobile/ios/Sources/NovaCoreFFI/include \
  -library target/aarch64-apple-ios-sim/release/libnova_core.a -headers mobile/ios/Sources/NovaCoreFFI/include \
  -output mobile/ios/NovaCoreFFI.xcframework
```

### Android (`jniLibs` via `cargo-ndk`)
```bash
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
cargo install cargo-ndk
cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 \
  -o mobile/android/app/src/main/jniLibs build -p nova-core --release
cd mobile/android && ./gradlew assembleRelease
```
