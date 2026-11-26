import { useState } from "react";
import {
  BarChart3,
  Circle,
  Grid2x2,
  Hand,
  LayoutPanelLeft,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  PenTool,
  PhoneOff,
  Share2,
  Shield,
  Smile,
  Sparkles,
  Square,
  Users,
  Video,
  VideoOff,
} from "lucide-react";

export type PanelTab = "chat" | "polls" | "participants" | "breakouts" | "stats" | null;

interface ControlDockProps {
  audioMuted: boolean;
  videoMuted: boolean;
  screenSharing: boolean;
  handRaised: boolean;
  tileView: boolean;
  blurEnabled: boolean;
  recording: boolean;
  activePanel: PanelTab;
  unreadChat: number;
  lobbyCount: number;
  participantCount: number;
  isModerator: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreen: () => void;
  onToggleHand: () => void;
  onToggleTileView: () => void;
  onToggleBlur: () => void;
  onToggleRecord: () => void;
  onSelectPanel: (tab: PanelTab) => void;
  onOpenWhiteboard: () => void;
  onOpenSecurity: () => void;
  onOpenInvite: () => void;
  onSendReaction: (emoji: string) => void;
  onLeave: () => void;
}

const REACTIONS = ["👍", "👏", "❤️", "🎉", "😂", "🔥"];

export function ControlDock({
  audioMuted,
  videoMuted,
  screenSharing,
  handRaised,
  tileView,
  blurEnabled,
  recording,
  activePanel,
  unreadChat,
  lobbyCount,
  participantCount,
  isModerator,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onToggleHand,
  onToggleTileView,
  onToggleBlur,
  onToggleRecord,
  onSelectPanel,
  onOpenWhiteboard,
  onOpenSecurity,
  onOpenInvite,
  onSendReaction,
  onLeave,
}: ControlDockProps) {
  const [reactOpen, setReactOpen] = useState(false);

  const toggleTab = (tab: Exclude<PanelTab, null>) => {
    onSelectPanel(activePanel === tab ? null : tab);
  };

  return (
    <div className="relative z-30 flex items-center justify-center px-3 pb-3 sm:pb-4">
      {reactOpen ? (
        <div className="absolute -top-14 flex items-center gap-1 rounded-full border border-white/15 bg-[#121826]/95 px-2.5 py-1.5 shadow-xl backdrop-blur">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSendReaction(emoji);
                setReactOpen(false);
              }}
              className="rounded-full p-1.5 text-lg transition hover:scale-125 hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[#121826]/90 px-3 py-2 shadow-2xl backdrop-blur-xl sm:gap-2">
        <DockBtn
          active={audioMuted}
          danger={audioMuted}
          label={audioMuted ? "Unmute" : "Mute"}
          onClick={onToggleAudio}
        >
          {audioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </DockBtn>

        <DockBtn
          active={videoMuted}
          danger={videoMuted}
          label={videoMuted ? "Start camera" : "Stop camera"}
          onClick={onToggleVideo}
        >
          {videoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </DockBtn>

        <DockBtn active={screenSharing} label="Share screen" onClick={onToggleScreen}>
          <MonitorUp className="h-4 w-4" />
        </DockBtn>

        <div className="mx-0.5 hidden h-6 w-px bg-white/10 sm:block" />

        <DockBtn active={activePanel === "chat"} label="Chat" badge={unreadChat} onClick={() => toggleTab("chat")}>
          <MessageSquare className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={activePanel === "polls"} label="Polls" onClick={() => toggleTab("polls")}>
          <BarChart3 className="h-4 w-4" />
        </DockBtn>

        <DockBtn
          active={activePanel === "participants"}
          label="Participants"
          badge={lobbyCount > 0 ? lobbyCount : undefined}
          count={participantCount}
          onClick={() => toggleTab("participants")}
        >
          <Users className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={handRaised} label="Raise hand" onClick={onToggleHand}>
          <Hand className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={reactOpen} label="Reactions" onClick={() => setReactOpen((v) => !v)}>
          <Smile className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={false} label="Whiteboard" onClick={onOpenWhiteboard}>
          <PenTool className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={activePanel === "breakouts"} label="Breakout rooms" onClick={() => toggleTab("breakouts")}>
          <LayoutPanelLeft className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={tileView} label={tileView ? "Speaker view" : "Tile view"} onClick={onToggleTileView}>
          <Grid2x2 className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={blurEnabled} label="Background blur" onClick={onToggleBlur}>
          <Sparkles className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={recording} danger={recording} label={recording ? "Stop recording" : "Record locally"} onClick={onToggleRecord}>
          {recording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Circle className="h-4 w-4" />}
        </DockBtn>

        <DockBtn active={false} label="Security & E2EE" onClick={onOpenSecurity}>
          <Shield className="h-4 w-4" />
        </DockBtn>

        <DockBtn active={false} label="Invite & Embed" onClick={onOpenInvite}>
          <Share2 className="h-4 w-4" />
        </DockBtn>

        <button
          type="button"
          onClick={onLeave}
          aria-label="Leave meeting"
          className="ml-1 flex h-10 items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 text-xs font-semibold text-white transition hover:bg-rose-500"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}

function DockBtn({
  active,
  danger = false,
  label,
  badge,
  count,
  onClick,
  children,
}: {
  active: boolean;
  danger?: boolean;
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
      className={`relative flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition ${
        danger
          ? "bg-rose-600 text-white hover:bg-rose-500"
          : active
            ? "bg-blue-600 text-white"
            : "bg-white/5 text-slate-200 hover:bg-white/10"
      }`}
    >
      {children}
      {typeof count === "number" ? <span className="tabular-nums text-[11px]">{count}</span> : null}
      {badge && badge > 0 ? (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-slate-950">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
