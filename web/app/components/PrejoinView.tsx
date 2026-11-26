import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import {
  CheckCircle2,
  ChevronDown,
  Lock,
  Mic,
  MicOff,
  Settings,
  Sparkles,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { VIRTUAL_BG_PRESETS, type VirtualBgMode } from "~/lib/blur";

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
    bgMode: VirtualBgMode;
    audioOnly: boolean;
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
  const [displayName, setDisplayName] = useState(() => {
    if (initialName) return initialName;
    try {
      return localStorage.getItem("nova.displayName") || "Alex";
    } catch {
      return "Alex";
    }
  });
  const [password, setPassword] = useState(initialPassword);
  const [showPassword, setShowPassword] = useState(hasPasswordHint);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [bgMode, setBgMode] = useState<VirtualBgMode>("none");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDeviceId, setAudioDeviceId] = useState("");
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [mediaWarn, setMediaWarn] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<"join" | "audio" | "video" | "bg" | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const acquirePromiseRef = useRef<Promise<void> | null>(null);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (hasPasswordHint) setShowPassword(true);
  }, [hasPasswordHint]);

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
          setMediaWarn("Camera or microphone unavailable — listen/chat mode.");
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

  const submitWith = async (opts: { muteAudio?: boolean; audioOnly?: boolean } = {}) => {
    joinedRef.current = true;
    const cleanName = displayName.trim() || "Guest";
    try {
      localStorage.setItem("nova.displayName", cleanName);
    } catch {
      // ignore
    }
    if (!streamRef.current && acquirePromiseRef.current) {
      await Promise.race([
        acquirePromiseRef.current,
        new Promise((r) => window.setTimeout(r, 1500)),
      ]);
    }
    const muteA = opts.muteAudio ?? audioMuted;
    const audioOnly = opts.audioOnly ?? false;
    onJoin({
      displayName: cleanName,
      password,
      audioMuted: muteA,
      videoMuted: audioOnly ? true : videoMuted,
      bgMode: audioOnly ? "none" : bgMode,
      audioOnly,
      stream: streamRef.current,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitWith().catch(() => undefined);
  };

  const audioInputs = devices.filter((d) => d.kind === "audioinput");
  const videoInputs = devices.filter((d) => d.kind === "videoinput");
  const initials = (displayName || "G")
    .split(/\s+/)
    .map((s) => s[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-dvh flex-col-reverse overflow-hidden bg-[#040404] text-white md:flex-row">
      {/* Jitsi Left PreMeeting Sidebar */}
      <aside className="relative z-20 flex w-full shrink-0 flex-col justify-between border-t border-[#292929] bg-[#141414] px-6 py-6 md:w-[400px] md:border-t-0 md:border-r md:px-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 opacity-90 hover:opacity-100">
            <img src="/brand-assets/logo_dark.svg" alt="Nova Meet" className="h-7 w-auto" />
          </Link>
          {hasPasswordHint ? (
            <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#F8AE1A]/20 px-2 py-0.5 text-[11px] font-semibold text-[#F8AE1A]">
              <Lock className="h-3 w-3" /> Locked
            </span>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="my-auto w-full space-y-4 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Join meeting</h1>
            <p className="mt-1.5 truncate text-sm font-medium text-[#C2C2C2]">{roomName}</p>
          </div>

          <div>
            <input
              id="nova-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
              aria-label="Your display name"
              required
              className="h-10 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-center text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
            />
          </div>

          {showPassword ? (
            <div>
              <input
                id="nova-room-pass"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Room password"
                aria-label="Room password"
                className="h-10 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-center text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
              />
            </div>
          ) : (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowPassword(true)}
                className="text-xs font-medium text-[#4687ED] hover:underline"
              >
                Have a room password?
              </button>
            </div>
          )}

          {error ? (
            <p className="rounded-[6px] bg-[#CB2233]/20 px-3 py-2 text-center text-xs text-[#F24D5F]">{error}</p>
          ) : null}

          {/* Jitsi split Join Meeting button */}
          <div className="relative flex rounded-[6px] bg-[#246FE5]">
            <button
              type="submit"
              className="h-10 flex-1 rounded-l-[6px] px-4 text-sm font-semibold text-white transition hover:bg-[#4687ED]"
            >
              Join meeting
            </button>
            <button
              type="button"
              aria-label="More join options"
              onClick={() => setOpenMenu((m) => (m === "join" ? null : "join"))}
              className="flex h-10 w-10 items-center justify-center rounded-r-[6px] border-l border-[#4687ED]/50 text-white transition hover:bg-[#4687ED]"
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            {openMenu === "join" ? (
              <div className="absolute top-11 right-0 left-0 z-30 rounded-[6px] border border-[#3D3D3D] bg-[#292929] py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => submitWith({ muteAudio: true })}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-white hover:bg-[#3D3D3D]"
                >
                  <MicOff className="h-4 w-4 text-[#C2C2C2]" />
                  Join without audio
                </button>
                <button
                  type="button"
                  onClick={() => submitWith({ audioOnly: true })}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-xs font-medium text-white hover:bg-[#3D3D3D]"
                >
                  <Volume2 className="h-4 w-4 text-[#C2C2C2]" />
                  Join audio-only
                </button>
              </div>
            ) : null}
          </div>

          {/* Prejoin Toolbox Row (matching Jitsi PreMeetingScreen) */}
          <div className="relative flex items-center justify-center gap-2 pt-2">
            <div className="flex items-center rounded-[6px] bg-[#292929]">
              <button
                type="button"
                onClick={() => setAudioMuted((m) => !m)}
                aria-label={audioMuted ? "Unmute microphone" : "Mute microphone"}
                className={`flex h-10 w-10 items-center justify-center rounded-l-[6px] transition ${
                  audioMuted ? "bg-[#E0E0E0] text-[#141414]" : "text-white hover:bg-[#3D3D3D]"
                }`}
              >
                {audioMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Select microphone"
                onClick={() => setOpenMenu((m) => (m === "audio" ? null : "audio"))}
                className="flex h-10 w-6 items-center justify-center rounded-r-[6px] border-l border-[#3D3D3D] text-[#C2C2C2] hover:bg-[#3D3D3D] hover:text-white"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center rounded-[6px] bg-[#292929]">
              <button
                type="button"
                onClick={() => setVideoMuted((m) => !m)}
                aria-label={videoMuted ? "Turn camera on" : "Turn camera off"}
                className={`flex h-10 w-10 items-center justify-center rounded-l-[6px] transition ${
                  videoMuted ? "bg-[#E0E0E0] text-[#141414]" : "text-white hover:bg-[#3D3D3D]"
                }`}
              >
                {videoMuted ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
              </button>
              <button
                type="button"
                aria-label="Select camera"
                onClick={() => setOpenMenu((m) => (m === "video" ? null : "video"))}
                className="flex h-10 w-6 items-center justify-center rounded-r-[6px] border-l border-[#3D3D3D] text-[#C2C2C2] hover:bg-[#3D3D3D] hover:text-white"
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === "bg" ? null : "bg"))}
              aria-label="Virtual background"
              title="Virtual background"
              className={`flex h-10 w-10 items-center justify-center rounded-[6px] transition ${
                bgMode !== "none" ? "bg-[#246FE5] text-white" : "bg-[#292929] text-white hover:bg-[#3D3D3D]"
              }`}
            >
              <Sparkles className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              aria-label="Prejoin options"
              title="Security & device options"
              className="flex h-10 w-10 items-center justify-center rounded-[6px] bg-[#292929] text-white transition hover:bg-[#3D3D3D]"
            >
              <Settings className="h-4 w-4" />
            </button>

            {openMenu === "audio" ? (
              <div className="absolute top-13 left-0 right-0 z-30 rounded-[6px] border border-[#3D3D3D] bg-[#292929] p-1.5 shadow-xl">
                <p className="px-2 py-1 text-[11px] font-semibold text-[#A3A3A3]">Microphone</p>
                {audioInputs.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-[#C2C2C2]">Default microphone</p>
                ) : (
                  audioInputs.map((d) => (
                    <button
                      key={d.deviceId}
                      type="button"
                      onClick={() => {
                        setAudioDeviceId(d.deviceId);
                        setOpenMenu(null);
                      }}
                      className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                        audioDeviceId === d.deviceId ? "bg-[#246FE5] text-white" : "text-[#C2C2C2] hover:bg-[#3D3D3D]"
                      }`}
                    >
                      {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {openMenu === "video" ? (
              <div className="absolute top-13 left-0 right-0 z-30 rounded-[6px] border border-[#3D3D3D] bg-[#292929] p-1.5 shadow-xl">
                <p className="px-2 py-1 text-[11px] font-semibold text-[#A3A3A3]">Camera</p>
                {videoInputs.length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-[#C2C2C2]">Default camera</p>
                ) : (
                  videoInputs.map((d) => (
                    <button
                      key={d.deviceId}
                      type="button"
                      onClick={() => {
                        setVideoDeviceId(d.deviceId);
                        setOpenMenu(null);
                      }}
                      className={`block w-full truncate rounded px-2 py-1.5 text-left text-xs ${
                        videoDeviceId === d.deviceId ? "bg-[#246FE5] text-white" : "text-[#C2C2C2] hover:bg-[#3D3D3D]"
                      }`}
                    >
                      {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                    </button>
                  ))
                )}
              </div>
            ) : null}

            {openMenu === "bg" ? (
              <div className="absolute top-13 left-0 right-0 z-30 rounded-[6px] border border-[#3D3D3D] bg-[#292929] p-2 shadow-xl">
                <p className="mb-1.5 px-1 text-[11px] font-semibold text-[#A3A3A3]">Virtual background</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {VIRTUAL_BG_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setBgMode(preset.id);
                        setOpenMenu(null);
                      }}
                      className={`rounded-[4px] border p-2 text-center text-[11px] font-medium ${preset.previewCss} ${
                        bgMode === preset.id ? "border-[#4687ED] ring-1 ring-[#4687ED]" : "border-[#3D3D3D]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </form>

        {/* Bottom Device Status indicator */}
        <div className="flex items-center justify-center">
          {mediaWarn ? (
            <span className="rounded-full bg-[#F8AE1A]/15 px-3 py-1.5 text-center text-xs font-medium text-[#F8AE1A]">
              {mediaWarn}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#189B55]/15 px-3 py-1.5 text-xs font-medium text-[#1EC26A]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Your mic &amp; camera are working
            </span>
          )}
        </div>
      </aside>

      {/* Right Full-Bleed Preview Surface (Jitsi Preview) */}
      <main className="relative flex flex-1 items-center justify-center bg-[#040404]">
        {stream && !videoMuted ? (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`h-full w-full -scale-x-100 object-cover ${
              bgMode === "slight-blur" ? "blur-[1px]" : bgMode !== "none" ? "blur-[2px]" : ""
            }`}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex h-36 w-36 items-center justify-center rounded-full border border-[#3D3D3D] bg-[#292929] text-4xl font-semibold text-white">
              {initials || "?"}
            </div>
            <span className="text-xs font-medium text-[#A3A3A3]">Camera is turned off</span>
          </div>
        )}

        {bgMode !== "none" ? (
          <div className="absolute top-4 right-4 rounded-[4px] bg-[#141414]/85 px-2.5 py-1 text-xs font-medium text-[#C2C2C2] border border-[#3D3D3D]">
            Background: {VIRTUAL_BG_PRESETS.find((p) => p.id === bgMode)?.label}
          </div>
        ) : null}
      </main>
    </div>
  );
}
