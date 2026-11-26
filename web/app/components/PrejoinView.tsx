import { useEffect, useRef, useState } from "react";
import { Lock, Mic, MicOff, Sparkles, Video, VideoOff } from "lucide-react";

interface PrejoinProps {
  roomName: string;
  initialName: string;
  initialPassword?: string;
  hasPasswordHint?: boolean;
  error?: string | null;
  onJoin: (opts: {
    displayName: string;
    password: string;
    audioMuted: boolean;
    videoMuted: boolean;
    blur: boolean;
    stream: MediaStream | null;
  }) => void;
}

export function PrejoinView({
  roomName,
  initialName,
  initialPassword = "",
  hasPasswordHint = false,
  error,
  onJoin,
}: PrejoinProps) {
  const [displayName, setDisplayName] = useState(initialName || "Alex");
  const [password, setPassword] = useState(initialPassword);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [blur, setBlur] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDeviceId, setAudioDeviceId] = useState<string>("");
  const [videoDeviceId, setVideoDeviceId] = useState<string>("");
  const [mediaWarn, setMediaWarn] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const acquirePromiseRef = useRef<Promise<void> | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          video: videoDeviceId
            ? { deviceId: { exact: videoDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) {
          nextStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = nextStream;
        setStream(nextStream);
        setMediaWarn(null);
        const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
        if (!cancelled) setDevices(list);
      } catch {
        if (!cancelled) {
          setMediaWarn("Camera or microphone unavailable — joining in listen/chat mode.");
        }
      }
    }
    const p = acquire();
    acquirePromiseRef.current = p;
    return () => {
      cancelled = true;
      if (!joinedRef.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
      }
    };
  }, [audioDeviceId, videoDeviceId]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (stream && !videoMuted) {
      v.srcObject = stream;
      v.play().catch(() => undefined);
    } else {
      v.srcObject = null;
    }
  }, [stream, videoMuted]);

  useEffect(() => {
    stream?.getAudioTracks().forEach((t) => {
      t.enabled = !audioMuted;
    });
    stream?.getVideoTracks().forEach((t) => {
      t.enabled = !videoMuted;
    });
  }, [stream, audioMuted, videoMuted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    joinedRef.current = true;
    if (!streamRef.current && acquirePromiseRef.current) {
      await Promise.race([
        acquirePromiseRef.current,
        new Promise((r) => window.setTimeout(r, 1500)),
      ]);
    }
    onJoin({
      displayName: displayName.trim() || "Guest",
      password,
      audioMuted,
      videoMuted,
      blur,
      stream: streamRef.current,
    });
  };

  const audioInputs = devices.filter((d) => d.kind === "audioinput");
  const videoInputs = devices.filter((d) => d.kind === "videoinput");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 py-8 text-slate-100">
      <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-[#121826] p-6 shadow-2xl md:p-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/brand-assets/icon.svg" alt="Nova" className="h-9 w-9" />
            <div>
              <p className="text-xs font-medium tracking-wider text-blue-400 uppercase">Ready to join</p>
              <h1 className="text-xl font-bold tracking-tight text-white">{roomName}</h1>
            </div>
          </div>
          {hasPasswordHint ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Lock className="h-3.5 w-3.5" /> Locked
            </span>
          ) : null}
        </div>

        <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
          <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-slate-950">
            {stream && !videoMuted ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`h-full w-full -scale-x-100 object-cover ${blur ? "blur-[2px]" : ""}`}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/20 text-2xl font-bold text-blue-300 ring-1 ring-blue-400/30">
                  {(displayName || "G").slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs">Camera is off</span>
              </div>
            )}

            <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  audioMuted
                    ? "border-rose-500/40 bg-rose-600 text-white"
                    : "border-white/15 bg-slate-900/80 text-white backdrop-blur hover:bg-slate-800"
                }`}
              >
                {audioMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setVideoMuted((m) => !m)}
                aria-label={videoMuted ? "Turn camera on" : "Turn camera off"}
                className={`flex h-11 w-11 items-center justify-center rounded-full border transition ${
                  videoMuted
                    ? "border-rose-500/40 bg-rose-600 text-white"
                    : "border-white/15 bg-slate-900/80 text-white backdrop-blur hover:bg-slate-800"
                }`}
              >
                {videoMuted ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => setBlur((b) => !b)}
                aria-label="Toggle background blur"
                className={`flex h-11 items-center gap-1.5 rounded-full border px-4 text-xs font-medium backdrop-blur transition ${
                  blur
                    ? "border-blue-400/50 bg-blue-600/90 text-white"
                    : "border-white/15 bg-slate-900/80 text-slate-200 hover:bg-slate-800"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                Blur
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col justify-between gap-4">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="nova-display-name">
                  Your display name
                </label>
                <input
                  id="nova-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="nova-room-pass">
                  Room password (if required)
                </label>
                <input
                  id="nova-room-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Optional password"
                  className="w-full rounded-lg border border-white/15 bg-slate-900 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              {audioInputs.length > 0 ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Microphone</label>
                  <select
                    value={audioDeviceId}
                    onChange={(e) => setAudioDeviceId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">Default microphone</option>
                    {audioInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {videoInputs.length > 0 ? (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">Camera</label>
                  <select
                    value={videoDeviceId}
                    onChange={(e) => setVideoDeviceId(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-200 outline-none"
                  >
                    <option value="">Default camera</option>
                    {videoInputs.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {mediaWarn ? <p className="text-xs text-amber-300">{mediaWarn}</p> : null}
              {error ? <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p> : null}
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
            >
              Join meeting
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
