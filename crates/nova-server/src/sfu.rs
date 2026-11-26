use anyhow::{Context, Result};
use nova_core::protocol::{MediaTrackKind, ServerMessage, TrackMeta};
use std::collections::{HashMap, VecDeque};
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, UdpSocket};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::mpsc::{self, Receiver, Sender, TryRecvError};
use std::sync::{Arc, Once, Weak};
use std::thread;
use std::time::{Duration, Instant};
use str0m::change::{SdpAnswer, SdpOffer, SdpPendingOffer};
use str0m::crypto::from_feature_flags;
use str0m::media::{Direction, KeyframeRequest, KeyframeRequestKind, MediaData, MediaKind, Mid, Rid};
use str0m::net::{Protocol, Receive};
use str0m::{Candidate, Event, IceConnectionState, Input, Output, Rtc};
use tokio::sync::{mpsc as tokio_mpsc, oneshot};
use tracing::{debug, info, warn};

static CRYPTO_INIT: Once = Once::new();

#[derive(Debug, Clone)]
pub struct SfuStatsSnapshot {
    pub peer_count: usize,
    pub udp_addr: String,
}

#[derive(Clone)]
pub struct SfuHandle {
    tx: Sender<SfuCmd>,
    pub udp_addr: SocketAddr,
}

enum SfuCmd {
    AcceptOffer {
        room_name: String,
        breakout_id: Option<String>,
        peer_id: String,
        offer_sdp: String,
        signal_tx: tokio_mpsc::UnboundedSender<ServerMessage>,
        reply_tx: oneshot::Sender<Result<(), String>>,
    },
    AcceptAnswer {
        peer_id: String,
        answer_sdp: String,
        reply_tx: oneshot::Sender<Result<(), String>>,
    },
    UpdateBreakout {
        peer_id: String,
        breakout_id: Option<String>,
    },
    RemovePeer {
        peer_id: String,
    },
    Stats {
        reply_tx: oneshot::Sender<SfuStatsSnapshot>,
    },
    Shutdown,
}

impl SfuHandle {
    pub fn spawn(udp_bind: &str, public_ip: Option<IpAddr>) -> Result<Self> {
        CRYPTO_INIT.call_once(|| {
            from_feature_flags().install_process_default();
        });

        let socket =
            UdpSocket::bind(udp_bind).with_context(|| format!("failed to bind SFU UDP socket on {udp_bind}"))?;
        let bound_addr = socket.local_addr().context("failed to read SFU UDP local_addr")?;
        let candidates = resolve_candidate_ips(bound_addr, public_ip);
        let (tx, rx) = mpsc::channel();

        info!(%bound_addr, ?candidates, "starting str0m WebRTC SFU");

        thread::Builder::new()
            .name("nova-sfu".to_string())
            .spawn(move || {
                run_sfu_loop(socket, bound_addr, candidates, rx);
            })
            .context("failed to spawn SFU thread")?;

        Ok(Self {
            tx,
            udp_addr: bound_addr,
        })
    }

    pub async fn accept_offer(
        &self,
        room_name: String,
        breakout_id: Option<String>,
        peer_id: String,
        offer_sdp: String,
        signal_tx: tokio_mpsc::UnboundedSender<ServerMessage>,
    ) -> Result<(), String> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.tx
            .send(SfuCmd::AcceptOffer {
                room_name,
                breakout_id,
                peer_id,
                offer_sdp,
                signal_tx,
                reply_tx,
            })
            .map_err(|_| "SFU thread stopped".to_string())?;
        reply_rx.await.map_err(|_| "SFU reply dropped".to_string())?
    }

    pub async fn accept_answer(&self, peer_id: String, answer_sdp: String) -> Result<(), String> {
        let (reply_tx, reply_rx) = oneshot::channel();
        self.tx
            .send(SfuCmd::AcceptAnswer {
                peer_id,
                answer_sdp,
                reply_tx,
            })
            .map_err(|_| "SFU thread stopped".to_string())?;
        reply_rx.await.map_err(|_| "SFU reply dropped".to_string())?
    }

    pub async fn update_breakout(&self, peer_id: String, breakout_id: Option<String>) {
        let _ = self.tx.send(SfuCmd::UpdateBreakout { peer_id, breakout_id });
    }

    pub async fn remove_peer(&self, peer_id: String) {
        let _ = self.tx.send(SfuCmd::RemovePeer { peer_id });
    }

    pub async fn stats(&self) -> SfuStatsSnapshot {
        let (reply_tx, reply_rx) = oneshot::channel();
        if self.tx.send(SfuCmd::Stats { reply_tx }).is_err() {
            return SfuStatsSnapshot {
                peer_count: 0,
                udp_addr: self.udp_addr.to_string(),
            };
        }
        reply_rx.await.unwrap_or(SfuStatsSnapshot {
            peer_count: 0,
            udp_addr: self.udp_addr.to_string(),
        })
    }

    pub fn shutdown(&self) {
        let _ = self.tx.send(SfuCmd::Shutdown);
    }
}

fn resolve_candidate_ips(bound: SocketAddr, public_ip: Option<IpAddr>) -> Vec<SocketAddr> {
    let port = bound.port();
    let mut addrs = Vec::new();
    if let Some(ip) = public_ip
        && !ip.is_unspecified()
    {
        addrs.push(SocketAddr::new(ip, port));
    }
    if !bound.ip().is_unspecified() {
        let candidate = SocketAddr::new(bound.ip(), port);
        if !addrs.contains(&candidate) {
            addrs.push(candidate);
        }
    } else {
        let loopback = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
        if !addrs.contains(&loopback) {
            addrs.push(loopback);
        }
        if let Ok(probe) = UdpSocket::bind("0.0.0.0:0")
            && probe.connect("192.0.2.1:80").is_ok()
            && let Ok(local) = probe.local_addr()
            && !local.ip().is_unspecified()
            && !local.ip().is_loopback()
        {
            let lan = SocketAddr::new(local.ip(), port);
            if !addrs.contains(&lan) {
                addrs.push(lan);
            }
        }
    }
    addrs
}

fn parse_sdp_offer(raw: &str) -> Result<SdpOffer, String> {
    if let Ok(offer) = SdpOffer::from_sdp_string(raw) {
        return Ok(offer);
    }
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(raw)
        && let Some(sdp) = val.get("sdp").and_then(|v| v.as_str())
    {
        return SdpOffer::from_sdp_string(sdp).map_err(|e| format!("invalid SDP offer: {e}"));
    }
    serde_json::from_str::<SdpOffer>(raw).map_err(|e| format!("invalid SDP offer: {e}"))
}

fn parse_sdp_answer(raw: &str) -> Result<SdpAnswer, String> {
    if let Ok(answer) = SdpAnswer::from_sdp_string(raw) {
        return Ok(answer);
    }
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(raw)
        && let Some(sdp) = val.get("sdp").and_then(|v| v.as_str())
    {
        return SdpAnswer::from_sdp_string(sdp).map_err(|e| format!("invalid SDP answer: {e}"));
    }
    serde_json::from_str::<SdpAnswer>(raw).map_err(|e| format!("invalid SDP answer: {e}"))
}

#[derive(Debug)]
struct TrackIn {
    origin_cid: u64,
    origin_peer_id: String,
    mid: Mid,
    kind: MediaKind,
    screen: bool,
}

#[derive(Debug)]
struct TrackInEntry {
    id: Arc<TrackIn>,
    last_keyframe_request: Option<Instant>,
}

#[derive(Debug)]
struct TrackOut {
    track_in: Weak<TrackIn>,
    state: TrackOutState,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TrackOutState {
    ToOpen,
    Negotiating(Mid),
    Open(Mid),
    ToStop(Mid),
    NegotiatingStop(Mid),
}

impl TrackOut {
    fn mid(&self) -> Option<Mid> {
        match self.state {
            TrackOutState::ToOpen => None,
            TrackOutState::Negotiating(m)
            | TrackOutState::Open(m)
            | TrackOutState::ToStop(m)
            | TrackOutState::NegotiatingStop(m) => Some(m),
        }
    }
}

struct SfuPeer {
    cid: u64,
    peer_id: String,
    room_name: String,
    breakout_id: Option<String>,
    rtc: Rtc,
    pending: Option<SdpPendingOffer>,
    signal_tx: tokio_mpsc::UnboundedSender<ServerMessage>,
    tracks_in: Vec<TrackInEntry>,
    tracks_out: Vec<TrackOut>,
    chosen_rid: Option<Rid>,
}

impl SfuPeer {
    fn new(
        peer_id: String,
        room_name: String,
        breakout_id: Option<String>,
        rtc: Rtc,
        signal_tx: tokio_mpsc::UnboundedSender<ServerMessage>,
    ) -> Self {
        static ID_COUNTER: AtomicU64 = AtomicU64::new(1);
        Self {
            cid: ID_COUNTER.fetch_add(1, Ordering::SeqCst),
            peer_id,
            room_name,
            breakout_id,
            rtc,
            pending: None,
            signal_tx,
            tracks_in: Vec::new(),
            tracks_out: Vec::new(),
            chosen_rid: None,
        }
    }

    fn has_track_out(&self, target: &Arc<TrackIn>) -> bool {
        self.tracks_out
            .iter()
            .any(|t| t.track_in.upgrade().is_some_and(|arc| Arc::ptr_eq(&arc, target)))
    }

    fn handle_track_open(&mut self, track_in: Weak<TrackIn>) {
        if let Some(arc) = track_in.upgrade()
            && self.has_track_out(&arc)
        {
            return;
        }
        self.tracks_out.push(TrackOut {
            track_in,
            state: TrackOutState::ToOpen,
        });
    }

    fn handle_media_added(&mut self, mid: Mid, kind: MediaKind) -> Propagated {
        if let Some(existing) = self.tracks_in.iter().find(|t| t.id.mid == mid) {
            return Propagated::TrackOpen {
                origin_cid: self.cid,
                room_name: self.room_name.clone(),
                breakout_id: self.breakout_id.clone(),
                track_in: Arc::downgrade(&existing.id),
            };
        }
        let video_count = self.tracks_in.iter().filter(|t| t.id.kind == MediaKind::Video).count();
        let entry = TrackInEntry {
            id: Arc::new(TrackIn {
                origin_cid: self.cid,
                origin_peer_id: self.peer_id.clone(),
                mid,
                kind,
                screen: kind == MediaKind::Video && video_count >= 1,
            }),
            last_keyframe_request: None,
        };
        let weak = Arc::downgrade(&entry.id);
        let breakout_id = self.breakout_id.clone();
        let room_name = self.room_name.clone();
        self.tracks_in.push(entry);
        Propagated::TrackOpen {
            origin_cid: self.cid,
            room_name,
            breakout_id,
            track_in: weak,
        }
    }

    fn handle_media_data_in(&mut self, data: MediaData) -> Propagated {
        if !data.contiguous {
            self.request_keyframe_throttled(data.mid, data.rid, KeyframeRequestKind::Fir);
        }
        Propagated::MediaData {
            origin_cid: self.cid,
            room_name: self.room_name.clone(),
            breakout_id: self.breakout_id.clone(),
            data,
        }
    }

    fn request_keyframe_throttled(&mut self, mid: Mid, rid: Option<Rid>, kind: KeyframeRequestKind) {
        let Some(mut writer) = self.rtc.writer(mid) else {
            return;
        };
        let Some(entry) = self.tracks_in.iter_mut().find(|t| t.id.mid == mid) else {
            return;
        };
        if entry
            .last_keyframe_request
            .is_some_and(|t| t.elapsed() < Duration::from_secs(1))
        {
            return;
        }
        let _ = writer.request_keyframe(rid, kind);
        entry.last_keyframe_request = Some(Instant::now());
    }

    fn handle_incoming_keyframe_req(&self, mut req: KeyframeRequest) -> Propagated {
        let Some(track_out) = self.tracks_out.iter().find(|t| t.mid() == Some(req.mid)) else {
            return Propagated::Noop;
        };
        let Some(track_in) = track_out.track_in.upgrade() else {
            return Propagated::Noop;
        };
        req.rid = self.chosen_rid;
        Propagated::KeyframeRequest {
            req,
            origin_cid: track_in.origin_cid,
            mid_in: track_in.mid,
        }
    }

    fn negotiate_if_needed(&mut self, active_scopes: &HashMap<u64, (String, Option<String>)>) -> bool {
        if self.pending.is_some() || !self.rtc.is_alive() {
            return false;
        }

        for track in &mut self.tracks_out {
            if let TrackOutState::Open(m) = track.state {
                let keep = track.track_in.upgrade().is_some_and(|arc| {
                    active_scopes
                        .get(&arc.origin_cid)
                        .is_some_and(|(r, b)| r == &self.room_name && b == &self.breakout_id)
                });
                if !keep {
                    track.state = TrackOutState::ToStop(m);
                }
            }
        }

        let mut change = self.rtc.sdp_api();
        for track in &mut self.tracks_out {
            match track.state {
                TrackOutState::ToOpen => {
                    if let Some(track_in) = track.track_in.upgrade() {
                        let scope_ok = active_scopes
                            .get(&track_in.origin_cid)
                            .is_some_and(|(r, b)| r == &self.room_name && b == &self.breakout_id);
                        if scope_ok {
                            let stream_id = track_in.origin_peer_id.clone();
                            let mid = change.add_media(track_in.kind, Direction::SendOnly, Some(stream_id), None, None);
                            track.state = TrackOutState::Negotiating(mid);
                        }
                    }
                }
                TrackOutState::ToStop(mid) => {
                    change.stop_media(mid);
                    track.state = TrackOutState::NegotiatingStop(mid);
                }
                _ => {}
            }
        }

        if !change.has_changes() {
            return false;
        }

        let Some((offer, pending)) = change.apply() else {
            return false;
        };

        let mut track_map = HashMap::new();
        for track in &self.tracks_out {
            if let Some(mid) = track.mid()
                && !matches!(
                    track.state,
                    TrackOutState::ToStop(_) | TrackOutState::NegotiatingStop(_)
                )
                && let Some(ti) = track.track_in.upgrade()
            {
                let kind = match ti.kind {
                    MediaKind::Audio => MediaTrackKind::Audio,
                    MediaKind::Video => MediaTrackKind::Video,
                };
                track_map.insert(
                    mid.to_string(),
                    TrackMeta {
                        owner_peer_id: ti.origin_peer_id.clone(),
                        kind,
                        screen: ti.screen,
                    },
                );
            }
        }

        self.pending = Some(pending);
        let _ = self.signal_tx.send(ServerMessage::RtcRenegotiateOffer {
            sdp: offer.to_sdp_string(),
            track_map,
        });
        true
    }

    fn handle_media_data_out(&mut self, origin_cid: u64, data: &MediaData) {
        let Some(mid) = self
            .tracks_out
            .iter()
            .find(|o| {
                o.track_in
                    .upgrade()
                    .is_some_and(|i| i.origin_cid == origin_cid && i.mid == data.mid)
            })
            .and_then(|o| o.mid())
        else {
            return;
        };

        if data.rid.is_some() && data.rid != Some("h".into()) {
            return;
        }
        if self.chosen_rid != data.rid {
            self.chosen_rid = data.rid;
        }
        let Some(writer) = self.rtc.writer(mid) else {
            return;
        };
        let Some(pt) = writer.match_params(data.params) else {
            return;
        };
        if let Err(e) = writer.write(pt, data.network_time, data.time, data.data.clone()) {
            debug!(peer_id = %self.peer_id, error = ?e, "SFU write failed; disconnecting peer");
            self.rtc.disconnect();
        }
    }

    fn handle_keyframe_request(&mut self, req: KeyframeRequest, mid_in: Mid) {
        if !self.tracks_in.iter().any(|t| t.id.mid == mid_in) {
            return;
        }
        let Some(mut writer) = self.rtc.writer(mid_in) else {
            return;
        };
        if let Err(e) = writer.request_keyframe(req.rid, req.kind) {
            debug!(peer_id = %self.peer_id, error = ?e, "keyframe request ignored");
        }
    }
}

#[allow(clippy::large_enum_variant)]
enum Propagated {
    Noop,
    TrackOpen {
        origin_cid: u64,
        room_name: String,
        breakout_id: Option<String>,
        track_in: Weak<TrackIn>,
    },
    MediaData {
        origin_cid: u64,
        room_name: String,
        breakout_id: Option<String>,
        data: MediaData,
    },
    KeyframeRequest {
        req: KeyframeRequest,
        origin_cid: u64,
        mid_in: Mid,
    },
}

fn run_sfu_loop(socket: UdpSocket, bound_addr: SocketAddr, candidates: Vec<SocketAddr>, rx: Receiver<SfuCmd>) {
    let mut peers: Vec<SfuPeer> = Vec::new();
    let mut to_propagate: VecDeque<Propagated> = VecDeque::new();
    let mut buf = vec![0u8; 2000];

    loop {
        peers.retain(|p| p.rtc.is_alive());

        loop {
            match rx.try_recv() {
                Ok(SfuCmd::Shutdown) => return,
                Ok(cmd) => handle_cmd(cmd, &candidates, bound_addr, &mut peers),
                Err(TryRecvError::Empty) => break,
                Err(TryRecvError::Disconnected) => return,
            }
        }

        let active_scopes: HashMap<u64, (String, Option<String>)> = peers
            .iter()
            .map(|p| (p.cid, (p.room_name.clone(), p.breakout_id.clone())))
            .collect();

        let mut timeout = Instant::now() + Duration::from_millis(5);
        for peer in &mut peers {
            let t = poll_peer_until_timeout(peer, &active_scopes, &mut to_propagate, &socket);
            timeout = timeout.min(t);
        }

        if let Some(p) = to_propagate.pop_front() {
            propagate(&p, &mut peers);
            continue;
        }

        let wait = (timeout - Instant::now())
            .max(Duration::from_millis(1))
            .min(Duration::from_millis(5));
        let _ = socket.set_read_timeout(Some(wait));

        if let Some(input) = read_socket_input(&socket, &candidates, &mut buf)
            && let Some(peer) = peers.iter_mut().find(|p| p.rtc.accepts(&input))
            && let Err(e) = peer.rtc.handle_input(input)
        {
            warn!(peer_id = %peer.peer_id, error = ?e, "SFU handle_input failed");
            peer.rtc.disconnect();
        }

        let now = Instant::now();
        for peer in &mut peers {
            if peer.rtc.is_alive()
                && let Err(e) = peer.rtc.handle_input(Input::Timeout(now))
            {
                warn!(peer_id = %peer.peer_id, error = ?e, "SFU timeout failed");
                peer.rtc.disconnect();
            }
        }
    }
}

fn handle_cmd(cmd: SfuCmd, candidates: &[SocketAddr], _bound_addr: SocketAddr, peers: &mut Vec<SfuPeer>) {
    match cmd {
        SfuCmd::AcceptOffer {
            room_name,
            breakout_id,
            peer_id,
            offer_sdp,
            signal_tx,
            reply_tx,
        } => {
            let offer = match parse_sdp_offer(&offer_sdp) {
                Ok(o) => o,
                Err(e) => {
                    let _ = reply_tx.send(Err(e));
                    return;
                }
            };

            if let Some(existing) = peers.iter_mut().find(|p| p.peer_id == peer_id) {
                existing.signal_tx = signal_tx.clone();
                match existing.rtc.sdp_api().accept_offer(offer) {
                    Ok(answer) => {
                        existing.pending = None;
                        for track in &mut existing.tracks_out {
                            match track.state {
                                TrackOutState::Negotiating(_) => track.state = TrackOutState::ToOpen,
                                TrackOutState::NegotiatingStop(m) => track.state = TrackOutState::ToStop(m),
                                _ => {}
                            }
                        }
                        let _ = existing.signal_tx.send(ServerMessage::RtcAnswer {
                            sdp: answer.to_sdp_string(),
                        });
                        let _ = reply_tx.send(Ok(()));
                    }
                    Err(e) => {
                        let _ = reply_tx.send(Err(format!("re-offer rejected: {e}")));
                    }
                }
                return;
            }

            let mut rtc = Rtc::builder().build(Instant::now());
            for addr in candidates {
                if let Ok(cand) = Candidate::host(*addr, "udp") {
                    rtc.add_local_candidate(cand);
                }
            }

            let answer = match rtc.sdp_api().accept_offer(offer) {
                Ok(a) => a,
                Err(e) => {
                    let _ = reply_tx.send(Err(format!("initial offer rejected: {e}")));
                    return;
                }
            };

            let _ = signal_tx.send(ServerMessage::RtcAnswer {
                sdp: answer.to_sdp_string(),
            });

            let mut new_peer = SfuPeer::new(peer_id, room_name.clone(), breakout_id.clone(), rtc, signal_tx);
            for other in peers.iter() {
                if other.room_name == room_name && other.breakout_id == breakout_id {
                    for ti in &other.tracks_in {
                        new_peer.handle_track_open(Arc::downgrade(&ti.id));
                    }
                }
            }
            peers.push(new_peer);
            let _ = reply_tx.send(Ok(()));
        }
        SfuCmd::AcceptAnswer {
            peer_id,
            answer_sdp,
            reply_tx,
        } => {
            let answer = match parse_sdp_answer(&answer_sdp) {
                Ok(a) => a,
                Err(e) => {
                    let _ = reply_tx.send(Err(e));
                    return;
                }
            };
            let Some(peer) = peers.iter_mut().find(|p| p.peer_id == peer_id) else {
                let _ = reply_tx.send(Err("peer not in SFU".to_string()));
                return;
            };
            let Some(pending) = peer.pending.take() else {
                let _ = reply_tx.send(Ok(()));
                return;
            };
            match peer.rtc.sdp_api().accept_answer(pending, answer) {
                Ok(()) => {
                    for track in &mut peer.tracks_out {
                        if let TrackOutState::Negotiating(m) = track.state {
                            track.state = TrackOutState::Open(m);
                        }
                    }
                    peer.tracks_out
                        .retain(|t| !matches!(t.state, TrackOutState::NegotiatingStop(_)));
                    // Request fresh keyframes on newly subscribed video tracks.
                    let origin_reqs: Vec<(u64, Mid)> = peer
                        .tracks_out
                        .iter()
                        .filter_map(|t| t.track_in.upgrade())
                        .filter(|ti| ti.kind == MediaKind::Video)
                        .map(|ti| (ti.origin_cid, ti.mid))
                        .collect();
                    for (origin_cid, mid_in) in origin_reqs {
                        if let Some(origin) = peers.iter_mut().find(|p| p.cid == origin_cid) {
                            origin.request_keyframe_throttled(mid_in, None, KeyframeRequestKind::Pli);
                        }
                    }
                    let _ = reply_tx.send(Ok(()));
                }
                Err(e) => {
                    let _ = reply_tx.send(Err(format!("renegotiate answer rejected: {e}")));
                }
            }
        }
        SfuCmd::UpdateBreakout { peer_id, breakout_id } => {
            let mut moved_room = None;
            let mut moved_tracks: Vec<Weak<TrackIn>> = Vec::new();
            let mut moved_cid = None;
            if let Some(peer) = peers.iter_mut().find(|p| p.peer_id == peer_id) {
                peer.breakout_id = breakout_id.clone();
                moved_room = Some(peer.room_name.clone());
                moved_cid = Some(peer.cid);
                moved_tracks = peer.tracks_in.iter().map(|t| Arc::downgrade(&t.id)).collect();
            }
            if let (Some(room_name), Some(cid)) = (moved_room, moved_cid) {
                // Add tracks from peers now sharing (room_name, breakout_id).
                let matching_tracks: Vec<Weak<TrackIn>> = peers
                    .iter()
                    .filter(|p| p.cid != cid && p.room_name == room_name && p.breakout_id == breakout_id)
                    .flat_map(|p| p.tracks_in.iter().map(|t| Arc::downgrade(&t.id)))
                    .collect();

                for p in peers.iter_mut() {
                    if p.cid == cid {
                        for ti in &matching_tracks {
                            p.handle_track_open(ti.clone());
                        }
                    } else if p.room_name == room_name && p.breakout_id == breakout_id {
                        for ti in &moved_tracks {
                            p.handle_track_open(ti.clone());
                        }
                    }
                }
            }
        }
        SfuCmd::RemovePeer { peer_id } => {
            peers.retain(|p| p.peer_id != peer_id);
        }
        SfuCmd::Stats { reply_tx } => {
            let _ = reply_tx.send(SfuStatsSnapshot {
                peer_count: peers.len(),
                udp_addr: _bound_addr.to_string(),
            });
        }
        SfuCmd::Shutdown => {}
    }
}

fn poll_peer_until_timeout(
    peer: &mut SfuPeer,
    active_scopes: &HashMap<u64, (String, Option<String>)>,
    queue: &mut VecDeque<Propagated>,
    socket: &UdpSocket,
) -> Instant {
    loop {
        if !peer.rtc.is_alive() {
            return Instant::now();
        }
        if peer.negotiate_if_needed(active_scopes) {
            continue;
        }
        let propagated = match peer.rtc.poll_output() {
            Ok(Output::Transmit(tx)) => {
                let _ = socket.send_to(&tx.contents, tx.destination);
                Propagated::Noop
            }
            Ok(Output::Timeout(t)) => return t,
            Ok(Output::Event(ev)) => match ev {
                Event::IceConnectionStateChange(IceConnectionState::Disconnected) => {
                    peer.rtc.disconnect();
                    Propagated::Noop
                }
                Event::MediaAdded(e) => peer.handle_media_added(e.mid, e.kind),
                Event::MediaData(data) => peer.handle_media_data_in(data),
                Event::KeyframeRequest(req) => peer.handle_incoming_keyframe_req(req),
                _ => Propagated::Noop,
            },
            Err(e) => {
                warn!(peer_id = %peer.peer_id, error = ?e, "SFU poll_output failed");
                peer.rtc.disconnect();
                return Instant::now();
            }
        };
        if !matches!(propagated, Propagated::Noop) {
            queue.push_back(propagated);
        }
    }
}

fn propagate(propagated: &Propagated, peers: &mut [SfuPeer]) {
    match propagated {
        Propagated::TrackOpen {
            origin_cid,
            room_name,
            breakout_id,
            track_in,
        } => {
            for p in peers.iter_mut() {
                if p.cid != *origin_cid && &p.room_name == room_name && &p.breakout_id == breakout_id {
                    p.handle_track_open(track_in.clone());
                }
            }
        }
        Propagated::MediaData {
            origin_cid,
            room_name,
            breakout_id,
            data,
        } => {
            for p in peers.iter_mut() {
                if p.cid != *origin_cid && &p.room_name == room_name && &p.breakout_id == breakout_id {
                    p.handle_media_data_out(*origin_cid, data);
                }
            }
        }
        Propagated::KeyframeRequest {
            req,
            origin_cid,
            mid_in,
        } => {
            if let Some(origin) = peers.iter_mut().find(|p| p.cid == *origin_cid) {
                origin.handle_keyframe_request(*req, *mid_in);
            }
        }
        Propagated::Noop => {}
    }
}

fn pick_receive_destination(source: SocketAddr, candidates: &[SocketAddr], fallback: SocketAddr) -> SocketAddr {
    if source.ip().is_loopback() {
        candidates
            .iter()
            .copied()
            .find(|c| c.ip().is_loopback())
            .or_else(|| candidates.first().copied())
            .unwrap_or(fallback)
    } else {
        candidates
            .iter()
            .copied()
            .find(|c| !c.ip().is_loopback() && !c.ip().is_unspecified())
            .or_else(|| candidates.first().copied())
            .unwrap_or(fallback)
    }
}

fn read_socket_input<'a>(socket: &UdpSocket, candidates: &[SocketAddr], buf: &'a mut Vec<u8>) -> Option<Input<'a>> {
    buf.resize(2000, 0);
    match socket.recv_from(buf) {
        Ok((n, source)) => {
            buf.truncate(n);
            let Ok(contents) = buf.as_slice().try_into() else {
                return None;
            };
            let local_fallback = socket.local_addr().unwrap_or(source);
            let destination = pick_receive_destination(source, candidates, local_fallback);
            Some(Input::Receive(
                Instant::now(),
                Receive {
                    proto: Protocol::Udp,
                    source,
                    destination,
                    contents,
                },
            ))
        }
        Err(e) => match e.kind() {
            ErrorKind::WouldBlock | ErrorKind::TimedOut => None,
            _ => {
                warn!(error = ?e, "UDP socket read error");
                None
            }
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolves_non_unspecified_loopback_when_bound_any() {
        let addr: SocketAddr = "0.0.0.0:10000".parse().expect("addr");
        let list = resolve_candidate_ips(addr, None);
        assert!(!list.is_empty());
        assert!(list.iter().all(|a| !a.ip().is_unspecified()));
        assert!(list.iter().any(|a| a.ip().is_loopback() && a.port() == 10000));
    }

    #[test]
    fn picks_registered_destination_for_loopback_and_lan_sources() {
        let candidates: Vec<SocketAddr> = vec![
            "127.0.0.1:10000".parse().unwrap(),
            "192.168.1.50:10000".parse().unwrap(),
        ];
        let fallback: SocketAddr = "0.0.0.0:10000".parse().unwrap();

        let local_src: SocketAddr = "127.0.0.1:54321".parse().unwrap();
        assert_eq!(
            pick_receive_destination(local_src, &candidates, fallback),
            "127.0.0.1:10000".parse::<SocketAddr>().unwrap()
        );

        let lan_src: SocketAddr = "192.168.1.99:55555".parse().unwrap();
        assert_eq!(
            pick_receive_destination(lan_src, &candidates, fallback),
            "192.168.1.50:10000".parse::<SocketAddr>().unwrap()
        );
    }

    #[test]
    fn spawns_sfu_and_rejects_bad_sdp() {
        let sfu = SfuHandle::spawn("127.0.0.1:0", None).expect("spawn sfu");
        let rt = tokio::runtime::Runtime::new().expect("rt");
        rt.block_on(async {
            let (tx, _rx) = tokio_mpsc::unbounded_channel();
            let err = sfu
                .accept_offer("test-room".into(), None, "p-1".into(), "not-sdp".into(), tx)
                .await;
            assert!(err.is_err());
            let stats = sfu.stats().await;
            assert_eq!(stats.peer_count, 0);
        });
        sfu.shutdown();
    }
}
