import { useState } from "react";
import { Hand, Lock, ShieldCheck, Users } from "lucide-react";
import type { ConnectionStats, FollowMeState, RoomSecurityState, VideoQualityMode } from "~/lib/rtc";

interface ConferenceHeaderProps {
  roomName: string;
  security: RoomSecurityState;
  elapsedSeconds: number;
  participantCount: number;
  raisedHandCount: number;
  recording: boolean;
  stats: ConnectionStats;
  videoQuality: VideoQualityMode;
  followMe: FollowMeState | null;
  onOpenSecurity: () => void;
  onOpenParticipants: () => void;
}

function formatDuration(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ConferenceHeader({
  roomName,
  security,
  elapsedSeconds,
  participantCount,
  raisedHandCount,
  recording,
  stats,
  videoQuality,
  followMe,
  onOpenSecurity,
  onOpenParticipants,
}: ConferenceHeaderProps) {
  const [statsOpen, setStatsOpen] = useState(false);

  const barColor =
    stats.quality === "good" ? "bg-[#189B55]" : stats.quality === "fair" ? "bg-[#F8AE1A]" : "bg-[#CB2233]";
  const iceConnected = stats.iceState === "connected" || stats.iceState === "completed";

  return (
    <header className="pointer-events-none absolute inset-x-0 top-3 z-20 flex items-start justify-between px-4">
      <div className="pointer-events-auto hidden items-center opacity-85 sm:flex">
        <img src="/brand-assets/logo_dark.svg" alt="Nova" className="h-7 w-auto" />
      </div>

      {/* Centered Jitsi ConferenceInfo Bar */}
      <div className="pointer-events-auto relative mx-auto flex flex-wrap items-center justify-center gap-1 rounded-[6px] bg-[#141414]/85 p-1 text-xs shadow-lg backdrop-blur-md">
        <div className="flex h-7 max-w-[260px] items-center rounded-[4px] bg-[#292929]/90 px-3 font-medium text-white">
          <span className="truncate">{security.subject || roomName}</span>
        </div>

        <div className="flex h-7 items-center rounded-[4px] bg-[#292929]/90 px-2.5 font-medium text-[#C2C2C2] tabular-nums">
          {formatDuration(elapsedSeconds)}
        </div>

        <button
          type="button"
          onClick={onOpenParticipants}
          className="flex h-7 items-center gap-1.5 rounded-[4px] bg-[#292929]/90 px-2.5 font-medium text-white transition hover:bg-[#3D3D3D]"
          title="Participants"
        >
          <Users className="h-3.5 w-3.5 text-[#C2C2C2]" />
          <span className="tabular-nums">{participantCount}</span>
        </button>

        {security.locked ? (
          <button
            type="button"
            onClick={onOpenSecurity}
            title="Room is password protected"
            className="flex h-7 items-center gap-1 rounded-[4px] bg-[#F8AE1A]/20 px-2 font-semibold text-[#F8AE1A]"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {security.e2ee_enabled ? (
          <button
            type="button"
            onClick={onOpenSecurity}
            className="flex h-7 items-center gap-1 rounded-[4px] bg-[#189B55] px-2 font-semibold text-white"
            title="End-to-End Encryption enabled"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>E2EE</span>
          </button>
        ) : null}

        {recording ? (
          <div className="flex h-7 items-center gap-1.5 rounded-[4px] bg-[#CB2233] px-2 font-semibold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            <span>REC</span>
          </div>
        ) : null}

        {raisedHandCount > 0 ? (
          <div className="flex h-7 items-center gap-1 rounded-[4px] bg-[#F8AE1A] px-2 font-semibold text-[#040404]">
            <Hand className="h-3.5 w-3.5" />
            <span className="tabular-nums">{raisedHandCount}</span>
          </div>
        ) : null}

        {followMe?.enabled ? (
          <div className="flex h-7 items-center rounded-[4px] bg-[#246FE5] px-2 font-semibold text-white">
            Follow-Me
          </div>
        ) : null}

        <div className="flex h-7 items-center rounded-[4px] bg-[#292929]/90 px-2 text-[11px] font-semibold text-[#C2C2C2] uppercase">
          {videoQuality === "audio_only" ? "AO" : videoQuality}
        </div>

        {/* Connection Quality & Stats Popover Trigger */}
        <button
          type="button"
          data-testid="ice-status"
          onClick={() => setStatsOpen((s) => !s)}
          className="flex h-7 items-center gap-1.5 rounded-[4px] bg-[#292929]/90 px-2.5 text-[11px] font-medium text-[#C2C2C2] transition hover:bg-[#3D3D3D]"
          title="Connection statistics"
        >
          <span className="flex items-end gap-0.5">
            <span className={`w-1 rounded-xs ${iceConnected ? barColor : "bg-[#666666]"} h-1.5`} />
            <span className={`w-1 rounded-xs ${iceConnected && stats.quality !== "poor" ? barColor : "bg-[#666666]"} h-2.5`} />
            <span className={`w-1 rounded-xs ${iceConnected && stats.quality === "good" ? barColor : "bg-[#666666]"} h-3.5`} />
          </span>
          <span className="hidden md:inline">ICE: {stats.iceState}</span>
        </button>

        {statsOpen ? (
          <div className="absolute top-10 right-0 z-40 w-60 rounded-[6px] border border-[#3D3D3D] bg-[#141414] p-3 text-xs text-white shadow-2xl">
            <div className="mb-2 flex items-center justify-between border-b border-[#292929] pb-1.5">
              <span className="font-semibold">Connection stats</span>
              <span className="capitalize text-[#C2C2C2]">{stats.quality}</span>
            </div>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-[#A3A3A3]">ICE</dt>
                <dd className="font-mono text-white">{stats.iceState}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A3A3A3]">Round-trip time</dt>
                <dd className="font-mono text-white">{stats.rttMs !== null ? `${stats.rttMs} ms` : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A3A3A3]">Packet loss</dt>
                <dd className="font-mono text-white">
                  {stats.packetLossPct !== null ? `${stats.packetLossPct}%` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A3A3A3]">Outbound bitrate</dt>
                <dd className="font-mono text-white">
                  {stats.bitrateKbps !== null ? `${stats.bitrateKbps} kbps` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[#A3A3A3]">Video resolution</dt>
                <dd className="font-mono text-white">{stats.resolution || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}
      </div>

      <div className="hidden w-24 sm:block" />
    </header>
  );
}
