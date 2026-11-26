# Research: UniFFI 0.33 Native SwiftUI & Kotlin Compose Architecture

Primary sources:
- `mozilla/uniffi-rs` (`uniffi` `0.33.0` crates.io feature manifest)
- Local toolchain check: `Xcode 27.2`, `swiftc`, `java`, `~/Library/Android/sdk`

## Key Design Facts
1. **Proc-macro scaffolding (`0.33`):** Use `uniffi::setup_scaffolding!();` inside `crates/nova-core/src/lib.rs` with `#[derive(uniffi::Record)]`, `#[derive(uniffi::Enum)]`, `#[derive(uniffi::Error)]`, and `#[derive(uniffi::Object)]` + `#[uniffi::export]`. No `.udl` or `build.rs` needed.
2. **Keep `cdylib`/`staticlib` lean:** Gate `uniffi/cli` behind `bindgen = ["uniffi/cli"]` on `[[bin]] name = "uniffi-bindgen"` so mobile `.dylib`/`.so`/`.a` binaries do not link `clap` or `uniffi_bindgen`.
3. **Thread safety for shared state:** Wrap mutable room state inside `std::sync::Mutex<RoomSnapshot>` on `NovaClientCore` (`#[derive(uniffi::Object)]`) so Swift and Kotlin callers invoke `&self` methods concurrently without `Send`/`Sync` traps.
4. **Mobile native integration boundary:**
   - Rust `nova-core` owns signaling JSON codecs (`ClientMessage`/`ServerMessage`), URL parsing, deterministic `RoomSnapshot` state updates, and HKDF/AES-256-GCM E2EE key derivation.
   - SwiftUI (`CallKit`/`AVAudioSession`/WebRTC adapter) and Jetpack Compose (`CallForegroundService`/`stream-webrtc-android`/`OkHttp`) own camera/mic capture, audio routing, and hardware media rendering without any JS VM, Dart VM, or WebView overhead.
