export type VirtualBgMode =
  | "none"
  | "slight-blur"
  | "blur"
  | "studio"
  | "ocean"
  | "warm"
  | "midnight";

export interface VirtualBgPreset {
  id: VirtualBgMode;
  label: string;
  previewCss: string;
}

export const VIRTUAL_BG_PRESETS: VirtualBgPreset[] = [
  { id: "none", label: "None", previewCss: "bg-[#292929]" },
  { id: "slight-blur", label: "Slight blur", previewCss: "bg-gradient-to-br from-slate-600 to-slate-800" },
  { id: "blur", label: "Blur", previewCss: "bg-gradient-to-br from-slate-500 to-slate-900" },
  { id: "studio", label: "Studio", previewCss: "bg-gradient-to-br from-[#1d3557] via-[#1b263b] to-[#0d1b2a]" },
  { id: "ocean", label: "Ocean", previewCss: "bg-gradient-to-br from-[#0056E0] via-[#123d7a] to-[#040404]" },
  { id: "warm", label: "Warm loft", previewCss: "bg-gradient-to-br from-[#5c3d2e] via-[#2b1d19] to-[#141414]" },
  { id: "midnight", label: "Minimal dark", previewCss: "bg-gradient-to-br from-[#1f2937] via-[#141414] to-[#040404]" },
];

export interface BlurPipeline {
  track: MediaStreamTrack;
  stop: () => void;
}

function drawGradientBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number, mode: VirtualBgMode) {
  const grad = ctx.createLinearGradient(0, 0, width, height);
  switch (mode) {
    case "studio":
      grad.addColorStop(0, "#1d3557");
      grad.addColorStop(0.55, "#1b263b");
      grad.addColorStop(1, "#0d1b2a");
      break;
    case "ocean":
      grad.addColorStop(0, "#0056E0");
      grad.addColorStop(0.5, "#11376b");
      grad.addColorStop(1, "#040404");
      break;
    case "warm":
      grad.addColorStop(0, "#6b4423");
      grad.addColorStop(0.55, "#2b1d19");
      grad.addColorStop(1, "#141414");
      break;
    case "midnight":
    default:
      grad.addColorStop(0, "#1f2937");
      grad.addColorStop(0.55, "#141414");
      grad.addColorStop(1, "#040404");
      break;
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Local Canvas 2D virtual background & blur compositor around the center subject silhouette.
 * Zero external ML downloads or CDN runtime dependencies.
 */
export function createVirtualBackgroundTrack(
  sourceStream: MediaStream,
  mode: VirtualBgMode = "blur",
): BlurPipeline | null {
  if (mode === "none") return null;
  const srcTrack = sourceStream.getVideoTracks()[0];
  if (!srcTrack) return null;

  const settings = srcTrack.getSettings();
  const width = settings.width || 640;
  const height = settings.height || 480;

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([srcTrack]);
  video.play().catch(() => undefined);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  let active = true;
  const draw = () => {
    if (!active) return;
    if (video.readyState >= 2) {
      if (mode === "slight-blur" || mode === "blur") {
        ctx.save();
        ctx.filter = mode === "slight-blur" ? "blur(6px)" : "blur(16px)";
        ctx.drawImage(video, -16, -16, width + 32, height + 32);
        ctx.restore();
      } else {
        drawGradientBackdrop(ctx, width, height, mode);
      }

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.54, width * 0.3, height * 0.44, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(video, 0, 0, width, height);
      ctx.restore();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);

  const outStream = canvas.captureStream(24);
  const outTrack = outStream.getVideoTracks()[0];
  if (!outTrack) {
    active = false;
    return null;
  }

  return {
    track: outTrack,
    stop: () => {
      active = false;
      outTrack.stop();
      video.srcObject = null;
    },
  };
}

export function createBlurredVideoTrack(sourceStream: MediaStream): BlurPipeline | null {
  return createVirtualBackgroundTrack(sourceStream, "blur");
}
