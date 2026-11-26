import { useState } from "react";
import { PlaySquare, X } from "lucide-react";

export function SharedVideoModal({
  currentUrl,
  onStart,
  onStop,
  onClose,
}: {
  currentUrl: string | null;
  onStart: (url: string) => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(currentUrl || "");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = url.trim();
    if (!/^https?:\/\//i.test(clean)) {
      setErr("Enter a valid https:// or http:// video or YouTube URL.");
      return;
    }
    setErr(null);
    onStart(clean);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-6 text-white shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <PlaySquare className="h-5 w-5 text-[#4687ED]" /> Share a video
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close shared video modal"
            className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]" htmlFor="shared-video-url">
              YouTube link or direct video URL
            </label>
            <input
              id="shared-video-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              required
              className="h-10 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
            />
          </div>
          {err ? <p className="text-xs text-[#F24D5F]">{err}</p> : null}
          <div className="flex items-center justify-end gap-2 pt-2">
            {currentUrl ? (
              <button
                type="button"
                onClick={() => {
                  onStop();
                  onClose();
                }}
                className="rounded-[6px] bg-[#CB2233] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#E04757]"
              >
                Stop sharing video
              </button>
            ) : null}
            <button
              type="submit"
              className="rounded-[6px] bg-[#246FE5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4687ED]"
            >
              Share
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
