import { useState } from "react";
import { Check, Crown, MessageSquare, Mic, MicOff, Search, UserMinus, UserPlus, VideoOff, X } from "lucide-react";
import type { BreakoutRoom, LobbyEntry, Participant } from "~/lib/rtc";

interface ParticipantsDrawerProps {
  selfId: string | null;
  isModerator: boolean;
  followMeEnabled: boolean;
  participants: Participant[];
  lobby: LobbyEntry[];
  breakouts: BreakoutRoom[];
  onClose: () => void;
  onOpenInvite: () => void;
  onLobbyDecision: (peerId: string, admit: boolean) => void;
  onModerate: (targetId: string, action: "mute_audio" | "mute_video" | "kick" | "grant_moderator") => void;
  onDmPeer: (peerId: string) => void;
  onCreateBreakout: (name: string) => void;
  onMoveBreakout: (breakoutId: string | null) => void;
  onMuteEveryone: () => void;
  onToggleFollowMe: (enabled: boolean) => void;
}

export function ParticipantsDrawer(props: ParticipantsDrawerProps) {
  const [search, setSearch] = useState("");
  const [breakoutName, setBreakoutName] = useState("");

  const selfBreakout = props.participants.find((p) => p.id === props.selfId)?.breakout_id ?? null;
  const filtered = props.participants.filter((p) =>
    p.display_name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const submitBreakout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakoutName.trim()) return;
    props.onCreateBreakout(breakoutName.trim());
    setBreakoutName("");
  };

  return (
    <aside className="z-20 flex h-full w-full shrink-0 flex-col border-l border-[#292929] bg-[#141414] text-white sm:w-80">
      <div className="flex items-center justify-between border-b border-[#292929] px-4 py-3">
        <h2 className="text-sm font-semibold">Participants ({props.participants.length})</h2>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close participants pane"
          className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 border-b border-[#292929] p-3.5">
        <button
          type="button"
          onClick={props.onOpenInvite}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-[#246FE5] text-xs font-semibold text-white hover:bg-[#4687ED]"
        >
          <UserPlus className="h-4 w-4" /> Invite Someone
        </button>

        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#A3A3A3]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search participants..."
            className="h-8 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] pr-3 pl-8 text-xs text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
          />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3.5 jitsi-scroll">
        {props.isModerator && props.lobby.length > 0 ? (
          <div className="space-y-2 rounded-[6px] border border-[#F8AE1A]/40 bg-[#F8AE1A]/10 p-3">
            <p className="text-xs font-semibold text-[#F8AE1A]">Waiting in lobby ({props.lobby.length})</p>
            {props.lobby.map((entry) => (
              <div key={entry.peer_id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-medium">{entry.display_name}</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => props.onLobbyDecision(entry.peer_id, true)}
                    className="rounded-[4px] bg-[#189B55] px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Admit
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onLobbyDecision(entry.peer_id, false)}
                    className="rounded-[4px] bg-[#CB2233] px-2 py-1 text-[11px] font-semibold text-white"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-1.5">
          {filtered.map((p) => (
            <div key={p.id} className="group flex items-center justify-between gap-2 rounded-[6px] bg-[#292929] px-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#4687ED]/25 text-xs font-semibold text-white">
                  {p.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-xs font-semibold">
                    {p.is_moderator ? <Crown className="h-3.5 w-3.5 shrink-0 text-[#F8AE1A]" /> : null}
                    <span className="truncate">
                      {p.display_name}
                      {p.id === props.selfId ? " (You)" : ""}
                    </span>
                  </p>
                  <p className="text-[11px] text-[#A3A3A3]">
                    {p.breakout_id
                      ? `Breakout: ${props.breakouts.find((b) => b.id === p.breakout_id)?.name ?? p.breakout_id}`
                      : "Main room"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {p.audio_muted ? (
                  <MicOff className="h-3.5 w-3.5 text-[#F24D5F]" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-[#1EC26A]" />
                )}
                {p.id !== props.selfId ? (
                  <button
                    type="button"
                    title="Private message"
                    onClick={() => props.onDmPeer(p.id)}
                    className="hidden rounded p-1 text-[#C2C2C2] hover:bg-[#3D3D3D] group-hover:inline-flex"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                {props.isModerator && p.id !== props.selfId ? (
                  <div className="hidden items-center gap-0.5 group-hover:flex">
                    <button
                      type="button"
                      title="Mute audio"
                      onClick={() => props.onModerate(p.id, "mute_audio")}
                      className="rounded p-1 text-[#C2C2C2] hover:bg-[#3D3D3D]"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Stop video"
                      onClick={() => props.onModerate(p.id, "mute_video")}
                      className="rounded p-1 text-[#C2C2C2] hover:bg-[#3D3D3D]"
                    >
                      <VideoOff className="h-3.5 w-3.5" />
                    </button>
                    {!p.is_moderator ? (
                      <button
                        type="button"
                        title="Grant moderator"
                        onClick={() => props.onModerate(p.id, "grant_moderator")}
                        className="rounded p-1 text-[#F8AE1A] hover:bg-[#3D3D3D]"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Kick"
                      onClick={() => props.onModerate(p.id, "kick")}
                      className="rounded p-1 text-[#F24D5F] hover:bg-[#CB2233]/25"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {/* Integrated Jitsi-style Breakout Rooms section */}
        <div className="space-y-2 border-t border-[#292929] pt-3">
          <p className="text-xs font-semibold text-[#C2C2C2]">Breakout rooms</p>
          {props.isModerator ? (
            <form onSubmit={submitBreakout} className="flex gap-1.5">
              <input
                type="text"
                value={breakoutName}
                onChange={(e) => setBreakoutName(e.target.value)}
                placeholder="New breakout room..."
                className="h-8 flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-2.5 text-xs text-white outline-none focus:border-[#4687ED]"
              />
              <button
                type="submit"
                className="rounded-[6px] bg-[#246FE5] px-2.5 text-xs font-semibold text-white hover:bg-[#4687ED]"
              >
                Create
              </button>
            </form>
          ) : null}

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => props.onMoveBreakout(null)}
              className={`flex w-full items-center justify-between rounded-[6px] border px-3 py-2 text-xs font-medium ${
                selfBreakout === null
                  ? "border-[#4687ED] bg-[#246FE5]/20 text-white"
                  : "border-[#3D3D3D] bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
              }`}
            >
              <span>Main Room</span>
              <span className="tabular-nums">{props.participants.filter((p) => !p.breakout_id).length} peers</span>
            </button>

            {props.breakouts.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => props.onMoveBreakout(b.id)}
                className={`flex w-full items-center justify-between rounded-[6px] border px-3 py-2 text-xs font-medium ${
                  selfBreakout === b.id
                    ? "border-[#4687ED] bg-[#246FE5]/20 text-white"
                    : "border-[#3D3D3D] bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
                }`}
              >
                <span>{b.name}</span>
                <span className="tabular-nums">{props.participants.filter((p) => p.breakout_id === b.id).length} peers</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {props.isModerator ? (
        <div className="flex items-center gap-2 border-t border-[#292929] p-3">
          <button
            type="button"
            onClick={props.onMuteEveryone}
            className="flex-1 rounded-[6px] bg-[#292929] py-2 text-xs font-semibold text-white hover:bg-[#3D3D3D]"
          >
            Mute everyone
          </button>
          <button
            type="button"
            onClick={() => props.onToggleFollowMe(!props.followMeEnabled)}
            className={`rounded-[6px] px-3 py-2 text-xs font-semibold ${
              props.followMeEnabled ? "bg-[#246FE5] text-white" : "bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
            }`}
          >
            Follow-Me
          </button>
        </div>
      ) : null}
    </aside>
  );
}
