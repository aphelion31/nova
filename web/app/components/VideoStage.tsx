import { useEffect, useRef } from "react";
import { Crown, Hand, MicOff, Monitor, Pin, PinOff, PlaySquare, X } from "lucide-react";
import type { FloatingReaction, Participant, SharedVideoState, SubtitleEntry } from "~/lib/rtc";

function extractYoutubeId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    let candidate = "";
    if (u.hostname.includes("youtu.be")) {
      candidate = u.pathname.replace(/^\//, "").split("/")[0] || "";
    } else if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      candidate =
        u.searchParams.get("v") ||
        (u.pathname.startsWith("/shorts/") ? u.pathname.split("/")[2] : "") ||
        (u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : "") ||
        "";
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

interface VideoTileProps {
  participant: Participant;
  stream: MediaStream | null;
  isSelf: boolean;
  mirrorSelf: boolean;
  isActiveSpeaker: boolean;
  isPinned: boolean;
  isScreen?: boolean;
  onTogglePin: (id: string) => void;
}

function VideoTile({
  participant,
  stream,
  isSelf,
  mirrorSelf,
  isActiveSpeaker,
  isPinned,
  isScreen = false,
  onTogglePin,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasVideo = Boolean(
    stream &&
      stream.getVideoTracks().some((t) => t.readyState === "live") &&
      (isScreen || !participant.video_muted),
  );
  const hasAudio = Boolean(!isSelf && stream && stream.getAudioTracks().length > 0);
  const validAvatar =
    participant.avatar_url && /^https?:\/\//i.test(participant.avatar_url) ? participant.avatar_url : null;

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

  const speakingBarActive = !participant.audio_muted && participant.audio_level > 0.08;

  return (
    <div
      data-testid={isScreen ? `screen-tile-${participant.id}` : `video-tile-${participant.id}`}
      className={`group relative flex h-full min-h-[160px] w-full items-center justify-center overflow-hidden rounded-[6px] bg-[#292929] transition-all ${
        isActiveSpeaker
          ? "ring-2 ring-[#246FE5] shadow-[0_0_24px_rgba(36,111,229,0.28)]"
          : "ring-1 ring-[#3D3D3D]/60"
      }`}
    >
      {hasAudio ? <audio ref={audioRef} autoPlay playsInline /> : null}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf || isScreen}
          className={`h-full w-full ${isScreen ? "bg-black object-contain" : "object-cover"} ${
            isSelf && !isScreen && mirrorSelf ? "-scale-x-100" : ""
          }`}
        />
      ) : validAvatar ? (
        <img
          src={validAvatar}
          alt={participant.display_name}
          className="h-20 w-20 rounded-full border border-[#3D3D3D] object-cover"
        />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#3D3D3D] bg-[#4687ED]/25 text-xl font-semibold text-white">
            {initials || "?"}
          </div>
          {participant.video_muted ? <span className="text-[11px] text-[#A3A3A3]">Camera off</span> : null}
        </div>
      )}

      <button
        type="button"
        onClick={() => onTogglePin(participant.id)}
        aria-label={isPinned ? "Unpin participant" : "Pin participant"}
        className="absolute top-3 right-3 hidden h-8 w-8 items-center justify-center rounded-[4px] bg-[#141414]/80 text-white transition hover:bg-[#292929] group-hover:flex"
      >
        {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
      </button>

      {participant.hand_raised ? (
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-[4px] bg-[#F8AE1A] px-2.5 py-1 text-xs font-semibold text-[#040404] shadow">
          <Hand className="h-3.5 w-3.5" />
          Hand
        </div>
      ) : null}

      <div className="absolute inset-x-2.5 bottom-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 rounded-[4px] bg-[#141414]/80 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {!participant.audio_muted ? (
            <span className="flex items-center gap-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${speakingBarActive ? "bg-[#1EC26A]" : "bg-[#666666]"}`} />
              <span className={`h-2.5 w-1.5 rounded-full ${speakingBarActive ? "bg-[#1EC26A]" : "bg-[#666666]"}`} />
            </span>
          ) : null}
          {participant.is_moderator ? <Crown className="h-3.5 w-3.5 text-[#F8AE1A]" /> : null}
          {isScreen ? <Monitor className="h-3.5 w-3.5 text-[#4687ED]" /> : null}
          <span className="max-w-[160px] truncate">
            {participant.display_name}
            {isSelf ? " (You)" : ""}
            {isScreen ? " — Screen" : ""}
          </span>
        </div>

        {participant.audio_muted ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-[4px] bg-[#141414]/85 text-[#F24D5F]">
            <MicOff className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface VideoStageProps {
  participants: Participant[];
  selfId: string | null;
  isModerator: boolean;
  mirrorSelf: boolean;
  activeSpeakerId: string | null;
  localStream: MediaStream | null;
  localScreenStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  remoteScreenStreams: Map<string, MediaStream>;
  tileView: boolean;
  pinnedId: string | null;
  sharedVideo: SharedVideoState | null;
  latestSubtitle: SubtitleEntry | null;
  captionsEnabled: boolean;
  onSharedVideoControl: (playing: boolean, timeSecs: number) => void;
  onStopSharedVideo: () => void;
  onTogglePin: (id: string) => void;
  reactions: FloatingReaction[];
}

export function VideoStage({
  participants,
  selfId,
  isModerator,
  mirrorSelf,
  activeSpeakerId,
  localStream,
  localScreenStream,
  remoteStreams,
  remoteScreenStreams,
  tileView,
  pinnedId,
  sharedVideo,
  latestSubtitle,
  captionsEnabled,
  onSharedVideoControl,
  onStopSharedVideo,
  onTogglePin,
  reactions,
}: VideoStageProps) {
  const sharedRef = useRef<HTMLVideoElement | null>(null);
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

  const ytId = sharedVideo ? extractYoutubeId(sharedVideo.url) : null;
  const isSharedOwner = Boolean(sharedVideo && (sharedVideo.owner_id === selfId || isModerator));

  useEffect(() => {
    const el = sharedRef.current;
    if (!el || !sharedVideo || ytId) return;
    if (Math.abs(el.currentTime - sharedVideo.time_secs) > 1.5) {
      el.currentTime = sharedVideo.time_secs;
    }
    if (sharedVideo.playing && el.paused) {
      el.play().catch(() => undefined);
    } else if (!sharedVideo.playing && !el.paused) {
      el.pause();
    }
  }, [sharedVideo, ytId]);

  const getStream = (p: Participant) => (p.id === selfId ? localStream : (remoteStreams.get(p.id) ?? null));

  const useStageAndFilmstrip = !tileView || screenEntries.length > 0 || Boolean(pinnedId) || Boolean(sharedVideo);
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
    <div className="relative flex-1 overflow-hidden bg-[#040404] px-3 pt-14 pb-20 sm:px-4">
      {useStageAndFilmstrip && (sharedVideo || stageScreen || stagePeer) ? (
        <div className="flex h-full flex-col gap-3 lg:flex-row">
          <div className="min-h-0 flex-1">
            {sharedVideo ? (
              <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[6px] border border-[#3D3D3D] bg-[#141414]">
                <div className="flex items-center justify-between border-b border-[#292929] px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-white">
                    <PlaySquare className="h-4 w-4 text-[#4687ED]" />
                    Shared video by {sharedVideo.owner_name}
                  </span>
                  {isSharedOwner ? (
                    <button
                      type="button"
                      onClick={onStopSharedVideo}
                      className="inline-flex items-center gap-1 rounded-[4px] bg-[#CB2233] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#E04757]"
                    >
                      <X className="h-3.5 w-3.5" /> Stop
                    </button>
                  ) : null}
                </div>
                {ytId ? (
                  <iframe
                    title="Shared YouTube video"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=${sharedVideo.playing ? 1 : 0}`}
                    className="min-h-0 flex-1 w-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    ref={sharedRef}
                    src={sharedVideo.url}
                    controls={isSharedOwner}
                    playsInline
                    onPlay={(e) => isSharedOwner && onSharedVideoControl(true, e.currentTarget.currentTime)}
                    onPause={(e) => isSharedOwner && onSharedVideoControl(false, e.currentTarget.currentTime)}
                    onSeeked={(e) =>
                      isSharedOwner && onSharedVideoControl(!e.currentTarget.paused, e.currentTarget.currentTime)
                    }
                    className="min-h-0 flex-1 w-full bg-black object-contain"
                  />
                )}
              </div>
            ) : stageScreen ? (
              <VideoTile
                participant={stageScreen.participant}
                stream={stageScreen.stream}
                isSelf={stageScreen.isSelf}
                mirrorSelf={false}
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
                mirrorSelf={mirrorSelf}
                isActiveSpeaker={stagePeer.id === activeSpeakerId}
                isPinned={pinnedId === stagePeer.id}
                onTogglePin={onTogglePin}
              />
            ) : null}
          </div>
          {visible.length > 1 || stageScreen || sharedVideo ? (
            <div className="flex gap-2 overflow-x-auto jitsi-scroll lg:w-56 lg:flex-col lg:overflow-y-auto">
              {visible.map((p) => (
                <div key={p.id} className="h-28 w-44 shrink-0 lg:h-36 lg:w-full">
                  <VideoTile
                    participant={p}
                    stream={getStream(p)}
                    isSelf={p.id === selfId}
                    mirrorSelf={mirrorSelf}
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
        <div className={`grid h-full gap-2.5 ${cols} auto-rows-fr`}>
          {visible.map((p) => (
            <VideoTile
              key={p.id}
              participant={p}
              stream={getStream(p)}
              isSelf={p.id === selfId}
              mirrorSelf={mirrorSelf}
              isActiveSpeaker={p.id === activeSpeakerId}
              isPinned={pinnedId === p.id}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}

      {/* Closed Captions live subtitle overlay */}
      {captionsEnabled && latestSubtitle ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-22 z-20 flex justify-center">
          <div className="max-w-2xl rounded-[6px] border border-[#3D3D3D] bg-[#141414]/90 px-4 py-2 text-center text-sm text-white shadow-xl backdrop-blur-md">
            <span className="mr-2 font-semibold text-[#4687ED]">{latestSubtitle.display_name}:</span>
            <span>{latestSubtitle.text}</span>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute right-8 bottom-24 z-20 flex flex-col items-end gap-2">
        {reactions.map((r) => (
          <div
            key={r.id}
            className="animate-reaction flex items-center gap-1.5 rounded-full border border-[#3D3D3D] bg-[#141414]/90 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
          >
            <span className="text-lg">{r.emoji}</span>
            <span className="text-xs font-medium text-white">{r.display_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
