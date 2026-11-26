import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { Clock, Lock, ShieldCheck, Wifi } from "lucide-react";
import { ControlDock, type PanelTab } from "~/components/ControlDock";
import { InviteModal } from "~/components/InviteModal";
import { PrejoinView } from "~/components/PrejoinView";
import { SecurityModal } from "~/components/SecurityModal";
import { SidePanel } from "~/components/SidePanel";
import { VideoStage } from "~/components/VideoStage";
import { WhiteboardModal } from "~/components/WhiteboardModal";
import { api } from "~/lib/api";
import { createBlurredVideoTrack, type BlurPipeline } from "~/lib/blur";
import { deriveRoomAesKey } from "~/lib/e2ee";
import { emitExternalEvent, subscribeExternalCommands } from "~/lib/external-bridge";
import { type FloatingReaction, NovaRtcSession } from "~/lib/rtc";

export default function RoomRoute({ embedMode = false }: { embedMode?: boolean }) {
  const { roomName = "nova-room" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"prejoin" | "active" | "left">("prejoin");
  const [tick, setTick] = useState(0);
  const [tileView, setTileView] = useState(true);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<PanelTab>(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [blurEnabled, setBlurEnabled] = useState(false);
  const [recording, setRecording] = useState(false);
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasPasswordHint, setHasPasswordHint] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const sessionRef = useRef<NovaRtcSession | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);
  const blurRef = useRef<BlurPipeline | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const prevMsgCountRef = useRef(0);
  const activePanelRef = useRef<PanelTab>(null);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  const initialName = searchParams.get("name") || "";
  const jwtToken = searchParams.get("jwt") || undefined;

  useEffect(() => {
    let mounted = true;
    api
      .getRoom(roomName)
      .then((res) => {
        if (mounted) setHasPasswordHint(res.room.has_password);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [roomName]);

  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const handleLeave = useCallback(() => {
    blurRef.current?.stop();
    blurRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    sessionRef.current?.close();
    emitExternalEvent(roomName, "videoConferenceLeft", { roomName });
    emitExternalEvent(roomName, "readyToClose", {});
    setPhase("left");
  }, [roomName]);

  const startConference = useCallback(
    (opts: {
      displayName: string;
      password: string;
      audioMuted: boolean;
      videoMuted: boolean;
      blur: boolean;
      stream: MediaStream | null;
    }) => {
      rawStreamRef.current = opts.stream;
      let activeStream = opts.stream;
      if (opts.blur && opts.stream) {
        const pipe = createBlurredVideoTrack(opts.stream);
        if (pipe) {
          blurRef.current = pipe;
          const tracks = [...opts.stream.getAudioTracks(), pipe.track];
          activeStream = new MediaStream(tracks);
        }
      }
      setBlurEnabled(opts.blur);
      setJoinError(null);

      const session = new NovaRtcSession(roomName, {
        onStateChange: () => {
          forceUpdate();
          const msgLen = session.messages.length;
          if (msgLen > prevMsgCountRef.current && activePanelRef.current !== "chat") {
            setUnreadChat((u) => u + (msgLen - prevMsgCountRef.current));
          }
          prevMsgCountRef.current = msgLen;
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
          setNotice(`${action.replace("_", " ")} applied by ${byName}`);
          window.setTimeout(() => setNotice(null), 4000);
        },
        onConferenceLeft: handleLeave,
      });
      sessionRef.current = session;
      session.connect({
        displayName: opts.displayName,
        password: opts.password,
        token: jwtToken,
        audioMuted: opts.audioMuted,
        videoMuted: opts.videoMuted,
        localStream: activeStream,
      });
      setPhase("active");
      emitExternalEvent(roomName, "videoConferenceJoined", {
        roomName,
        displayName: opts.displayName,
      });
    },
    [forceUpdate, handleLeave, jwtToken, roomName]
  );

  // Auto-join immediately in embed mode when name is supplied or default guest.
  useEffect(() => {
    if (!embedMode || phase !== "prejoin" || sessionRef.current) return;
    startConference({
      displayName: initialName || "Embedded Guest",
      password: "",
      audioMuted: true,
      videoMuted: true,
      blur: false,
      stream: null,
    });
  }, [embedMode, initialName, phase, startConference]);

  useEffect(() => {
    return () => {
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

  const toggleBlur = useCallback(async () => {
    if (!session) return;
    const next = !blurEnabled;
    if (next && rawStreamRef.current) {
      const pipe = createBlurredVideoTrack(rawStreamRef.current);
      if (pipe) {
        blurRef.current?.stop();
        blurRef.current = pipe;
        await session.replaceVideoTrack(pipe.track);
        setBlurEnabled(true);
      }
    } else {
      blurRef.current?.stop();
      blurRef.current = null;
      const origTrack = rawStreamRef.current?.getVideoTracks()[0] ?? null;
      await session.replaceVideoTrack(origTrack);
      setBlurEnabled(false);
    }
  }, [blurEnabled, session]);

  const toggleRecording = useCallback(() => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    const stream = session?.localStream || session?.remoteStreams.values().next().value;
    if (!stream || typeof MediaRecorder === "undefined") {
      setNotice("No local/remote media stream to record");
      window.setTimeout(() => setNotice(null), 3000);
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
  }, [recording, roomName, session]);

  useEffect(() => {
    if (phase !== "active") return;
    return subscribeExternalCommands({
      onToggleAudio: toggleAudio,
      onToggleVideo: toggleVideo,
      onToggleShareScreen: () => {
        session?.toggleScreenShare().catch(() => undefined);
      },
      onToggleChat: () => setActivePanel((p) => (p === "chat" ? null : "chat")),
      onToggleTileView: () => setTileView((v) => !v),
      onToggleRaiseHand: () => session?.send({ type: "raise_hand", raised: !handRaised }),
      onToggleWhiteboard: () => setWhiteboardOpen((w) => !w),
      onHangup: handleLeave,
      onSendChat: (body) => session?.send({ type: "chat_send", body, recipient_id: null }),
      onDisplayName: (display_name) => session?.send({ type: "set_display_name", display_name }),
      onSubject: (subject) => session?.send({ type: "room_security", subject }),
      onPassword: (password) => session?.send({ type: "room_security", password, locked: true }),
      onMuteEveryone: () => {
        session?.participants.forEach((p) => {
          if (p.id !== session.selfId) {
            session.send({ type: "moderate", target_id: p.id, action: "mute_audio" });
          }
        });
      },
    });
  }, [handleLeave, handRaised, phase, session, toggleAudio, toggleVideo]);

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
          setActivePanel((p) => (p === "chat" ? null : "chat"));
          setUnreadChat(0);
          break;
        case "r":
          session?.send({ type: "raise_hand", raised: !handRaised });
          break;
        case "t":
          setTileView((v) => !v);
          break;
        case "w":
          setWhiteboardOpen((w) => !w);
          break;
        default:
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handRaised, phase, session, toggleAudio, toggleVideo]);

  if (phase === "left") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 text-center text-slate-100">
        <img src="/brand-assets/icon.svg" alt="Nova" className="mb-4 h-12 w-12" />
        <h1 className="text-2xl font-bold">You left {roomName}</h1>
        <p className="mt-2 text-sm text-slate-400">Thanks for meeting on Nova.</p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => navigate(0)}
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Rejoin meeting
          </button>
          <Link to="/" className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-white/10">
            Home
          </Link>
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
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 text-center text-slate-100">
        <h1 className="text-xl font-bold text-rose-400">Unable to enter room</h1>
        <p className="mt-2 text-sm text-slate-300">{session.rejectedReason}</p>
        <Link to="/" className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
          Back home
        </Link>
      </div>
    );
  }

  if (session?.inLobby) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 text-center text-slate-100">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
          <Clock className="h-7 w-7 animate-pulse" />
        </div>
        <h1 className="text-xl font-bold">Waiting in lobby</h1>
        <p className="mt-2 text-sm text-slate-400">{session.lobbyMessage || "Waiting for host approval…"}</p>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0b0f17] text-slate-100" data-tick={tick}>
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/brand-assets/icon.svg" alt="Nova" className="h-7 w-7 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold text-white">{session?.security.subject || roomName}</h1>
              {session?.security.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : null}
              {session?.security.e2ee_enabled ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  <ShieldCheck className="h-3 w-3" /> E2EE
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400">/{roomName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {notice ? <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-amber-300">{notice}</span> : null}
          {session?.lastError ? (
            <button
              type="button"
              onClick={() => {
                session.close();
                sessionRef.current = null;
                setJoinError(session.lastError);
                setPhase("prejoin");
              }}
              className="rounded-lg bg-rose-500/20 px-2.5 py-1 text-rose-300 hover:bg-rose-500/30"
            >
              {session.lastError}
            </button>
          ) : null}
          <span
            data-testid="ice-status"
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
              session?.iceState === "connected" || session?.iceState === "completed"
                ? "bg-emerald-500/15 text-emerald-300"
                : "bg-white/5 text-slate-300"
            }`}
          >
            <Wifi className="h-3 w-3" />
            ICE: {session?.iceState ?? "connecting"}
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <VideoStage
          participants={session?.participants ?? []}
          selfId={session?.selfId ?? null}
          activeSpeakerId={session?.getActiveSpeakerId() ?? null}
          localStream={session?.localStream ?? null}
          localScreenStream={session?.screenStream ?? null}
          remoteStreams={session?.remoteStreams ?? new Map()}
          remoteScreenStreams={session?.remoteScreenStreams ?? new Map()}
          tileView={tileView}
          pinnedId={pinnedId}
          onTogglePin={(id) => setPinnedId((cur) => (cur === id ? null : id))}
          reactions={reactions}
        />

        {activePanel && session ? (
          <SidePanel
            tab={activePanel}
            selfId={session.selfId}
            isModerator={session.isModerator}
            participants={session.participants}
            lobby={session.lobby}
            messages={session.messages}
            polls={session.polls}
            breakouts={session.breakouts}
            onClose={() => setActivePanel(null)}
            onSelectTab={(t) => {
              setActivePanel(t);
              if (t === "chat") setUnreadChat(0);
            }}
            onSendChat={(body, recipient_id) => session.send({ type: "chat_send", body, recipient_id })}
            onCreatePoll={(question, options) => session.send({ type: "poll_create", question, options })}
            onVotePoll={(poll_id, option_index) => session.send({ type: "poll_vote", poll_id, option_index })}
            onLobbyDecision={(peer_id, admit) => session.send({ type: "lobby_decision", peer_id, admit })}
            onModerate={(target_id, action) => session.send({ type: "moderate", target_id, action })}
            onCreateBreakout={(name) => session.send({ type: "breakout_create", name })}
            onMoveBreakout={(breakout_id) => session.send({ type: "breakout_move", breakout_id })}
          />
        ) : null}
      </div>

      <ControlDock
        audioMuted={audioMuted}
        videoMuted={videoMuted}
        screenSharing={screenSharing}
        handRaised={handRaised}
        tileView={tileView}
        blurEnabled={blurEnabled}
        recording={recording}
        activePanel={activePanel}
        unreadChat={unreadChat}
        lobbyCount={session?.lobby.length ?? 0}
        participantCount={session?.participants.length ?? 0}
        isModerator={session?.isModerator ?? false}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreen={() => {
          session?.toggleScreenShare().catch(() => undefined);
        }}
        onToggleHand={() => session?.send({ type: "raise_hand", raised: !handRaised })}
        onToggleTileView={() => setTileView((v) => !v)}
        onToggleBlur={() => {
          toggleBlur().catch(() => undefined);
        }}
        onToggleRecord={toggleRecording}
        onSelectPanel={(tab) => {
          setActivePanel(tab);
          if (tab === "chat") setUnreadChat(0);
        }}
        onOpenWhiteboard={() => setWhiteboardOpen(true)}
        onOpenSecurity={() => setSecurityOpen(true)}
        onOpenInvite={() => setInviteOpen(true)}
        onSendReaction={(emoji) => session?.send({ type: "reaction", emoji })}
        onLeave={handleLeave}
      />

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
          onEnableE2eePassphrase={(passphrase) => {
            deriveRoomAesKey(passphrase, roomName, 1)
              .then((key) => {
                session.setE2eeKey(key);
                setNotice("E2EE key applied");
                window.setTimeout(() => setNotice(null), 3000);
              })
              .catch(() => undefined);
          }}
          onClose={() => setSecurityOpen(false)}
        />
      ) : null}

      {inviteOpen ? <InviteModal roomName={roomName} onClose={() => setInviteOpen(false)} /> : null}
    </div>
  );
}
