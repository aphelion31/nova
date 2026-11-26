import { useState } from "react";
import {
  BarChart3,
  Captions,
  Download,
  FileUp,
  MessageSquare,
  Paperclip,
  Plus,
  Reply,
  Send,
  X,
} from "lucide-react";
import { api, type SharedFileMeta } from "~/lib/api";
import type { ChatMessage, Participant, Poll, SubtitleEntry } from "~/lib/rtc";

export type ChatTab = "chat" | "polls" | "cc" | "files";

interface ChatDrawerProps {
  roomName: string;
  activeTab: ChatTab;
  selfId: string | null;
  selfName: string;
  participants: Participant[];
  messages: ChatMessage[];
  polls: Poll[];
  subtitles: SubtitleEntry[];
  files: SharedFileMeta[];
  captionsOn: boolean;
  dmTarget: string;
  onSelectDmTarget: (id: string) => void;
  onSelectTab: (tab: ChatTab) => void;
  onClose: () => void;
  onSendChat: (body: string, recipientId: string | null, replyToId: string | null) => void;
  onCreatePoll: (question: string, options: string[]) => void;
  onVotePoll: (pollId: string, optionIndex: number) => void;
  onToggleCaptions: () => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function ChatDrawer(props: ChatDrawerProps) {
  const [chatText, setChatText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["Yes", "No"]);
  const [uploading, setUploading] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);

  const submitChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    props.onSendChat(chatText.trim(), props.dmTarget || null, replyTo?.id ?? null);
    setChatText("");
    setReplyTo(null);
  };

  const submitPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pollOpts.map((o) => o.trim()).filter(Boolean);
    if (!pollQ.trim() || cleaned.length < 2) return;
    props.onCreatePoll(pollQ.trim(), cleaned);
    setPollQ("");
    setPollOpts(["Yes", "No"]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFileErr("Max file size is 5 MiB.");
      return;
    }
    setFileErr(null);
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const result = typeof reader.result === "string" ? reader.result : "";
        await api.uploadRoomFile(props.roomName, {
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          data_base64: result,
          sender_name: props.selfName,
        });
      } catch (err) {
        setFileErr(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const downloadTranscript = () => {
    const lines = props.subtitles.map(
      (s) => `[${new Date(s.created_at * 1000).toISOString()}] ${s.display_name}: ${s.text}`,
    );
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-captions-${props.roomName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="z-20 flex h-full w-full shrink-0 flex-col border-r border-[#292929] bg-[#141414] text-white sm:w-84">
      <div className="flex items-center justify-between border-b border-[#292929] px-4 py-3">
        <h2 className="text-sm font-semibold">Chat &amp; Collaboration</h2>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close chat panel"
          className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Jitsi 4-tab header */}
      <div className="grid grid-cols-4 border-b border-[#292929] bg-[#141414] px-2 pt-2 text-[11px] font-medium">
        {(
          [
            { id: "chat", label: "Chat", icon: MessageSquare },
            { id: "polls", label: "Polls", icon: BarChart3 },
            { id: "cc", label: "CC", icon: Captions },
            { id: "files", label: `Files`, icon: Paperclip },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => props.onSelectTab(t.id)}
            className={`flex items-center justify-center gap-1 border-b-2 pb-2 transition ${
              props.activeTab === t.id
                ? "border-[#4687ED] text-white"
                : "border-transparent text-[#A3A3A3] hover:text-white"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {props.activeTab === "chat" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-2.5 overflow-y-auto p-3.5 jitsi-scroll">
            {props.messages.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A3A3A3]">No messages yet.</p>
            ) : (
              props.messages.map((m) => (
                <div key={m.id} className="group rounded-[6px] bg-[#292929] px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold text-[#4687ED]">
                      {m.sender_name}
                      {m.sender_id === props.selfId ? " (You)" : ""}
                    </span>
                    <div className="flex items-center gap-1.5 text-[#A3A3A3]">
                      {m.recipient_id ? (
                        <span className="rounded bg-[#F8AE1A]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#F8AE1A]">
                          Private
                        </span>
                      ) : null}
                      <span>{formatTime(m.created_at)}</span>
                      <button
                        type="button"
                        onClick={() => setReplyTo(m)}
                        aria-label={`Reply to ${m.sender_name}`}
                        className="hidden rounded p-0.5 hover:bg-[#3D3D3D] hover:text-white group-hover:inline-flex"
                      >
                        <Reply className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {m.reply_to_body ? (
                    <div className="mt-1 rounded-[4px] border-l-2 border-[#4687ED] bg-[#141414]/60 px-2 py-1 text-[11px] text-[#C2C2C2]">
                      <span className="font-semibold">{m.reply_to_sender}: </span>
                      <span className="line-clamp-1">{m.reply_to_body}</span>
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs leading-relaxed text-white break-words">{m.body}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={submitChat} className="space-y-2 border-t border-[#292929] p-3">
            {replyTo ? (
              <div className="flex items-center justify-between rounded-[4px] bg-[#292929] px-2.5 py-1.5 text-[11px] text-[#C2C2C2]">
                <span className="truncate">Replying to {replyTo.sender_name}: {replyTo.body}</span>
                <button type="button" onClick={() => setReplyTo(null)} className="ml-2 text-[#A3A3A3] hover:text-white">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}

            <select
              value={props.dmTarget}
              onChange={(e) => props.onSelectDmTarget(e.target.value)}
              className="h-8 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-2.5 text-xs text-[#C2C2C2] outline-none"
            >
              <option value="">To: Everyone in meeting</option>
              {props.participants
                .filter((p) => p.id !== props.selfId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Private message to {p.display_name}
                  </option>
                ))}
            </select>

            <div className="flex gap-1 text-sm">
              {["👍", "❤️", "😂", "👏", "🎉"].map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setChatText((t) => `${t}${em}`)}
                  className="rounded px-1.5 py-0.5 hover:bg-[#292929]"
                >
                  {em}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type a message..."
                className="h-9 flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-xs text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#246FE5] text-white hover:bg-[#4687ED]"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {props.activeTab === "polls" ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-3.5 jitsi-scroll">
          <form onSubmit={submitPoll} className="space-y-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929] p-3">
            <p className="text-xs font-semibold text-white">Create a poll</p>
            <input
              type="text"
              value={pollQ}
              onChange={(e) => setPollQ(e.target.value)}
              placeholder="Ask a question..."
              className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#141414] px-3 py-1.5 text-xs text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
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
                className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#141414] px-3 py-1.5 text-xs text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
              />
            ))}
            <div className="flex justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPollOpts((o) => [...o, ""])}
                className="inline-flex items-center gap-1 rounded-[6px] bg-[#3D3D3D] px-2.5 py-1.5 text-xs text-white hover:bg-[#525252]"
              >
                <Plus className="h-3.5 w-3.5" /> Add option
              </button>
              <button
                type="submit"
                className="rounded-[6px] bg-[#246FE5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4687ED]"
              >
                Create poll
              </button>
            </div>
          </form>

          {props.polls.map((poll) => {
            const totalVotes = poll.options.reduce((acc, o) => acc + o.voters.length, 0);
            return (
              <div key={poll.id} className="space-y-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929] p-3">
                <p className="text-xs font-semibold text-white">{poll.question}</p>
                <p className="text-[11px] text-[#A3A3A3]">by {poll.creator_name}</p>
                <div className="space-y-1.5">
                  {poll.options.map((opt, idx) => {
                    const voted = props.selfId ? opt.voters.includes(props.selfId) : false;
                    const pct = totalVotes > 0 ? Math.round((opt.voters.length / totalVotes) * 100) : 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => props.onVotePoll(poll.id, idx)}
                        className={`relative w-full overflow-hidden rounded-[6px] border px-3 py-2 text-left text-xs transition ${
                          voted ? "border-[#4687ED] bg-[#246FE5]/20" : "border-[#3D3D3D] bg-[#141414] hover:bg-[#1e1e1e]"
                        }`}
                      >
                        <div className="absolute inset-y-0 left-0 bg-[#246FE5]/25" style={{ width: `${pct}%` }} />
                        <div className="relative flex items-center justify-between gap-2">
                          <span>{opt.text}</span>
                          <span className="tabular-nums text-[#C2C2C2]">
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

      {props.activeTab === "cc" ? (
        <div className="flex min-h-0 flex-1 flex-col p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={props.onToggleCaptions}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold ${
                props.captionsOn ? "bg-[#CB2233] text-white" : "bg-[#246FE5] text-white hover:bg-[#4687ED]"
              }`}
            >
              {props.captionsOn ? "Stop Closed Captions" : "Start Closed Captions"}
            </button>
            <button
              type="button"
              onClick={downloadTranscript}
              disabled={props.subtitles.length === 0}
              className="inline-flex items-center gap-1 rounded-[6px] bg-[#292929] px-2.5 py-1.5 text-xs text-white hover:bg-[#3D3D3D] disabled:opacity-40"
            >
              <Download className="h-3.5 w-3.5" /> .txt
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto jitsi-scroll">
            {props.subtitles.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A3A3A3]">
                Enable closed captions to transcribe speech live across participants.
              </p>
            ) : (
              props.subtitles.map((entry) => (
                <div key={entry.id} className="rounded-[6px] bg-[#292929] px-3 py-2 text-xs">
                  <div className="flex justify-between text-[11px] text-[#A3A3A3]">
                    <span className="font-semibold text-[#4687ED]">{entry.display_name}</span>
                    <span>{formatTime(entry.created_at)}</span>
                  </div>
                  <p className="mt-0.5 text-white">{entry.text}</p>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {props.activeTab === "files" ? (
        <div className="flex min-h-0 flex-1 flex-col p-3.5">
          <label className="mb-3 flex cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-dashed border-[#4687ED] bg-[#292929] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#3D3D3D]">
            <FileUp className="h-4 w-4 text-[#4687ED]" />
            <span>{uploading ? "Uploading…" : "Share file (max 5 MiB)"}</span>
            <input type="file" onChange={handleFileChange} disabled={uploading} className="hidden" />
          </label>
          {fileErr ? <p className="mb-2 text-xs text-[#F24D5F]">{fileErr}</p> : null}

          <div className="flex-1 space-y-2 overflow-y-auto jitsi-scroll">
            {props.files.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#A3A3A3]">No files shared yet.</p>
            ) : (
              props.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-[6px] bg-[#292929] px-3 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{f.filename}</p>
                    <p className="text-[11px] text-[#A3A3A3]">
                      {f.sender_name} · {formatBytes(f.size_bytes)}
                    </p>
                  </div>
                  <a
                    href={api.roomFileDownloadUrl(props.roomName, f.id)}
                    download={f.filename}
                    className="inline-flex shrink-0 items-center gap-1 rounded-[4px] bg-[#246FE5] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#4687ED]"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
