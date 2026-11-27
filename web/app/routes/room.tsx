import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Clock, Hand, Star } from "lucide-react";
import { ChatDrawer, type ChatTab } from "~/components/ChatDrawer";
import { ConferenceHeader } from "~/components/ConferenceHeader";
import { ControlDock } from "~/components/ControlDock";
import { InviteModal } from "~/components/InviteModal";
import { ParticipantsDrawer } from "~/components/ParticipantsDrawer";
import { PrejoinView } from "~/components/PrejoinView";
import { SecurityModal } from "~/components/SecurityModal";
import { SettingsModal, type SettingsTab } from "~/components/SettingsModal";
import { SharedVideoModal } from "~/components/SharedVideoModal";
import { SpeakerStatsModal } from "~/components/SpeakerStatsModal";
import { ToastStack, type ToastItem } from "~/components/ToastStack";
import { VideoStage } from "~/components/VideoStage";
import { WhiteboardModal } from "~/components/WhiteboardModal";
import { api } from "~/lib/api";
import { createVirtualBackgroundTrack, type BlurPipeline, type VirtualBgMode } from "~/lib/blur";
import { deriveRoomAesKey } from "~/lib/e2ee";
import { emitExternalEvent, subscribeExternalCommands } from "~/lib/external-bridge";
import { useLang } from "~/lib/i18n";
import {
  type ConnectionStats,
  type FloatingReaction,
  NovaRtcSession,
  type VideoQualityMode,
} from "~/lib/rtc";

function playChime(freq: number, ms = 110) {
  try {
    const AudioCtx = window.AudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    window.setTimeout(() => {
      osc.stop();
      ctx.close().catch(() => undefined);
    }, ms);
  } catch {
    // ignore audio chime errors in autoplay-restricted headless browsers
  }
}

export default function RoomRoute({ embedMode = false }: { embedMode?: boolean }) {
  const { roomName = "nova-room" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { lang, setLang } = useLang();

  const [phase, setPhase] = useState<"prejoin" | "active" | "left">("prejoin");
  const [tick, setTick] = useState(0);
  const [tileView, setTileView] = useState(true);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTab, setChatTab] = useState<ChatTab>("chat");
  const [dmTarget, setDmTarget] = useState("");
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(0);

  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [sharedVideoOpen, setSharedVideoOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null);

  const [bgMode, setBgMode] = useState<VirtualBgMode>("none");
  const [recording, setRecording] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [mirrorSelf, setMirrorSelf] = useState(true);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [talkWhileMutedEnabled, setTalkWhileMutedEnabled] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(false);
  const [videoQuality, setVideoQuality] = useState<VideoQualityMode>("hd");

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [stats, setStats] = useState<ConnectionStats>({
    rttMs: null,
    packetLossPct: null,
    bitrateKbps: null,
    resolution: null,
    iceState: "new",
    quality: "good",
  });
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [hasPasswordHint, setHasPasswordHint] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [endedBy, setEndedBy] = useState<string | null>(null);

  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  const sessionRef = useRef<NovaRtcSession | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const blurRef = useRef<BlurPipeline | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const speechRef = useRef<{ stop: () => void } | null>(null);
  const prevMsgCountRef = useRef(0);
  const chatOpenRef = useRef(false);
  const soundRef = useRef(false);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
  }, [chatOpen]);
  useEffect(() => {
    soundRef.current = soundNotifications;
  }, [soundNotifications]);

  const initialName = searchParams.get("name") || "";
  const jwtToken = searchParams.get("jwt") || undefined;
  const joinAsVisitor = searchParams.get("visitor") === "true" || searchParams.get("visitor") === "1";

  const pushToast = useCallback((toast: Omit<ToastItem, "id">, ttlMs = 4500) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    if (ttlMs > 0) {
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, ttlMs);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .getRoom(roomName)
      .then((res) => {
        if (mounted) setHasPasswordHint(res.room.has_password);
      })
      .catch(() => undefined);
    navigator.mediaDevices?.enumerateDevices?.().then((list) => {
      if (mounted) setDevices(list);
    }).catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [roomName]);

  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const stopCaptions = useCallback(() => {
    speechRef.current?.stop();
    speechRef.current = null;
    setCaptionsOn(false);
  }, []);

  const handleLeave = useCallback(() => {
    stopCaptions();
    blurRef.current?.stop();
    blurRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    sessionRef.current?.close();
    emitExternalEvent(roomName, "videoConferenceLeft", { roomName });
    emitExternalEvent(roomName, "readyToClose", {});
    setPhase("left");
  }, [roomName, stopCaptions]);

  const applyVirtualBg = useCallback(async (mode: VirtualBgMode) => {
    const session = sessionRef.current;
    setBgMode(mode);
    if (!session) return;
    if (mode !== "none" && rawStreamRef.current) {
      const pipe = createVirtualBackgroundTrack(rawStreamRef.current, mode);
      if (pipe) {
        blurRef.current?.stop();
        blurRef.current = pipe;
        await session.replaceVideoTrack(pipe.track);
        return;
      }
    }
    blurRef.current?.stop();
    blurRef.current = null;
    const origTrack = rawStreamRef.current?.getVideoTracks()[0] ?? null;
    await session.replaceVideoTrack(origTrack);
  }, []);

  const startConference = useCallback(
    (opts: {
      displayName: string;
      password: string;
      audioMuted: boolean;
      videoMuted: boolean;
      bgMode: VirtualBgMode;
      audioOnly: boolean;
      stream: MediaStream | null;
    }) => {
      rawStreamRef.current = opts.stream;
      let activeStream = opts.stream;
      if (opts.bgMode !== "none" && opts.stream) {
        const pipe = createVirtualBackgroundTrack(opts.stream, opts.bgMode);
        if (pipe) {
          blurRef.current = pipe;
          activeStream = new MediaStream([...opts.stream.getAudioTracks(), pipe.track]);
        }
      }
      setBgMode(opts.bgMode);
      setVideoQuality(opts.audioOnly ? "audio_only" : "hd");
      setJoinError(null);
      setEndedBy(null);
      setElapsedSeconds(0);

      try {
        const raw = localStorage.getItem("nova.recentRooms");
        const prev = raw ? (JSON.parse(raw) as Array<{ name: string; visitedAt: number }>) : [];
        const next = [{ name: roomName, visitedAt: Date.now() }, ...prev.filter((r) => r.name !== roomName)].slice(0, 12);
        localStorage.setItem("nova.recentRooms", JSON.stringify(next));
      } catch {
        // ignore storage errors
      }

      const session = new NovaRtcSession(roomName, {
        onStateChange: () => {
          forceUpdate();
          const msgLen = session.messages.length;
          if (msgLen > prevMsgCountRef.current && !chatOpenRef.current) {
            setUnreadChat((u) => u + (msgLen - prevMsgCountRef.current));
            if (soundRef.current) playChime(587, 90);
          }
          prevMsgCountRef.current = msgLen;
          if (session.followMe?.enabled && session.followMe.leader_id !== session.selfId) {
            setTileView(session.followMe.tile_view);
            setPinnedId(session.followMe.pinned_peer_id ?? null);
          }
          emitExternalEvent(roomName, "participantsSnapshot", {
            participants: session.participants.map((p) => ({
              participantId: p.id,
              displayName: p.display_name,
            })),
          });
        },
        onReaction: (reaction) => {
          setReactions((prev) => [...prev.slice(-8), reaction]);
          window.setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== reaction.id));
          }, 2500);
        },
        onModerated: (action, byName) => {
          pushToast({
            title: `${action.replace("_", " ")} applied by ${byName}`,
            tone: "warning",
          });
        },
        onLobbyRequest: (entry) => {
          if (soundRef.current) playChime(660, 130);
          pushToast(
            {
              title: `${entry.display_name} wants to join`,
              description: "Waiting in the lobby",
              actionLabel: "Admit",
              onAction: () => session.send({ type: "lobby_decision", peer_id: entry.peer_id, admit: true }),
            },
            12000,
          );
        },
        onParticipantJoined: (p) => {
          if (soundRef.current) playChime(523, 80);
          pushToast({ title: `${p.display_name} joined the meeting` }, 3000);
        },
        onParticipantLeft: (departed) => {
          if (departed && soundRef.current) playChime(392, 80);
        },
        onTalkWhileMuted: () => {
          pushToast(
            {
              title: "Are you talking? Your microphone is muted.",
              tone: "warning",
              actionLabel: "Unmute",
              onAction: () => session.setAudioMuted(false),
            },
            6000,
          );
        },
        onConferenceEnded: (byName) => {
          setEndedBy(byName);
        },
        onConferenceLeft: handleLeave,
      });
      sessionRef.current = session;
      session.setTalkWhileMutedEnabled(talkWhileMutedEnabled);
      session.connect({
        displayName: opts.displayName,
        password: opts.password,
        token: jwtToken,
        audioMuted: opts.audioMuted,
        videoMuted: opts.videoMuted,
        localStream: activeStream,
        visitor: joinAsVisitor,
      });
      setPhase("active");
      emitExternalEvent(roomName, "videoConferenceJoined", {
        roomName,
        displayName: opts.displayName,
      });
    },
    [forceUpdate, handleLeave, joinAsVisitor, jwtToken, pushToast, roomName, talkWhileMutedEnabled],
  );

  // Auto-join in embed mode
  useEffect(() => {
    if (!embedMode || phase !== "prejoin" || sessionRef.current) return;
    startConference({
      displayName: initialName || "Embedded Guest",
      password: "",
      audioMuted: true,
      videoMuted: true,
      bgMode: "none",
      audioOnly: false,
      stream: null,
    });
  }, [embedMode, initialName, phase, startConference]);

  useEffect(() => {
    if (phase !== "active") return;
    const t = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    const s = window.setInterval(() => {
      sessionRef.current?.collectConnectionStats().then(setStats).catch(() => undefined);
    }, 2500);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, [phase]);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    const onEnterPip = () => sessionRef.current?.setPipMode(true);
    const onLeavePip = () => sessionRef.current?.setPipMode(false);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("enterpictureinpicture", onEnterPip, true);
    document.addEventListener("leavepictureinpicture", onLeavePip, true);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("enterpictureinpicture", onEnterPip, true);
      document.removeEventListener("leavepictureinpicture", onLeavePip, true);
    };
  }, []);

  useEffect(() => {
    return () => {
      speechRef.current?.stop();
      blurRef.current?.stop();
      sessionRef.current?.close();
    };
  }, []);

  const session = sessionRef.current;
  const self = session?.participants.find((p) => p.id === session.selfId);
  const audioMuted = self?.audio_muted ?? false;
  const videoMuted = self?.video_muted ?? false;
  const screenSharing = self?.screen_sharing ?? false;
  const handRaised = self?.hand_raised ?? false;

  const toggleAudio = useCallback(() => {
    if (!session) return;
    const next = !audioMuted;
    session.setAudioMuted(next);
    emitExternalEvent(roomName, "audioMuteStatusChanged", { muted: next });
  }, [audioMuted, roomName, session]);

  const toggleVideo = useCallback(() => {
    if (!session) return;
    const next = !videoMuted;
    session.setVideoMuted(next);
    emitExternalEvent(roomName, "videoMuteStatusChanged", { muted: next });
  }, [roomName, session, videoMuted]);

  const toggleTileView = useCallback(() => {
    setTileView((prev) => {
      const next = !prev;
      if (session?.isModerator && session.followMe?.enabled) {
        session.send({ type: "follow_me", enabled: true, pinned_peer_id: pinnedId, tile_view: next });
      }
      return next;
    });
  }, [pinnedId, session]);

  const togglePin = useCallback(
    (id: string) => {
      setPinnedId((prev) => {
        const next = prev === id ? null : id;
        if (session?.isModerator && session.followMe?.enabled) {
          session.send({ type: "follow_me", enabled: true, pinned_peer_id: next, tile_view: tileView });
        }
        return next;
      });
    },
    [session, tileView],
  );

  const toggleCaptions = useCallback(() => {
    if (captionsOn) {
      stopCaptions();
      return;
    }
    setCaptionsOn(true);
    type SpeechCtor = new () => {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((e: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      pushToast({
        title: "Closed captions view enabled",
        description: "Browser speech recognition is unavailable here; incoming captions still display.",
      });
      return;
    }
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang === "id" ? "id-ID" : "en-US";
    rec.onresult = (ev) => {
      const last = ev.results[ev.results.length - 1];
      const text = last?.[0]?.transcript?.trim();
      if (text) {
        sessionRef.current?.send({ type: "subtitle", text, is_final: Boolean(last.isFinal) });
      }
    };
    rec.onerror = () => undefined;
    try {
      rec.start();
      speechRef.current = rec;
    } catch {
      // ignore if user-gesture blocked
    }
  }, [captionsOn, lang, pushToast, stopCaptions]);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    }
  }, []);

  const togglePip = useCallback(() => {
    const videos = Array.from(document.querySelectorAll("video"));
    const candidate = videos.find((v) => !v.muted && v.readyState >= 2) || videos.find((v) => v.readyState >= 2);
    if (!candidate || typeof candidate.requestPictureInPicture !== "function") {
      pushToast({ title: "No active video element available for Picture-in-Picture" });
      return;
    }
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => undefined);
    } else {
      candidate.requestPictureInPicture().catch(() => undefined);
    }
  }, [pushToast]);

  const toggleRecord = useCallback(() => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    const stream = session?.localStream || session?.remoteStreams.values().next().value;
    if (!stream || typeof MediaRecorder === "undefined") {
      pushToast({ title: "No local or remote stream available to record", tone: "warning" });
      return;
    }
    const chunks: BlobPart[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (ev) => {
      if (ev.data.size > 0) chunks.push(ev.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nova-${roomName}-${Date.now()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    };
    mr.start(1000);
    recorderRef.current = mr;
    setRecording(true);
  }, [pushToast, recording, roomName, session]);

  const toggleChatDrawer = useCallback((subtab?: ChatTab) => {
    setUnreadChat(0);
    if (subtab && chatOpen && chatTab !== subtab) {
      setChatTab(subtab);
      return;
    }
    if (subtab) setChatTab(subtab);
    setChatOpen((o) => !o);
  }, [chatOpen, chatTab]);

  useEffect(() => {
    if (phase !== "active") return;
    return subscribeExternalCommands({
      onToggleAudio: toggleAudio,
      onToggleVideo: toggleVideo,
      onToggleShareScreen: () => {
        session?.toggleScreenShare().catch(() => undefined);
      },
      onToggleChat: () => toggleChatDrawer("chat"),
      onToggleParticipantsPane: () => setParticipantsOpen((p) => !p),
      onToggleTileView: toggleTileView,
      onToggleRaiseHand: () => session?.send({ type: "raise_hand", raised: !handRaised }),
      onToggleWhiteboard: () => setWhiteboardOpen((w) => !w),
      onToggleSubtitles: toggleCaptions,
      onToggleVirtualBackground: () => setSettingsTab("vb"),
      onStartShareVideo: (url) => session?.send({ type: "shared_video", url, playing: true, time_secs: 0 }),
      onStopShareVideo: () => session?.send({ type: "shared_video", url: "", playing: false, time_secs: 0 }),
      onSetVideoQuality: (val) => {
        const q: VideoQualityMode =
          val === "audio_only" ? "audio_only" : Number(val) <= 180 ? "low" : Number(val) <= 360 ? "sd" : "hd";
        setVideoQuality(q);
        session?.setVideoQuality(q).catch(() => undefined);
      },
      onEndConference: () => session?.send({ type: "end_conference" }),
      onHangup: handleLeave,
      onSendChat: (body) => session?.send({ type: "chat_send", body, recipient_id: null }),
      onDisplayName: (display_name) => session?.send({ type: "set_display_name", display_name }),
      onSubject: (subject) => session?.send({ type: "room_security", subject }),
      onPassword: (password) => session?.send({ type: "room_security", password, locked: true }),
      onMuteEveryone: () => session?.send({ type: "mute_everyone", include_video: false }),
    });
  }, [
    handleLeave,
    handRaised,
    phase,
    session,
    toggleAudio,
    toggleCaptions,
    toggleChatDrawer,
    toggleTileView,
    toggleVideo,
  ]);

  useEffect(() => {
    if (phase !== "active") return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      switch (e.key.toLowerCase()) {
        case "m":
          toggleAudio();
          break;
        case "v":
          toggleVideo();
          break;
        case "c":
          toggleChatDrawer();
          break;
        case "p":
          setParticipantsOpen((p) => !p);
          break;
        case "r":
          session?.send({ type: "raise_hand", raised: !handRaised });
          break;
        case "t":
          toggleTileView();
          break;
        case "w":
          setWhiteboardOpen((w) => !w);
          break;
        case "s":
          session?.toggleScreenShare().catch(() => undefined);
          break;
        case "f":
          toggleFullscreen();
          break;
        case "?":
          setSettingsTab("shortcuts");
          break;
        case " ":
          if (audioMuted) {
            e.preventDefault();
            session?.setAudioMuted(false);
          }
          break;
        default:
          break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " && session) {
        session.setAudioMuted(true);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [audioMuted, handRaised, phase, session, toggleAudio, toggleChatDrawer, toggleFullscreen, toggleTileView, toggleVideo]);

  if (phase === "left") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#040404] px-4 text-center text-white">
        <div className="w-full max-w-md rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-7 shadow-2xl space-y-5">
          <img src="/brand-assets/icon.svg" alt="Nova" className="mx-auto h-11 w-11" />
          <div>
            <h1 className="text-xl font-semibold">
              {endedBy ? `Meeting ended by ${endedBy}` : `You left ${roomName}`}
            </h1>
            <p className="mt-1 text-xs text-[#A3A3A3]">Thanks for meeting on Nova.</p>
          </div>

          {feedbackSent ? (
            <p className="rounded-[6px] bg-[#189B55]/20 py-2 text-xs font-medium text-[#1EC26A]">
              Thank you for your feedback!
            </p>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.submitFeedback(roomName, rating, feedbackComment).catch(() => undefined);
                setFeedbackSent(true);
              }}
              className="space-y-3 rounded-[6px] border border-[#292929] bg-[#292929]/50 p-4 text-left"
            >
              <p className="text-center text-xs font-medium text-[#C2C2C2]">How was your meeting quality?</p>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`Rate ${n} stars`}
                    onClick={() => setRating(n)}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        n <= rating ? "fill-[#F8AE1A] text-[#F8AE1A]" : "text-[#525252]"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Optional feedback..."
                className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#141414] px-3 py-2 text-xs text-white placeholder-[#A3A3A3] outline-none"
              />
              <button
                type="submit"
                className="w-full rounded-[6px] bg-[#292929] py-2 text-xs font-semibold text-white hover:bg-[#3D3D3D]"
              >
                Submit feedback
              </button>
            </form>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate(0)}
              className="flex-1 rounded-[6px] bg-[#246FE5] py-2.5 text-xs font-semibold text-white hover:bg-[#4687ED]"
            >
              Rejoin meeting
            </button>
            <Link
              to="/"
              className="flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] py-2.5 text-xs font-semibold text-white hover:bg-[#3D3D3D]"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "prejoin") {
    return (
      <PrejoinView
        roomName={roomName}
        initialName={initialName}
        hasPasswordHint={hasPasswordHint}
        error={joinError}
        onJoin={startConference}
      />
    );
  }

  if (session?.rejectedReason) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#040404] px-4 text-center text-white">
        <h1 className="text-xl font-bold text-[#F24D5F]">Unable to enter room</h1>
        <p className="mt-2 text-sm text-[#C2C2C2]">{session.rejectedReason}</p>
        <Link to="/" className="mt-6 rounded-[6px] bg-[#246FE5] px-5 py-2.5 text-sm font-semibold text-white">
          Back home
        </Link>
      </div>
    );
  }

  if (session?.inLobby) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#040404] px-4 text-center text-white">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F8AE1A]/20 text-[#F8AE1A]">
          <Clock className="h-7 w-7 animate-pulse" />
        </div>
        <h1 className="text-xl font-semibold">Asking to join meeting</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          {session.lobbyMessage || "The moderator has not admitted you yet."}
        </p>
      </div>
    );
  }

  const audioDevices = devices.filter((d) => d.kind === "audioinput");
  const videoDevices = devices.filter((d) => d.kind === "videoinput");
  const raisedHandCount = session?.participants.filter((p) => p.hand_raised).length ?? 0;
  const latestSubtitle =
    session && session.subtitles.length > 0 ? session.subtitles[session.subtitles.length - 1] : null;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-[#040404] text-white" data-tick={tick}>
      {session ? (
        <ConferenceHeader
          roomName={roomName}
          security={session.security}
          elapsedSeconds={elapsedSeconds}
          participantCount={session.participants.length}
          raisedHandCount={raisedHandCount}
          recording={recording}
          stats={{ ...stats, iceState: session.iceState }}
          videoQuality={videoQuality}
          followMe={session.followMe}
          onOpenSecurity={() => setSecurityOpen(true)}
          onOpenParticipants={() => setParticipantsOpen((p) => !p)}
        />
      ) : null}

      {session?.lastError ? (
        <div className="absolute top-14 left-1/2 z-30 -translate-x-1/2">
          <button
            type="button"
            onClick={() => {
              session.close();
              sessionRef.current = null;
              setJoinError(session.lastError);
              setPhase("prejoin");
            }}
            className="rounded-[6px] border border-[#CB2233] bg-[#CB2233]/25 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-[#CB2233]/40"
          >
            {session.lastError} — click to rejoin
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {chatOpen && session ? (
          <ChatDrawer
            roomName={roomName}
            activeTab={chatTab}
            selfId={session.selfId}
            selfName={self?.display_name ?? "Me"}
            participants={session.participants}
            messages={session.messages}
            polls={session.polls}
            subtitles={session.subtitles}
            files={session.files}
            captionsOn={captionsOn}
            dmTarget={dmTarget}
            onSelectDmTarget={setDmTarget}
            onSelectTab={(t) => setChatTab(t)}
            onClose={() => setChatOpen(false)}
            onSendChat={(body, recipient_id, reply_to_id) =>
              session.send({ type: "chat_send", body, recipient_id, reply_to_id })
            }
            onCreatePoll={(question, options) => session.send({ type: "poll_create", question, options })}
            onVotePoll={(poll_id, option_index) => session.send({ type: "poll_vote", poll_id, option_index })}
            onToggleCaptions={toggleCaptions}
          />
        ) : null}

        <VideoStage
          participants={session?.participants ?? []}
          selfId={session?.selfId ?? null}
          isModerator={session?.isModerator ?? false}
          mirrorSelf={mirrorSelf}
          activeSpeakerId={session?.getActiveSpeakerId() ?? null}
          localStream={session?.localStream ?? null}
          localScreenStream={session?.screenStream ?? null}
          remoteStreams={session?.remoteStreams ?? new Map()}
          remoteScreenStreams={session?.remoteScreenStreams ?? new Map()}
          tileView={tileView}
          pinnedId={pinnedId}
          sharedVideo={session?.sharedVideo ?? null}
          latestSubtitle={latestSubtitle}
          captionsEnabled={captionsOn}
          onSharedVideoControl={(playing, time_secs) =>
            session?.send({ type: "shared_video", playing, time_secs })
          }
          onStopSharedVideo={() =>
            session?.send({ type: "shared_video", url: "", playing: false, time_secs: 0 })
          }
          onTogglePin={togglePin}
          reactions={reactions}
        />

        {participantsOpen && session ? (
          <ParticipantsDrawer
            selfId={session.selfId}
            isModerator={session.isModerator}
            followMeEnabled={Boolean(session.followMe?.enabled)}
            participants={session.participants}
            lobby={session.lobby}
            breakouts={session.breakouts}
            onClose={() => setParticipantsOpen(false)}
            onOpenInvite={() => setInviteOpen(true)}
            onLobbyDecision={(peer_id, admit) => session.send({ type: "lobby_decision", peer_id, admit })}
            onModerate={(target_id, action) => session.send({ type: "moderate", target_id, action })}
            onDmPeer={(peerId) => {
              setDmTarget(peerId);
              setChatTab("chat");
              setChatOpen(true);
            }}
            onCreateBreakout={(name) => session.send({ type: "breakout_create", name })}
            onMoveBreakout={(breakout_id) => session.send({ type: "breakout_move", breakout_id })}
            onMuteEveryone={() => session.send({ type: "mute_everyone", include_video: false })}
            onToggleFollowMe={(enabled) =>
              session.send({ type: "follow_me", enabled, pinned_peer_id: pinnedId, tile_view: tileView })
            }
          />
        ) : null}
      </div>

      <ControlDock
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        screenSharing={screenSharing}
        handRaised={handRaised}
        tileView={tileView}
        captionsOn={captionsOn}
        recording={recording}
        fullscreen={fullscreen}
        noiseSuppression={noiseSuppression}
        mirrorSelf={mirrorSelf}
        chatOpen={chatOpen}
        participantsOpen={participantsOpen}
        unreadChat={unreadChat}
        lobbyCount={session?.lobby.length ?? 0}
        participantCount={session?.participants.length ?? 0}
        isModerator={session?.isModerator ?? false}
        videoQuality={videoQuality}
        audioDevices={audioDevices}
        videoDevices={videoDevices}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onSelectAudioDevice={(id) => {
          session?.switchAudioInput(id).catch(() => undefined);
        }}
        onSelectVideoDevice={(id) => {
          session
            ?.switchVideoInput(id)
            .then((nextStream) => {
              if (nextStream) {
                rawStreamRef.current = nextStream;
                if (bgMode !== "none") applyVirtualBg(bgMode).catch(() => undefined);
              }
            })
            .catch(() => undefined);
        }}
        onToggleNoiseSuppression={() => {
          const next = !noiseSuppression;
          setNoiseSuppression(next);
          session?.applyAudioProcessing({ noiseSuppression: next, echoCancellation }).catch(() => undefined);
        }}
        onToggleMirror={() => setMirrorSelf((m) => !m)}
        onToggleScreen={() => {
          session?.toggleScreenShare().catch(() => undefined);
        }}
        onToggleHand={() => session?.send({ type: "raise_hand", raised: !handRaised })}
        onToggleTileView={toggleTileView}
        onToggleChat={toggleChatDrawer}
        onToggleParticipants={() => setParticipantsOpen((p) => !p)}
        onToggleCaptions={toggleCaptions}
        onToggleRecord={toggleRecord}
        onToggleFullscreen={toggleFullscreen}
        onTogglePip={togglePip}
        onSetVideoQuality={(q) => {
          setVideoQuality(q);
          session?.setVideoQuality(q).catch(() => undefined);
        }}
        onOpenWhiteboard={() => setWhiteboardOpen(true)}
        onOpenSecurity={() => setSecurityOpen(true)}
        onOpenInvite={() => setInviteOpen(true)}
        onOpenSharedVideo={() => setSharedVideoOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onOpenSettings={(t = "audio") => setSettingsTab(t)}
        onMuteEveryone={() => session?.send({ type: "mute_everyone", include_video: false })}
        onSendReaction={(emoji) => session?.send({ type: "reaction", emoji })}
        onLeave={handleLeave}
        onEndConference={() => session?.send({ type: "end_conference" })}
      />

      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {session?.showVisitorJoinDialog ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Joining meeting"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div className="w-full max-w-sm rounded-[8px] border border-[#292929] bg-[#141414] p-6 text-white shadow-2xl">
            <h2 className="text-base font-semibold">Joining meeting</h2>
            <p className="mt-3 text-sm text-[#C2C2C2]">You&apos;re currently a viewer in this conference.</p>
            <div className="my-4 flex flex-col items-center gap-2">
              <span className="rounded border border-[#3D3D3D] px-3 py-1 text-xs text-[#C2C2C2]">
                Raise your hand
              </span>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#292929] text-white">
                <Hand className="h-5 w-5" />
              </span>
            </div>
            <p className="text-sm text-[#C2C2C2]">
              If you wish to speak, please raise your hand below and wait for the moderator&apos;s approval.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => session.hideDialog()}
                className="rounded-[6px] bg-[#246FE5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4687ED]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {whiteboardOpen && session ? (
        <WhiteboardModal
          strokes={session.strokes}
          selfId={session.selfId || "self"}
          onAddStroke={(stroke) => session.send({ type: "whiteboard_stroke", stroke })}
          onClear={() => session.send({ type: "whiteboard_clear" })}
          onClose={() => setWhiteboardOpen(false)}
        />
      ) : null}

      {securityOpen && session ? (
        <SecurityModal
          isModerator={session.isModerator}
          security={session.security}
          onUpdate={(payload) => session.send({ type: "room_security", ...payload })}
          onUpdateAvModeration={(start_audio_muted, start_video_muted) =>
            session.send({ type: "av_moderation", start_audio_muted, start_video_muted })
          }
          onEnableE2eePassphrase={(passphrase) => {
            deriveRoomAesKey(passphrase, roomName, 1)
              .then((key) => {
                session.setE2eeKey(key);
                pushToast({ title: "End-to-End Encryption key applied" });
              })
              .catch(() => undefined);
          }}
          onClose={() => setSecurityOpen(false)}
        />
      ) : null}

      {inviteOpen ? <InviteModal roomName={roomName} onClose={() => setInviteOpen(false)} /> : null}

      {sharedVideoOpen && session ? (
        <SharedVideoModal
          currentUrl={session.sharedVideo?.url ?? null}
          onStart={(url) => session.send({ type: "shared_video", url, playing: true, time_secs: 0 })}
          onStop={() => session.send({ type: "shared_video", url: "", playing: false, time_secs: 0 })}
          onClose={() => setSharedVideoOpen(false)}
        />
      ) : null}

      {statsOpen && session ? (
        <SpeakerStatsModal
          participants={session.participants}
          selfId={session.selfId}
          onClose={() => setStatsOpen(false)}
        />
      ) : null}

      {settingsTab && session ? (
        <SettingsModal
          initialTab={settingsTab}
          isModerator={session.isModerator}
          displayName={self?.display_name ?? "Guest"}
          email={self?.email ?? ""}
          avatarUrl={self?.avatar_url ?? ""}
          audioDevices={audioDevices}
          videoDevices={videoDevices}
          noiseSuppression={noiseSuppression}
          echoCancellation={echoCancellation}
          talkWhileMutedEnabled={talkWhileMutedEnabled}
          mirrorSelf={mirrorSelf}
          videoQuality={videoQuality}
          bgMode={bgMode}
          followMeEnabled={Boolean(session.followMe?.enabled)}
          security={session.security}
          soundNotifications={soundNotifications}
          lang={lang}
          onSelectAudioDevice={(id) => {
            session.switchAudioInput(id).catch(() => undefined);
          }}
          onSelectVideoDevice={(id) => {
            session
              .switchVideoInput(id)
              .then((nextStream) => {
                if (nextStream) {
                  rawStreamRef.current = nextStream;
                  if (bgMode !== "none") applyVirtualBg(bgMode).catch(() => undefined);
                }
              })
              .catch(() => undefined);
          }}
          onToggleAudioProcessing={(opts) => {
            setNoiseSuppression(opts.noiseSuppression);
            setEchoCancellation(opts.echoCancellation);
            session.applyAudioProcessing(opts).catch(() => undefined);
          }}
          onToggleTalkWhileMuted={(v) => {
            setTalkWhileMutedEnabled(v);
            session.setTalkWhileMutedEnabled(v);
          }}
          onToggleMirror={setMirrorSelf}
          onSetVideoQuality={(q) => {
            setVideoQuality(q);
            session.setVideoQuality(q).catch(() => undefined);
          }}
          onSelectBgMode={(m) => {
            applyVirtualBg(m).catch(() => undefined);
          }}
          onSaveProfile={({ displayName, email, avatarUrl }) => {
            session.send({
              type: "set_profile",
              display_name: displayName,
              email,
              avatar_url: avatarUrl,
            });
          }}
          onUpdateAvModeration={(start_audio_muted, start_video_muted) =>
            session.send({ type: "av_moderation", start_audio_muted, start_video_muted })
          }
          onToggleFollowMe={(enabled) =>
            session.send({ type: "follow_me", enabled, pinned_peer_id: pinnedId, tile_view: tileView })
          }
          onToggleSounds={setSoundNotifications}
          onChangeLang={setLang}
          onClose={() => setSettingsTab(null)}
        />
      ) : null}
    </div>
  );
}
