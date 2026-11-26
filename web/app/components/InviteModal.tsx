import { useState } from "react";
import { Check, Copy, X } from "lucide-react";

export function InviteModal({ roomName, onClose }: { roomName: string; onClose: () => void }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/room/${encodeURIComponent(roomName)}` : "";
  const embedSnippet =
    typeof window !== "undefined"
      ? `<script src="${window.location.origin}/external_api.js"></script>\n<script>\n  new JitsiMeetExternalAPI("${window.location.host}", { roomName: "${roomName}", parentNode: document.body });\n</script>`
      : "";

  const copyText = (val: string, kind: "link" | "embed") => {
    navigator.clipboard.writeText(val).catch(() => undefined);
    if (kind === "link") {
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1800);
    } else {
      setCopiedEmbed(true);
      window.setTimeout(() => setCopiedEmbed(false), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg space-y-4 rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Invite more people</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close invite modal"
            className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#C2C2C2]">Share meeting link</label>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteUrl}
              className="flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={() => copyText(inviteUrl, "link")}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#246FE5] px-3 py-2 text-xs font-semibold text-white hover:bg-[#4687ED]"
            >
              {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedLink ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-[#C2C2C2]">Embed meeting (/external_api.js)</label>
            <button
              type="button"
              onClick={() => copyText(embedSnippet, "embed")}
              className="text-xs font-medium text-[#4687ED] hover:underline"
            >
              {copiedEmbed ? "Copied!" : "Copy snippet"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-[6px] border border-[#3D3D3D] bg-[#040404] p-3 text-[11px] text-[#99BBF3]">
            {embedSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}
