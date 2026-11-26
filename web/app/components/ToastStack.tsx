import { Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: "normal" | "warning" | "danger";
  actionLabel?: string;
  onAction?: () => void;
}

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-22 left-4 z-40 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const accent =
          toast.tone === "danger"
            ? "border-l-[#CB2233]"
            : toast.tone === "warning"
              ? "border-l-[#F8AE1A]"
              : "border-l-[#246FE5]";
        return (
          <div
            key={toast.id}
            className={`animate-toast pointer-events-auto flex items-start gap-3 rounded-[6px] border border-[#E0E0E0] border-l-4 ${accent} bg-white p-3.5 text-[#141414] shadow-xl`}
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#246FE5]" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#141414]">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs text-[#525252]">{toast.description}</p>
              ) : null}
              {toast.actionLabel && toast.onAction ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    onDismiss(toast.id);
                  }}
                  className="mt-2 rounded-[4px] bg-[#246FE5] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#4687ED]"
                >
                  {toast.actionLabel}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="rounded p-0.5 text-[#666666] hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
