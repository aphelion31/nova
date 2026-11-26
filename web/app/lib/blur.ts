export interface BlurPipeline {
  track: MediaStreamTrack;
  stop: () => void;
}

/**
 * Lightweight client-side blurred backdrop compositor around the center subject ellipse.
 * Runs locally on Canvas 2D with zero ML model downloads.
 */
export function createBlurredVideoTrack(sourceStream: MediaStream): BlurPipeline | null {
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
      ctx.save();
      ctx.filter = "blur(14px)";
      ctx.drawImage(video, -16, -16, width + 32, height + 32);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(width / 2, height * 0.52, width * 0.28, height * 0.42, 0, 0, Math.PI * 2);
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
