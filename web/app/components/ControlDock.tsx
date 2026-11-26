import { useState } from "react";
import {
  BarChart3,
  Captions,
  ChevronUp,
  Circle,
  Grid2x2,
  Hand,
  HelpCircle,
  Lock,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  MoreHorizontal,
  PenTool,
  PhoneOff,
  PictureInPicture2,
  PlaySquare,
  Settings,
  Share2,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Square,
  Users,
  Video,
  VideoOff,
  VolumeX,
} from "lucide-react";
import type { ChatTab } from "~/components/ChatDrawer";
import type { VideoQualityMode } from "~/lib/rtc";

interface ControlDockProps {
  audioMuted: boolean;
  videoMuted: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  tileView: boolean;
  captionsOn: boolean;
  recording: boolean;
  fullscreen: boolean;
  noiseSuppression: boolean;
  mirrorSelf: boolean;
  chatOpen: boolean;
  participantsOpen: boolean;
  unreadChat: number;
  lobbyCount: number;
  participantCount: number;
  isModerator: boolean;
  videoQuality: VideoQualityMode;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onToggleNoiseSuppression: () => void;
  onToggleMirror: () => void;
  onToggleScreen: () => void;
  onToggleHand: () => void;
  onToggleTileView: () => void;
  onToggleChat: (subtab?: ChatTab) => void;
  onToggleParticipants: () => void;
  onToggleCaptions: () => void;
  onToggleRecord: () => void;
  onToggleFullscreen: () => void;
  onTogglePip: () => void;
  onSetVideoQuality: (q: VideoQualityMode) => void;
  onOpenWhiteboard: () => void;
  onOpenSecurity: () => void;
  onOpenInvite: () => void;
  onOpenSharedVideo: () => void;
  onOpenStats: () => void;
  onOpenSettings: (tab?: "audio" | "video" | "profile" | "vb" | "moderator" | "shortcuts" | "more") => void;
  onMuteEveryone: () => void;
  onSendReaction: (emoji: string) => void;
  onLeave: () => void;
  onEndConference: () => void;
}

const REACTIONS = ["👍", "👏", "❤️", "🎉", "😂", "🔥"];

export function ControlDock(props: ControlDockProps) {
  const [popover, setPopover] = useState<"reactions" | "audio" | "video" | "overflow" | "hangup" | null>(null);

  const toggle = (name: NonNullable<typeof popover>) =>
    setPopover((cur) => (cur === name ? null : name));

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex items-center justify-center px-3">
      {/* Reactions floating bar */}
      {popover === "reactions" ? (
        <div className="pointer-events-auto absolute bottom-15 flex items-center gap-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-2.5 py-1.5 shadow-2xl">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                props.onSendReaction(emoji);
                setPopover(null);
              }}
              className="rounded-[4px] p-1.5 text-lg transition hover:scale-125 hover:bg-[#3D3D3D]"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      {/* Audio device quick-switch */}
      {popover === "audio" ? (
        <div className="pointer-events-auto absolute bottom-15 w-64 rounded-[6px] border border-[#3D3D3D] bg-[#141414] p-2 text-xs text-white shadow-2xl">
          <p className="px-2 py-1 text-[11px] font-semibold text-[#A3A3A3]">Microphone</p>
          {props.audioDevices.length === 0 ? (
            <p className="px-2 py-1.5 text-[#C2C2C2]">Default microphone</p>
          ) : (
            props.audioDevices.map((d) => (
              <button
                key={d.deviceId}
                type="button"
                onClick={() => {
                  props.onSelectAudioDevice(d.deviceId);
                  setPopover(null);
                }}
                className="block w-full truncate rounded-[4px] px-2 py-1.5 text-left text-[#C2C2C2] hover:bg-[#292929] hover:text-white"
              >
                {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
              </button>
            ))
          )}
          <hr className="my-1.5 border-[#3D3D3D]" />
          <label className="flex cursor-pointer items-center justify-between rounded-[4px] px-2 py-1.5 hover:bg-[#292929]">
            <span>Noise suppression</span>
            <input
              type="checkbox"
              checked={props.noiseSuppression}
              onChange={props.onToggleNoiseSuppression}
              className="accent-[#246FE5]"
            />
          </label>
        </div>
      ) : null}

      {/* Video device quick-switch */}
      {popover === "video" ? (
        <div className="pointer-events-auto absolute bottom-15 w-64 rounded-[6px] border border-[#3D3D3D] bg-[#141414] p-2 text-xs text-white shadow-2xl">
          <p className="px-2 py-1 text-[11px] font-semibold text-[#A3A3A3]">Camera</p>
          {props.videoDevices.length === 0 ? (
            <p className="px-2 py-1.5 text-[#C2C2C2]">Default camera</p>
          ) : (
            props.videoDevices.map((d) => (
              <button
                key={d.deviceId}
                type="button"
                onClick={() => {
                  props.onSelectVideoDevice(d.deviceId);
                  setPopover(null);
                }}
                className="block w-full truncate rounded-[4px] px-2 py-1.5 text-left text-[#C2C2C2] hover:bg-[#292929] hover:text-white"
              >
                {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
              </button>
            ))
          )}
          <hr className="my-1.5 border-[#3D3D3D]" />
          <label className="flex cursor-pointer items-center justify-between rounded-[4px] px-2 py-1.5 hover:bg-[#292929]">
            <span>Mirror my video</span>
            <input
              type="checkbox"
              checked={props.mirrorSelf}
              onChange={props.onToggleMirror}
              className="accent-[#246FE5]"
            />
          </label>
        </div>
      ) : null}

      {/* Jitsi More Actions ("...") Overflow Context Menu */}
      {popover === "overflow" ? (
        <div className="pointer-events-auto absolute bottom-15 max-h-[65dvh] w-68 overflow-y-auto rounded-[6px] border border-[#3D3D3D] bg-[#141414] py-1.5 text-xs text-white shadow-2xl jitsi-scroll">
          <div className="px-3 py-1.5">
            <p className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold text-[#A3A3A3]">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Video quality
            </p>
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { id: "hd", label: "HD" },
                  { id: "sd", label: "SD" },
                  { id: "low", label: "Low" },
                  { id: "audio_only", label: "Audio" },
                ] as const
              ).map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => props.onSetVideoQuality(q.id)}
                  className={`rounded-[4px] py-1 text-[11px] font-semibold ${
                    props.videoQuality === q.id
                      ? "bg-[#246FE5] text-white"
                      : "bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <hr className="my-1 border-[#292929]" />

          <MenuItem
            icon={props.fullscreen ? Minimize2 : Maximize2}
            label={props.fullscreen ? "Exit full screen" : "View full screen"}
            onClick={() => {
              props.onToggleFullscreen();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={PictureInPicture2}
            label="Picture-in-picture"
            onClick={() => {
              props.onTogglePip();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={Lock}
            label="Security options"
            onClick={() => {
              props.onOpenSecurity();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={Captions}
            label={props.captionsOn ? "Turn off closed captions" : "Turn on closed captions"}
            active={props.captionsOn}
            onClick={() => {
              props.onToggleCaptions();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={props.recording ? Square : Circle}
            label={props.recording ? "Stop recording" : "Start recording (local)"}
            active={props.recording}
            onClick={() => {
              props.onToggleRecord();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={PlaySquare}
            label="Share a video"
            onClick={() => {
              props.onOpenSharedVideo();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={PenTool}
            label="Whiteboard"
            onClick={() => {
              props.onOpenWhiteboard();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={Sparkles}
            label="Select background"
            onClick={() => {
              props.onOpenSettings("vb");
              setPopover(null);
            }}
          />
          <MenuItem
            icon={BarChart3}
            label="Speaker stats"
            onClick={() => {
              props.onOpenStats();
              setPopover(null);
            }}
          />
          <MenuItem
            icon={Share2}
            label="Invite & Embed API"
            onClick={() => {
              props.onOpenInvite();
              setPopover(null);
            }}
          />
          {props.isModerator ? (
            <MenuItem
              icon={VolumeX}
              label="Mute everyone"
              onClick={() => {
                props.onMuteEveryone();
                setPopover(null);
              }}
            />
          ) : null}

          <hr className="my-1 border-[#292929]" />

          <MenuItem
            icon={Settings}
            label="Settings"
            onClick={() => {
              props.onOpenSettings("audio");
              setPopover(null);
            }}
          />
          <MenuItem
            icon={HelpCircle}
            label="View shortcuts"
            onClick={() => {
              props.onOpenSettings("shortcuts");
              setPopover(null);
            }}
          />
        </div>
      ) : null}

      {/* Moderator Leave / End Meeting Menu */}
      {popover === "hangup" ? (
        <div className="pointer-events-auto absolute bottom-15 w-52 rounded-[6px] border border-[#3D3D3D] bg-[#141414] p-1.5 text-xs text-white shadow-2xl space-y-1">
          <button
            type="button"
            onClick={() => {
              setPopover(null);
              props.onEndConference();
            }}
            className="w-full rounded-[4px] bg-[#CB2233] px-3 py-2 text-left font-semibold text-white hover:bg-[#E04757]"
          >
            End meeting for all
          </button>
          <button
            type="button"
            onClick={() => {
              setPopover(null);
              props.onLeave();
            }}
            className="w-full rounded-[4px] bg-[#292929] px-3 py-2 text-left font-medium text-white hover:bg-[#3D3D3D]"
          >
            Leave meeting
          </button>
        </div>
      ) : null}

      {/* Main Jitsi Compact Floating Toolbox */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-[6px] border border-[#292929] bg-[#141414] px-2.5 py-1.5 shadow-2xl">
        {/* Mic + device popover chevron */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={props.onToggleAudio}
            aria-label={props.audioMuted ? "Unmute" : "Mute"}
            title={props.audioMuted ? "Unmute (M)" : "Mute (M)"}
            className={`flex h-10 w-10 items-center justify-center rounded-l-[6px] transition ${
              props.audioMuted ? "bg-[#E0E0E0] text-[#141414]" : "bg-[#292929] text-white hover:bg-[#3D3D3D]"
            }`}
          >
            {props.audioMuted ? <MicOff className="h-[18px] w-[18px]" /> : <Mic className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => toggle("audio")}
            aria-label="Audio settings menu"
            className="flex h-10 w-5 items-center justify-center rounded-r-[6px] border-l border-[#3D3D3D] bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D] hover:text-white"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Camera + device popover chevron */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={props.onToggleVideo}
            aria-label={props.videoMuted ? "Start camera" : "Stop camera"}
            title={props.videoMuted ? "Start camera (V)" : "Stop camera (V)"}
            className={`flex h-10 w-10 items-center justify-center rounded-l-[6px] transition ${
              props.videoMuted ? "bg-[#E0E0E0] text-[#141414]" : "bg-[#292929] text-white hover:bg-[#3D3D3D]"
            }`}
          >
            {props.videoMuted ? <VideoOff className="h-[18px] w-[18px]" /> : <Video className="h-[18px] w-[18px]" />}
          </button>
          <button
            type="button"
            onClick={() => toggle("video")}
            aria-label="Video settings menu"
            className="flex h-10 w-5 items-center justify-center rounded-r-[6px] border-l border-[#3D3D3D] bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D] hover:text-white"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>

        <DockBtn active={props.screenSharing} label="Share screen" onClick={props.onToggleScreen}>
          <MonitorUp className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn active={props.chatOpen} label="Chat" badge={props.unreadChat} onClick={() => props.onToggleChat("chat")}>
          <MessageSquare className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn active={props.handRaised} warning={props.handRaised} label="Raise hand" onClick={props.onToggleHand}>
          <Hand className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn active={popover === "reactions"} label="Reactions" onClick={() => toggle("reactions")}>
          <Smile className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn
          active={props.participantsOpen}
          label="Participants"
          badge={props.lobbyCount > 0 ? props.lobbyCount : undefined}
          count={props.participantCount}
          onClick={props.onToggleParticipants}
        >
          <Users className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn active={props.tileView} label={props.tileView ? "Speaker view" : "Tile view"} onClick={props.onToggleTileView}>
          <Grid2x2 className="h-[18px] w-[18px]" />
        </DockBtn>

        <DockBtn active={popover === "overflow"} label="More actions" onClick={() => toggle("overflow")}>
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </DockBtn>

        {/* Jitsi Hangup Button */}
        <button
          type="button"
          onClick={() => (props.isModerator ? toggle("hangup") : props.onLeave())}
          aria-label="Leave meeting"
          title="Leave meeting"
          className="ml-1 flex h-10 w-14 items-center justify-center rounded-[6px] bg-[#CB2233] text-white transition hover:bg-[#E04757]"
        >
          <PhoneOff className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}

function DockBtn({
  active,
  warning = false,
  label,
  badge,
  count,
  onClick,
  children,
}: {
  active: boolean;
  warning?: boolean;
  label: string;
  badge?: number;
  count?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex h-10 min-w-10 items-center justify-center gap-1 rounded-[6px] px-2.5 text-xs font-medium transition ${
        warning
          ? "bg-[#F8AE1A] text-[#040404]"
          : active
            ? "bg-[#246FE5] text-white"
            : "bg-[#292929] text-white hover:bg-[#3D3D3D]"
      }`}
    >
      {children}
      {typeof count === "number" ? <span className="tabular-nums text-[11px]">{count}</span> : null}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#246FE5] px-1 text-[10px] font-bold text-white ring-2 ring-[#141414]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function MenuItem({
  icon: Icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition ${
        active ? "bg-[#246FE5]/25 text-[#4687ED]" : "text-white hover:bg-[#292929]"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-[#C2C2C2]" />
      <span className="truncate">{label}</span>
    </button>
  );
}
