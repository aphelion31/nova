import { useState } from "react";
import { Check, Crown, MicOff, Plus, Send, UserMinus, VideoOff, X } from "lucide-react";
import type { BreakoutRoom, ChatMessage, LobbyEntry, Participant, Poll } from "~/lib/rtc";
import type { PanelTab } from "./ControlDock";

interface SidePanelProps {
  tab: Exclude<PanelTab, null>;
  selfId: string | null;
  isModerator: boolean;
  participants: Participant[];
  lobby: LobbyEntry[];
  messages: ChatMessage[];
  polls: Poll[];
  breakouts: BreakoutRoom[];
  onClose: () => void;
  onSelectTab: (tab: Exclude<PanelTab, null>) => void;
  onSendChat: (body: string, recipientId: string | null) => void;
  onCreatePoll: (question: string, options: string[]) => void;
  onVotePoll: (pollId: string, optionIndex: number) => void;
  onLobbyDecision: (peerId: string, admit: boolean) => void;
  onModerate: (targetId: string, action: "mute_audio" | "mute_video" | "kick" | "grant_moderator") => void;
  onCreateBreakout: (name: string) => void;
  onMoveBreakout: (breakoutId: string | null) => void;
}

export function SidePanel({
  tab,
  selfId,
  isModerator,
  participants,
  lobby,
  messages,
  polls,
  breakouts,
  onClose,
  onSelectTab,
  onSendChat,
  onCreatePoll,
  onVotePoll,
  onLobbyDecision,
  onModerate,
  onCreateBreakout,
  onMoveBreakout,
}: SidePanelProps) {
  const [chatText, setChatText] = useState("");
  const [dmTarget, setDmTarget] = useState<string>("");
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["Yes", "No"]);
  const [breakoutName, setBreakoutName] = useState("");

  const selfBreakout = participants.find((p) => p.id === selfId)?.breakout_id ?? null;

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    onSendChat(chatText.trim(), dmTarget || null);
    setChatText("");
  };

  const submitPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pollOpts.map((o) => o.trim()).filter(Boolean);
    if (!pollQ.trim() || cleaned.length < 2) return;
    onCreatePoll(pollQ.trim(), cleaned);
    setPollQ("");
    setPollOpts(["Yes", "No"]);
  };

  const submitBreakout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!breakoutName.trim()) return;
    onCreateBreakout(breakoutName.trim());
    setBreakoutName("");
  };

  return (
    <aside className="flex h-full w-full flex-col border-l border-white/10 bg-[#121826] text-slate-100 sm:w-88">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex gap-1 text-xs font-medium">
          {(["chat", "polls", "participants", "breakouts", "stats"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onSelectTab(key)}
              className={`rounded-lg px-2 py-1 capitalize transition ${
                tab === key ? "bg-blue-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Close panel" className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {tab === "chat" ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-slate-500">No messages yet.</p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="rounded-xl bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-semibold text-blue-300">{m.sender_name}</span>
                    {m.recipient_id ? <span className="text-amber-300">DM</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-100 break-words">{m.body}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={submitChat} className="border-t border-white/10 p-3 space-y-2">
            <select
              value={dmTarget}
              onChange={(e) => setDmTarget(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-300 outline-none"
            >
              <option value="">To: Everyone in room</option>
              {participants
                .filter((p) => p.id !== selfId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    DM: {p.display_name}
                  </option>
                ))}
            </select>
            <div className="flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-500"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === "polls" ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <form onSubmit={submitPoll} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-slate-300">New Poll</p>
            <input
              type="text"
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
              placeholder="Ask a question..."
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
            />
            {pollOpts.map((opt, idx) => (
              <input
                key={idx}
                type="text"
                value={opt}
                onChange={(e) => {
                  const next = pollOpts.slice();
                  next[idx] = e.target.value;
                  setPollOpts(next);
                }}
                placeholder={`Option ${idx + 1}`}
                className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
              />
            ))}
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPollOpts((o) => [...o, ""])}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-slate-200 hover:bg-white/15"
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-500">
                Create poll
              </button>
            </div>
          </form>

          {polls.map((poll) => {
            const totalVotes = poll.options.reduce((acc, o) => acc + o.voters.length, 0);
            return (
              <div key={poll.id} className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold text-white">{poll.question}</p>
                <p className="text-[11px] text-slate-400">by {poll.creator_name}</p>
                <div className="space-y-1.5">
                  {poll.options.map((opt, idx) => {
                    const voted = selfId ? opt.voters.includes(selfId) : false;
                    const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onVotePoll(poll.id, idx)}
                        className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs transition ${
                          voted ? "border-blue-500 bg-blue-500/15" : "border-white/10 bg-slate-900/60 hover:bg-slate-900"
                        }`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-blue-500/20"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between gap-2">
                          <span>{opt.text}</span>
                          <span className="tabular-nums text-slate-300">
                            {opt.voters.length} ({pct}%)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "participants" ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isModerator && lobby.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3">
              <p className="text-xs font-semibold text-amber-300">Waiting in lobby ({lobby.length})</p>
              {lobby.map((entry) => (
                <div key={entry.peer_id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate font-medium">{entry.display_name}</span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLobbyDecision(entry.peer_id, true)}
                      className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-500"
                    >
                      Admit
                    </button>
                    <button
                      type="button"
                      onClick={() => onLobbyDecision(entry.peer_id, false)}
                      className="rounded bg-rose-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-rose-500"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="space-y-2">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-xs font-semibold">
                    {p.is_moderator ? <Crown className="h-3.5 w-3.5 text-amber-400" /> : null}
                    <span className="truncate">
                      {p.display_name}
                      {p.id === selfId ? " (You)" : ""}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {p.breakout_id ? `Breakout: ${breakouts.find((b) => b.id === p.breakout_id)?.name ?? p.breakout_id}` : "Main room"}
                  </p>
                </div>
                {isModerator && p.id !== selfId ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title="Mute audio"
                      onClick={() => onModerate(p.id, "mute_audio")}
                      className="rounded p-1.5 text-slate-300 hover:bg-white/10"
                    >
                      <MicOff className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Stop video"
                      onClick={() => onModerate(p.id, "mute_video")}
                      className="rounded p-1.5 text-slate-300 hover:bg-white/10"
                    >
                      <VideoOff className="h-3.5 w-3.5" />
                    </button>
                    {!p.is_moderator ? (
                      <button
                        type="button"
                        title="Grant moderator"
                        onClick={() => onModerate(p.id, "grant_moderator")}
                        className="rounded p-1.5 text-amber-300 hover:bg-white/10"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      title="Kick"
                      onClick={() => onModerate(p.id, "kick")}
                      className="rounded p-1.5 text-rose-400 hover:bg-rose-500/20"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "breakouts" ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {isModerator ? (
            <form onSubmit={submitBreakout} className="flex gap-2">
              <input
                type="text"
                value={breakoutName}
                onChange={(e) => setBreakoutName(e.target.value)}
                placeholder="New breakout room..."
                className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
              />
              <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                Create
              </button>
            </form>
          ) : null}

          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onMoveBreakout(null)}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                selfBreakout === null ? "border-blue-500 bg-blue-600/20 text-white" : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              <span>Main Room</span>
              <span>{participants.filter((p) => !p.breakout_id).length} peers</span>
            </button>

            {breakouts.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onMoveBreakout(b.id)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-semibold ${
                  selfBreakout === b.id ? "border-blue-500 bg-blue-600/20 text-white" : "border-white/10 bg-white/5 text-slate-300"
                }`}
              >
                <span>{b.name}</span>
                <span>{participants.filter((p) => p.breakout_id === b.id).length} peers</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "stats" ? (
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <p className="text-xs font-semibold text-slate-300">Speaker talk time</p>
          {participants.map((p) => {
            const secs = Math.round(p.speaking_ms / 1000);
            const maxMs = Math.max(1000, ...participants.map((x) => x.speaking_ms));
            const pct = Math.min(100, Math.round((p.speaking_ms / maxMs) * 100));
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{p.display_name}</span>
                  <span className="tabular-nums text-slate-400">{secs}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
}
