# Research: `str0m 0.26` Sans-IO WebRTC SFU

Primary sources:
- `algesten/str0m` v0.26.0 crate manifest (`crates.io/api/v1/crates/str0m`)
- `algesten/str0m` `examples/chat.rs` SFU reference implementation

## Key Design Facts
1. **Crypto provider initialization:** Call `str0m::crypto::from_feature_flags().install_process_default()` once (`std::sync::Once`) before constructing any `Rtc`. Use `default-features = false, features = ["aws-lc-rs"]` so `examples` (`rouille`) is excluded.
2. **Candidate address rule:** Never pass `0.0.0.0` to `Candidate::host(addr, "udp")`. Bind the UDP socket to `SFU_UDP_BIND` (e.g. `0.0.0.0:10000`) and advertise a concrete loopback (`127.0.0.1:<port>`) + LAN/public IPv4 (`SFU_PUBLIC_IP` or interface scan) candidate so local browsers and LAN peers both establish ICE connectivity.
3. **Sans-IO event loop:** Run a dedicated OS thread calling `socket.set_read_timeout(Some(duration))` (clamped >= 1 ms), feeding `Input::Receive` to matching `peer.rtc.accepts(&input)` and `Input::Timeout(now)`, draining `poll_output()` (`Output::Transmit`, `Output::Timeout`, `Output::Event`), and queuing outbound tracks (`TrackOutState`) whenever `peer.pending.is_none()`.
4. **Track attribution (`track_map`):** Browser `ontrack` yields `transceiver.mid`. Sending `track_map: HashMap<String, TrackMeta>` (`owner_peer_id`, `kind`) alongside `RtcRenegotiateOffer` lets every client attach remote streams to the right participant tile reliably.
5. **Keyframe recovery & breakout isolation:** Emit throttled `KeyframeRequestKind::Fir` when `!data.contiguous` or a subscriber opens a track; filter both `TrackOpen` and `MediaData` by `(room_name, breakout_id)`.
