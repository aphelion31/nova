import { useEffect, useState } from "react";
import { Globe, Keyboard, Mic, Shield, Sparkles, User, Video, X } from "lucide-react";
import { VIRTUAL_BG_PRESETS, type VirtualBgMode } from "~/lib/blur";
import type { Lang } from "~/lib/i18n";
import type { RoomSecurityState, VideoQualityMode } from "~/lib/rtc";

export type SettingsTab = "audio" | "video" | "profile" | "vb" | "moderator" | "shortcuts" | "more";

interface SettingsModalProps {
  initialTab: SettingsTab;
  isModerator: boolean;
  displayName: string;
  email: string;
  avatarUrl: string;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  noiseSuppression: boolean;
  echoCancellation: boolean;
  talkWhileMutedEnabled: boolean;
  mirrorSelf: boolean;
  videoQuality: VideoQualityMode;
  bgMode: VirtualBgMode;
  followMeEnabled: boolean;
  security: RoomSecurityState;
  soundNotifications: boolean;
  lang: Lang;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onToggleAudioProcessing: (opts: { noiseSuppression: boolean; echoCancellation: boolean }) => void;
  onToggleTalkWhileMuted: (v: boolean) => void;
  onToggleMirror: (v: boolean) => void;
  onSetVideoQuality: (q: VideoQualityMode) => void;
  onSelectBgMode: (mode: VirtualBgMode) => void;
  onSaveProfile: (profile: { displayName: string; email: string; avatarUrl: string }) => void;
  onUpdateAvModeration: (startAudioMuted: boolean, startVideoMuted: boolean) => void;
  onToggleFollowMe: (enabled: boolean) => void;
  onToggleSounds: (v: boolean) => void;
  onChangeLang: (lang: Lang) => void;
  onClose: () => void;
}

const SHORTCUTS = [
  ["M", "Mute / Unmute microphone"],
  ["V", "Start / Stop camera"],
  ["C", "Toggle Chat drawer"],
  ["P", "Toggle Participants pane"],
  ["R", "Raise / Lower hand"],
  ["T", "Toggle Tile / Speaker view"],
  ["S", "Start / Stop screen share"],
  ["W", "Toggle Whiteboard"],
  ["F", "Toggle Fullscreen"],
  ["Space", "Push-to-talk while held"],
  ["?", "Open Keyboard shortcuts"],
];

export function SettingsModal(props: SettingsModalProps) {
  const [tab, setTab] = useState<SettingsTab>(props.initialTab);
  const [name, setName] = useState(props.displayName);
  const [email, setEmail] = useState(props.email);
  const [avatar, setAvatar] = useState(props.avatarUrl);
  const [savedMsg, setSavedMsg] = useState(false);

  useEffect(() => {
    setTab(props.initialTab);
  }, [props.initialTab]);

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "audio", label: "Audio", icon: Mic },
    { id: "video", label: "Video", icon: Video },
    { id: "profile", label: "Profile", icon: User },
    { id: "vb", label: "Background", icon: Sparkles },
    ...(props.isModerator ? [{ id: "moderator" as const, label: "Moderator", icon: Shield }] : []),
    { id: "shortcuts", label: "Shortcuts", icon: Keyboard },
    { id: "more", label: "More", icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[520px] max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-[8px] border border-[#3D3D3D] bg-[#141414] text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#292929] px-5 py-3.5">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            type="button"
            onClick={props.onClose}
            aria-label="Close settings modal"
            className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#292929] p-2 sm:w-44 sm:flex-col sm:border-r sm:border-b-0">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-xs font-medium whitespace-nowrap transition ${
                  tab === item.id ? "bg-[#246FE5] text-white" : "text-[#C2C2C2] hover:bg-[#292929] hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs jitsi-scroll">
            {tab === "audio" ? (
              <>
                <div>
                  <label className="mb-1.5 block font-medium text-[#C2C2C2]">Microphone</label>
                  <select
                    onChange={(e) => e.target.value && props.onSelectAudioDevice(e.target.value)}
                    className="h-9 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-white outline-none"
                  >
                    <option value="">System default microphone</option>
                    {props.audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Mic ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Enable WebRTC noise suppression</span>
                  <input
                    type="checkbox"
                    checked={props.noiseSuppression}
                    onChange={(e) =>
                      props.onToggleAudioProcessing({
                        noiseSuppression: e.target.checked,
                        echoCancellation: props.echoCancellation,
                      })
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Echo cancellation</span>
                  <input
                    type="checkbox"
                    checked={props.echoCancellation}
                    onChange={(e) =>
                      props.onToggleAudioProcessing({
                        noiseSuppression: props.noiseSuppression,
                        echoCancellation: e.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Alert me when talking while muted</span>
                  <input
                    type="checkbox"
                    checked={props.talkWhileMutedEnabled}
                    onChange={(e) => props.onToggleTalkWhileMuted(e.target.checked)}
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>
              </>
            ) : null}

            {tab === "video" ? (
              <>
                <div>
                  <label className="mb-1.5 block font-medium text-[#C2C2C2]">Camera</label>
                  <select
                    onChange={(e) => e.target.value && props.onSelectVideoDevice(e.target.value)}
                    className="h-9 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-white outline-none"
                  >
                    <option value="">System default camera</option>
                    {props.videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 6)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Mirror local camera preview</span>
                  <input
                    type="checkbox"
                    checked={props.mirrorSelf}
                    onChange={(e) => props.onToggleMirror(e.target.checked)}
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>

                <div>
                  <label className="mb-1.5 block font-medium text-[#C2C2C2]">Video quality</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        { id: "hd", label: "High (720p)" },
                        { id: "sd", label: "Standard" },
                        { id: "low", label: "Low" },
                        { id: "audio_only", label: "Audio only" },
                      ] as const
                    ).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => props.onSetVideoQuality(q.id)}
                        className={`rounded-[6px] py-2 font-semibold ${
                          props.videoQuality === q.id
                            ? "bg-[#246FE5] text-white"
                            : "bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
                        }`}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {tab === "profile" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  props.onSaveProfile({ displayName: name, email, avatarUrl: avatar });
                  setSavedMsg(true);
                  window.setTimeout(() => setSavedMsg(false), 1800);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="mb-1 block font-medium text-[#C2C2C2]">Display name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-9 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-white outline-none focus:border-[#4687ED]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#C2C2C2]">Email (optional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-9 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-white outline-none focus:border-[#4687ED]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-medium text-[#C2C2C2]">Avatar URL (https://)</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    placeholder="https://..."
                    className="h-9 w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 text-white outline-none focus:border-[#4687ED]"
                  />
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="rounded-[6px] bg-[#246FE5] px-4 py-2 font-semibold text-white hover:bg-[#4687ED]"
                  >
                    Save profile
                  </button>
                  {savedMsg ? <span className="text-[#1EC26A]">Updated!</span> : null}
                </div>
              </form>
            ) : null}

            {tab === "vb" ? (
              <div className="space-y-3">
                <p className="text-[#C2C2C2]">
                  Select a local Canvas 2D virtual background effect (runs privately on your device).
                </p>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {VIRTUAL_BG_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => props.onSelectBgMode(preset.id)}
                      className={`flex h-20 items-end rounded-[6px] border p-2.5 text-left font-semibold transition ${preset.previewCss} ${
                        props.bgMode === preset.id
                          ? "border-[#4687ED] ring-2 ring-[#4687ED]"
                          : "border-[#3D3D3D] hover:border-[#666666]"
                      }`}
                    >
                      <span className="rounded bg-black/50 px-2 py-0.5 text-[11px]">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "moderator" && props.isModerator ? (
              <div className="space-y-2.5">
                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Everyone starts muted</span>
                  <input
                    type="checkbox"
                    checked={Boolean(props.security.start_audio_muted)}
                    onChange={(e) =>
                      props.onUpdateAvModeration(e.target.checked, Boolean(props.security.start_video_muted))
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Everyone starts with camera hidden</span>
                  <input
                    type="checkbox"
                    checked={Boolean(props.security.start_video_muted)}
                    onChange={(e) =>
                      props.onUpdateAvModeration(Boolean(props.security.start_audio_muted), e.target.checked)
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <div>
                    <p className="font-medium text-white">Everyone follows me</p>
                    <p className="text-[11px] text-[#A3A3A3]">Sync your tile/speaker layout to all participants</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={props.followMeEnabled}
                    onChange={(e) => props.onToggleFollowMe(e.target.checked)}
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>
              </div>
            ) : null}

            {tab === "shortcuts" ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {SHORTCUTS.map(([key, desc]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-[6px] border border-[#292929] bg-[#292929]/50 px-3 py-2"
                  >
                    <span className="text-[#C2C2C2]">{desc}</span>
                    <kbd className="rounded bg-[#141414] px-2 py-0.5 font-mono text-[11px] font-semibold text-white ring-1 ring-[#3D3D3D]">
                      {key}
                    </kbd>
                  </div>
                ))}
              </div>
            ) : null}

            {tab === "more" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block font-medium text-[#C2C2C2]">Language</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["en", "id"] as const).map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => props.onChangeLang(code)}
                        className={`rounded-[6px] py-2 font-semibold ${
                          props.lang === code ? "bg-[#246FE5] text-white" : "bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
                        }`}
                      >
                        {code === "en" ? "English" : "Bahasa Indonesia"}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5">
                  <span>Play sound notifications (join / leave / chat)</span>
                  <input
                    type="checkbox"
                    checked={props.soundNotifications}
                    onChange={(e) => props.onToggleSounds(e.target.checked)}
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
