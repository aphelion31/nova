import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

export function InviteModal({ roomName, onClose }: { roomName: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${encodeURIComponent(roomName)}` : "";
  const embedSnippet =
    typeof window !== "undefined"
      ? `<script src="${window.location.origin}/external_api.js"></script>\n<script>\n  new JitsiMeetExternalAPI("${window.location.host}", { roomName: "${roomName}", parentNode: document.body });\n</script>`
      : "";

  const copy = (val: string) => {
    navigator.clipboard.writeText(val).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#121826] p-6 text-slate-100 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Invite & Embed API</h2>
          <button type="button" onClick={onClose} aria-label="Close invite modal" className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Direct meeting link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200"
            />
            <button
              type="button"
              onClick={() => copy(inviteUrl)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-400">Drop-in Jitsi External API embed</label>
          <pre className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950 p-3 text-[11px] text-sky-300">
            {embedSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
