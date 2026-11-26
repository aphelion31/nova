import { BarChart3, X } from "lucide-react";
import type { Participant } from "~/lib/rtc";

export function SpeakerStatsModal({
  participants,
  selfId,
  onClose,
}: {
  participants: Participant[];
  selfId: string | null;
  onClose: () => void;
}) {
  const maxMs = Math.max(1000, ...participants.map((p) => p.speaking_ms));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-6 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BarChart3 className="h-5 w-5 text-[#4687ED]" /> Speaker stats
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close speaker stats"
            className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1 jitsi-scroll">
          {participants.map((p) => {
            const secs = Math.round(p.speaking_ms / 1000);
            const pct = Math.min(100, Math.round((p.speaking_ms / maxMs) * 100));
            return (
              <div key={p.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-white">
                    {p.display_name}
                    {p.id === selfId ? " (You)" : ""}
                  </span>
                  <span className="tabular-nums text-[#C2C2C2]">{secs}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#292929]">
                  <div className="h-full bg-[#246FE5] transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
