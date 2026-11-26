import { useEffect, useRef } from "react";
import { Crown, Hand, MicOff, Monitor, Pin, PinOff } from "lucide-react";
import type { FloatingReaction, Participant } from "~/lib/rtc";

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isSelf: boolean;
  isActiveSpeaker: boolean;
  isPinned: boolean;
  isScreen?: boolean;
  onTogglePin: (id: string) => void;
}

function VideoTile({
  participant,
  stream,
  isSelf,
  isActiveSpeaker,
  isPinned,
  isScreen = false,
  onTogglePin,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasVideo = Boolean(stream && stream.getVideoTracks().some((t) => t.readyState === "live") && (isScreen || !participant.video_muted));
  const hasAudio = Boolean(!isSelf && stream && stream.getAudioTracks().length > 0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && hasVideo) {
      if (v.srcObject !== stream) v.srcObject = stream;
      v.play().catch(() => undefined);
    } else {
      v.srcObject = null;
    }
  }, [stream, hasVideo]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (hasAudio && stream) {
      if (a.srcObject !== stream) a.srcObject = stream;
      a.play().catch(() => undefined);
    } else {
      a.srcObject = null;
    }
  }, [stream, hasAudio]);

  const initials = participant.display_name
    .split(/\s+/)
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      data-testid={isScreen ? `screen-tile-${participant.id}` : `video-tile-${participant.id}`}
      className={`group relative flex h-full min-h-[160px] w-full items-center justify-center overflow-hidden rounded-2xl bg-[#111827] transition-all ${
        isActiveSpeaker
          ? "ring-2 ring-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.22)]"
          : "ring-1 ring-white/10"
      }`}
    >
      {hasAudio ? <audio ref={audioRef} autoPlay playsInline /> : null}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf || isScreen}
          className={`h-full w-full ${isScreen ? "object-contain bg-black" : "object-cover"} ${
            isSelf && !isScreen ? "-scale-x-100" : ""
          }`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600/30 to-indigo-600/30 text-lg font-bold text-blue-200 ring-1 ring-white/15">
            {initials || "?"}
          </div>
          {participant.video_muted ? <span className="text-[11px] text-slate-400">Camera off</span> : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => onTogglePin(participant.id)}
        aria-label={isPinned ? "Unpin participant" : "Pin participant"}
        className="absolute top-3 right-3 hidden h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur transition hover:bg-black/75 group-hover:flex"
      >
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </button>

      {participant.hand_raised ? (
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-slate-950 shadow">
          <Hand className="h-3.5 w-3.5" />
          Hand
        </div>
      ) : null}

      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-md">
          {participant.is_moderator ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : null}
          {isScreen ? <Monitor className="h-3.5 w-3.5 text-sky-400" /> : null}
          <span className="truncate max-w-[160px]">
            {participant.display_name}
            {isSelf ? " (You)" : ""}
            {isScreen ? " — Screen" : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {participant.audio_muted ? (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600/90 text-white">
              <MicOff className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

interface VideoStageProps {
  participants: Participant[];
  selfId: string | null;
  activeSpeakerId: string | null;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  tileView: boolean;
  pinnedId: string | null;
  onTogglePin: (id: string) => void;
  reactions: FloatingReaction[];
}

export function VideoStage({
  participants,
  selfId,
  activeSpeakerId,
  localStream,
  localScreenStream,
  remoteStreams,
  remoteScreenStreams,
  tileView,
  pinnedId,
  onTogglePin,
  reactions,
}: VideoStageProps) {
  const selfBreakout = participants.find((p) => p.id === selfId)?.breakout_id ?? null;
  const visible = participants.filter((p) => (p.breakout_id ?? null) === selfBreakout);

  const screenEntries: Array<{ participant: Participant; stream: MediaStream; isSelf: boolean }> = [];
  for (const p of visible) {
    if (p.id === selfId && localScreenStream) {
      screenEntries.push({ participant: p, stream: localScreenStream, isSelf: true });
    } else {
      const s = remoteScreenStreams.get(p.id);
      if (s) screenEntries.push({ participant: p, stream: s, isSelf: false });
    }
  }

  const getStream = (p: Participant) => (p.id === selfId ? localStream : (remoteStreams.get(p.id) ?? null));

  const useStageAndFilmstrip = !tileView || screenEntries.length > 0 || Boolean(pinnedId);
  const stageScreen = screenEntries[0];
  const stagePeer =
    visible.find((p) => p.id === pinnedId) ||
    visible.find((p) => p.id === activeSpeakerId) ||
    visible.find((p) => p.id !== selfId) ||
    visible[0];

  const cols =
    visible.length <= 1
      ? "grid-cols-1 max-w-4xl mx-auto"
      : visible.length === 2
        ? "grid-cols-1 md:grid-cols-2"
        : visible.length <= 4
          ? "grid-cols-2"
          : visible.length <= 9
            ? "grid-cols-2 md:grid-cols-3"
            : "grid-cols-2 md:grid-cols-4";

  return (
    <div className="relative flex-1 overflow-hidden p-3 sm:p-4">
      {useStageAndFilmstrip && (stageScreen || stagePeer) ? (
        <div className="flex h-full flex-col gap-3 lg:flex-row">
          <div className="min-h-0 flex-1">
            {stageScreen ? (
              <VideoTile
                participant={stageScreen.participant}
                stream={stageScreen.stream}
                isSelf={stageScreen.isSelf}
                isActiveSpeaker={false}
                isPinned={false}
                isScreen
                onTogglePin={onTogglePin}
              />
            ) : stagePeer ? (
              <VideoTile
                participant={stagePeer}
                stream={getStream(stagePeer)}
                isSelf={stagePeer.id === selfId}
                isActiveSpeaker={stagePeer.id === activeSpeakerId}
                isPinned={pinnedId === stagePeer.id}
                onTogglePin={onTogglePin}
              />
            ) : null}
          </div>
          {visible.length > 1 || stageScreen ? (
            <div className="flex gap-2.5 overflow-x-auto lg:w-64 lg:flex-col lg:overflow-y-auto">
              {visible.map((p) => (
                <div key={p.id} className="h-32 w-48 shrink-0 lg:h-40 lg:w-full">
                  <VideoTile
                    participant={p}
                    stream={getStream(p)}
                    isSelf={p.id === selfId}
                    isActiveSpeaker={p.id === activeSpeakerId}
                    isPinned={pinnedId === p.id}
                    onTogglePin={onTogglePin}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className={`grid h-full gap-3 ${cols} auto-rows-fr`}>
          {visible.map((p) => (
            <VideoTile
              key={p.id}
              participant={p}
              stream={getStream(p)}
              isSelf={p.id === selfId}
              isActiveSpeaker={p.id === activeSpeakerId}
              isPinned={pinnedId === p.id}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute right-8 bottom-6 flex flex-col items-end gap-2">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="animate-reaction flex items-center gap-1.5 rounded-full bg-slate-900/85 px-3 py-1.5 text-sm shadow-lg ring-1 ring-white/10 backdrop-blur"
          >
            <span className="text-lg">{r.emoji}</span>
            <span className="text-xs font-medium text-slate-200">{r.display_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
