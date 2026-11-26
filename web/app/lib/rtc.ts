export interface IceServerConfig {
  urls: string[];
}

export interface TrackMeta {
  owner_peer_id: string;
  kind: "audio" | "video";
  screen?: boolean;
}

export interface Participant {
  id: string;
  display_name: string;
  email?: string | null;
  avatar_url?: string | null;
  is_moderator: boolean;
  audio_muted: boolean;
  video_muted: boolean;
  screen_sharing: boolean;
  hand_raised: boolean;
  audio_level: number;
  breakout_id?: string | null;
  joined_at: number;
  speaking_ms: number;
}

export interface LobbyEntry {
  peer_id: string;
  display_name: string;
  requested_at: number;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  recipient_id?: string | null;
  body: string;
  created_at: number;
}

export interface PollOption {
  text: string;
  voters: string[];
}

export interface Poll {
  id: string;
  creator_id: string;
  creator_name: string;
  question: string;
  options: PollOption[];
  created_at: number;
}

export interface BreakoutRoom {
  id: string;
  name: string;
}

export interface WhiteboardPoint {
  x: number;
  y: number;
}

export interface WhiteboardStroke {
  id: string;
  author_id: string;
  color: string;
  width: number;
  points: WhiteboardPoint[];
}

export interface RoomSecurityState {
  locked: boolean;
  lobby_enabled: boolean;
  e2ee_enabled: boolean;
  has_password: boolean;
  subject: string;
}

export interface FloatingReaction {
  id: string;
  peer_id: string;
  display_name: string;
  emoji: string;
}

export interface NovaRtcCallbacks {
  onStateChange: () => void;
  onReaction: (reaction: FloatingReaction) => void;
  onModerated: (action: string, byName: string) => void;
  onConferenceLeft: () => void;
}

export class NovaRtcSession {
  ws: WebSocket | null = null;
  pc: RTCPeerConnection | null = null;
  selfId: string | null = null;
  room: string;
  isModerator = false;
  inLobby = false;
  lobbyMessage: string | null = null;
  rejectedReason: string | null = null;
  lastError: string | null = null;
  iceState: RTCIceConnectionState = "new";

  participants: Participant[] = [];
  lobby: LobbyEntry[] = [];
  messages: ChatMessage[] = [];
  polls: Poll[] = [];
  breakouts: BreakoutRoom[] = [];
  strokes: WhiteboardStroke[] = [];
  security: RoomSecurityState;

  localStream: MediaStream | null = null;
  screenStream: MediaStream | null = null;
  remoteStreams = new Map<string, MediaStream>();
  remoteScreenStreams = new Map<string, MediaStream>();
  trackMap: Record<string, TrackMeta> = {};

  private callbacks: NovaRtcCallbacks;
  private iceServers: IceServerConfig[] = [];
  private negotiationQueue: Promise<void> = Promise.resolve();
  private audioCtx: AudioContext | null = null;
  private levelTimer: number | null = null;
  private e2eeKey: CryptoKey | null = null;
  private audioSender: RTCRtpSender | null = null;
  private videoSender: RTCRtpSender | null = null;
  private screenSender: RTCRtpSender | null = null;
  private screenTrack: MediaStreamTrack | null = null;
  private audioMuted = false;
  private videoMuted = false;
  private screenSharing = false;
  private closed = false;

  constructor(room: string, callbacks: NovaRtcCallbacks) {
    this.room = room;
    this.callbacks = callbacks;
    this.security = {
      locked: false,
      lobby_enabled: false,
      e2ee_enabled: false,
      has_password: false,
      subject: room,
    };
  }

  setE2eeKey(key: CryptoKey | null) {
    this.e2eeKey = key;
  }

  getActiveSpeakerId(): string | null {
    let best: Participant | null = null;
    for (const p of this.participants) {
      if (!p.audio_muted && p.audio_level > 0.05) {
        if (!best || p.audio_level > best.audio_level) best = p;
      }
    }
    return best?.id ?? null;
  }

  connect(opts: {
    displayName: string;
    password?: string;
    token?: string;
    audioMuted: boolean;
    videoMuted: boolean;
    localStream: MediaStream | null;
  }) {
    this.audioMuted = opts.audioMuted;
    this.videoMuted = opts.videoMuted;
    this.localStream = opts.localStream;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/ws/${encodeURIComponent(this.room)}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.send({
        type: "join",
        display_name: opts.displayName,
        password: opts.password || null,
        token: opts.token || null,
        audio_muted: opts.audioMuted,
        video_muted: opts.videoMuted,
      });
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as Record<string, unknown>;
        this.handleServerMessage(msg);
      } catch {
        // ignore malformed message
      }
    };

    ws.onerror = () => {
      if (!this.closed) {
        this.lastError = "WebSocket connection error";
        this.callbacks.onStateChange();
      }
    };

    ws.onclose = () => {
      if (!this.closed && !this.rejectedReason) {
        this.lastError = this.lastError || "Disconnected from server";
        this.callbacks.onStateChange();
      }
    };
  }

  send(payload: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private handleServerMessage(msg: Record<string, unknown>) {
    switch (msg.type) {
      case "joined": {
        this.selfId = msg.self_id as string;
        this.isModerator = Boolean(msg.is_moderator);
        this.inLobby = false;
        this.lobbyMessage = null;
        this.lastError = null;
        this.iceServers = (msg.ice_servers as IceServerConfig[]) || [];
        this.participants = (msg.participants as Participant[]) || [];
        this.messages = (msg.messages as ChatMessage[]) || [];
        this.polls = (msg.polls as Poll[]) || [];
        this.breakouts = (msg.breakouts as BreakoutRoom[]) || [];
        this.strokes = (msg.strokes as WhiteboardStroke[]) || [];
        this.lobby = (msg.lobby as LobbyEntry[]) || [];
        this.security = msg.security as RoomSecurityState;
        this.callbacks.onStateChange();
        this.initPeerConnection().catch((err) => {
          this.lastError = err instanceof Error ? err.message : "Failed to initialize WebRTC";
          this.callbacks.onStateChange();
        });
        break;
      }
      case "lobby_waiting":
        this.inLobby = true;
        this.lobbyMessage = (msg.message as string) || "Waiting in lobby…";
        this.callbacks.onStateChange();
        break;
      case "lobby_request": {
        const entry = msg.entry as LobbyEntry;
        if (!this.lobby.some((e) => e.peer_id === entry.peer_id)) {
          this.lobby = [...this.lobby, entry];
          this.callbacks.onStateChange();
        }
        break;
      }
      case "lobby_resolved": {
        const peerId = msg.peer_id as string;
        this.lobby = this.lobby.filter((e) => e.peer_id !== peerId);
        this.callbacks.onStateChange();
        break;
      }
      case "lobby_rejected":
        this.inLobby = false;
        this.rejectedReason = (msg.reason as string) || "Entry declined";
        this.callbacks.onStateChange();
        break;
      case "rtc_answer": {
        const sdp = msg.sdp as string;
        this.enqueueNegotiation(async () => {
          if (!this.pc) return;
          await this.pc.setRemoteDescription({ type: "answer", sdp });
        });
        break;
      }
      case "rtc_renegotiate_offer": {
        const sdp = msg.sdp as string;
        const map = (msg.track_map as Record<string, TrackMeta>) || {};
        this.trackMap = { ...this.trackMap, ...map };
        this.enqueueNegotiation(async () => {
          if (!this.pc) return;
          await this.pc.setRemoteDescription({ type: "offer", sdp });
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          if (this.pc.localDescription?.sdp) {
            this.send({ type: "rtc_renegotiate_answer", sdp: this.pc.localDescription.sdp });
          }
        });
        break;
      }
      case "participant_joined": {
        const p = msg.participant as Participant;
        this.participants = [...this.participants.filter((x) => x.id !== p.id), p];
        this.callbacks.onStateChange();
        break;
      }
      case "participant_updated": {
        const p = msg.participant as Participant;
        if (p.id === this.selfId) this.isModerator = p.is_moderator;
        const idx = this.participants.findIndex((x) => x.id === p.id);
        if (idx >= 0) {
          const next = this.participants.slice();
          next[idx] = p;
          this.participants = next;
        } else {
          this.participants = [...this.participants, p];
        }
        this.callbacks.onStateChange();
        break;
      }
      case "participant_left": {
        const peerId = msg.peer_id as string;
        this.participants = this.participants.filter((p) => p.id !== peerId);
        this.remoteStreams.delete(peerId);
        this.remoteScreenStreams.delete(peerId);
        this.callbacks.onStateChange();
        break;
      }
      case "chat_message": {
        const m = msg.message as ChatMessage;
        if (!this.messages.some((x) => x.id === m.id)) {
          this.messages = [...this.messages, m];
          this.callbacks.onStateChange();
        }
        break;
      }
      case "reaction": {
        this.callbacks.onReaction({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          peer_id: msg.peer_id as string,
          display_name: msg.display_name as string,
          emoji: msg.emoji as string,
        });
        break;
      }
      case "poll_updated": {
        const poll = msg.poll as Poll;
        const idx = this.polls.findIndex((p) => p.id === poll.id);
        if (idx >= 0) {
          const next = this.polls.slice();
          next[idx] = poll;
          this.polls = next;
        } else {
          this.polls = [...this.polls, poll];
        }
        this.callbacks.onStateChange();
        break;
      }
      case "whiteboard_stroke": {
        const stroke = msg.stroke as WhiteboardStroke;
        this.strokes = [...this.strokes, stroke];
        this.callbacks.onStateChange();
        break;
      }
      case "whiteboard_cleared":
        this.strokes = [];
        this.callbacks.onStateChange();
        break;
      case "breakout_updated":
        this.breakouts = (msg.breakouts as BreakoutRoom[]) || [];
        this.callbacks.onStateChange();
        break;
      case "room_security_updated":
        this.security = msg.security as RoomSecurityState;
        this.callbacks.onStateChange();
        break;
      case "moderated": {
        const action = msg.action as string;
        const byName = msg.by_name as string;
        if (action === "mute_audio") this.setAudioMuted(true);
        if (action === "mute_video") this.setVideoMuted(true);
        if (action === "kick") {
          this.close();
          this.callbacks.onConferenceLeft();
          return;
        }
        this.callbacks.onModerated(action, byName);
        break;
      }
      case "error":
        this.lastError = (msg.message as string) || "Signaling error";
        this.callbacks.onStateChange();
        break;
      default:
        break;
    }
  }

  private enqueueNegotiation(task: () => Promise<void>) {
    this.negotiationQueue = this.negotiationQueue
      .then(task)
      .catch((err) => {
        this.lastError = err instanceof Error ? err.message : "WebRTC negotiation failed";
        this.callbacks.onStateChange();
      });
  }

  private async initPeerConnection() {
    if (this.pc) return;
    const pc = new RTCPeerConnection({
      iceServers: this.iceServers.length > 0 ? this.iceServers : [{ urls: ["stun:stun.l.google.com:19302"] }],
      ...(this.e2eeKey ? ({ encodedInsertableStreams: true } as RTCConfiguration) : {}),
    });
    this.pc = pc;

    pc.oniceconnectionstatechange = () => {
      this.iceState = pc.iceConnectionState;
      this.callbacks.onStateChange();
    };

    pc.ontrack = (ev) => {
      const mid = ev.transceiver?.mid || "";
      const meta = this.trackMap[mid];
      const streamId = ev.streams[0]?.id;
      const ownerId = meta?.owner_peer_id || (streamId && streamId !== "default" ? streamId : "");
      if (!ownerId || ownerId === this.selfId) return;

      const isScreen = Boolean(meta?.screen);
      const map = isScreen ? this.remoteScreenStreams : this.remoteStreams;
      let target = map.get(ownerId);
      if (!target) {
        target = new MediaStream();
        map.set(ownerId, target);
      }
      if (!target.getTracks().some((t) => t.id === ev.track.id)) {
        target.addTrack(ev.track);
      }
      ev.track.onended = () => {
        target?.removeTrack(ev.track);
        if (target && target.getTracks().length === 0) {
          map.delete(ownerId);
        }
        this.callbacks.onStateChange();
      };
      this.callbacks.onStateChange();
    };

    const audioTrack = this.localStream?.getAudioTracks()[0];
    const videoTrack = this.localStream?.getVideoTracks()[0];

    if (audioTrack) {
      audioTrack.enabled = !this.audioMuted;
      this.audioSender = pc.addTrack(audioTrack, this.localStream!);
    } else {
      pc.addTransceiver("audio", { direction: "recvonly" });
    }

    if (videoTrack) {
      videoTrack.enabled = !this.videoMuted;
      this.videoSender = pc.addTrack(videoTrack, this.localStream!);
    } else {
      pc.addTransceiver("video", { direction: "recvonly" });
    }

    await this.sendLocalOffer();
    this.startAudioLevelMonitor();
  }

  private async sendLocalOffer() {
    this.enqueueNegotiation(async () => {
      if (!this.pc) return;
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      // Wait briefly for host ICE candidates so SDP includes reachable candidates without trickle.
      await waitIceGathering(this.pc, 400);
      const sdp = this.pc.localDescription?.sdp || offer.sdp;
      if (sdp) {
        this.send({ type: "rtc_offer", sdp });
      }
    });
  }

  async replaceVideoTrack(nextTrack: MediaStreamTrack | null) {
    if (this.videoSender && nextTrack) {
      await this.videoSender.replaceTrack(nextTrack);
      this.callbacks.onStateChange();
    }
  }

  setAudioMuted(muted: boolean) {
    this.audioMuted = muted;
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    this.send({
      type: "media_state",
      audio_muted: muted,
      video_muted: this.videoMuted,
      screen_sharing: this.screenSharing,
      audio_level: 0,
    });
    this.callbacks.onStateChange();
  }

  setVideoMuted(muted: boolean) {
    this.videoMuted = muted;
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = !muted;
    });
    this.send({
      type: "media_state",
      audio_muted: this.audioMuted,
      video_muted: muted,
      screen_sharing: this.screenSharing,
      audio_level: 0,
    });
    this.callbacks.onStateChange();
  }

  async toggleScreenShare(): Promise<boolean> {
    if (this.screenSharing) {
      this.stopScreenShare();
      return false;
    }
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    const track = stream.getVideoTracks()[0];
    if (!track) return false;
    this.screenStream = stream;
    this.screenTrack = track;
    this.screenSharing = true;
    track.onended = () => this.stopScreenShare();

    if (this.pc) {
      if (this.screenSender) {
        await this.screenSender.replaceTrack(track);
      } else {
        this.screenSender = this.pc.addTrack(track, stream);
        await this.sendLocalOffer();
      }
    }
    this.send({
      type: "media_state",
      audio_muted: this.audioMuted,
      video_muted: this.videoMuted,
      screen_sharing: true,
      audio_level: 0,
    });
    this.callbacks.onStateChange();
    return true;
  }

  stopScreenShare() {
    if (!this.screenSharing) return;
    this.screenTrack?.stop();
    this.screenStream = null;
    this.screenTrack = null;
    this.screenSharing = false;
    if (this.screenSender) {
      this.screenSender.replaceTrack(null).catch(() => undefined);
    }
    this.send({
      type: "media_state",
      audio_muted: this.audioMuted,
      video_muted: this.videoMuted,
      screen_sharing: false,
      audio_level: 0,
    });
    this.callbacks.onStateChange();
  }

  private startAudioLevelMonitor() {
    if (this.levelTimer !== null || !this.localStream?.getAudioTracks().length) return;
    try {
      const ctx = new AudioContext();
      this.audioCtx = ctx;
      const source = ctx.createMediaStreamSource(this.localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const bins = new Uint8Array(analyser.frequencyBinCount);
      let lastLevel = 0;

      this.levelTimer = window.setInterval(() => {
        if (this.audioMuted) {
          if (lastLevel > 0) {
            lastLevel = 0;
            this.send({
              type: "media_state",
              audio_muted: true,
              video_muted: this.videoMuted,
              screen_sharing: this.screenSharing,
              audio_level: 0,
            });
          }
          return;
        }
        analyser.getByteFrequencyData(bins);
        let sum = 0;
        for (let i = 0; i < bins.length; i++) sum += bins[i];
        const norm = Math.min(1, sum / (bins.length * 128));
        if (Math.abs(norm - lastLevel) > 0.08 || (norm > 0.12 && lastLevel > 0.12)) {
          lastLevel = norm;
          this.send({
            type: "media_state",
            audio_muted: false,
            video_muted: this.videoMuted,
            screen_sharing: this.screenSharing,
            audio_level: Number(norm.toFixed(2)),
          });
        }
      }, 450);
    } catch {
      // AudioContext unavailable in restricted headless contexts
    }
  }

  close() {
    this.closed = true;
    if (this.levelTimer !== null) {
      clearInterval(this.levelTimer);
      this.levelTimer = null;
    }
    this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.screenTrack?.stop();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.pc?.close();
    this.pc = null;
    this.ws?.close();
    this.ws = null;
  }
}

function waitIceGathering(pc: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((resolve) => {
    const timer = window.setTimeout(done, timeoutMs);
    function done() {
      clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onState);
      resolve();
    }
    function onState() {
      if (pc.iceGatheringState === "complete") done();
    }
    pc.addEventListener("icegatheringstatechange", onState);
  });
}
