import { useState } from "react";
import { KeyRound, Lock, ShieldCheck, X } from "lucide-react";
import type { RoomSecurityState } from "~/lib/rtc";

interface SecurityModalProps {
  isModerator: boolean;
  security: RoomSecurityState;
  onUpdate: (payload: {
    locked?: boolean;
    password?: string;
    clear_password?: boolean;
    lobby_enabled?: boolean;
    e2ee_enabled?: boolean;
    subject?: string;
  }) => void;
  onUpdateAvModeration?: (startAudioMuted: boolean, startVideoMuted: boolean) => void;
  onEnableE2eePassphrase: (passphrase: string) => void;
  onClose: () => void;
}

export function SecurityModal({
  isModerator,
  security,
  onUpdate,
  onUpdateAvModeration,
  onEnableE2eePassphrase,
  onClose,
}: SecurityModalProps) {
  const [subject, setSubject] = useState(security.subject);
  const [password, setPassword] = useState("");
  const [e2eePass, setE2eePass] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md space-y-4 rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-5 w-5 text-[#4687ED]" /> Security Options
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close security modal"
            className="rounded p-1 text-[#A3A3A3] hover:bg-[#292929] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isModerator ? (
          <>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#C2C2C2]">Meeting subject</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 py-2 text-xs text-white outline-none focus:border-[#4687ED]"
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ subject })}
                  className="rounded-[6px] bg-[#292929] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3D3D3D]"
                >
                  Save
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-[6px] border border-[#3D3D3D] bg-[#292929]/70 px-3.5 py-2.5 text-sm">
              <span>Enable waiting lobby</span>
              <input
                type="checkbox"
                checked={security.lobby_enabled}
                onChange={(e) => onUpdate({ lobby_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#246FE5]"
              />
            </label>

            {onUpdateAvModeration ? (
              <div className="space-y-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929]/70 px-3.5 py-2.5 text-xs">
                <p className="font-semibold text-[#C2C2C2]">AV Moderation (New guests)</p>
                <label className="flex items-center justify-between">
                  <span>Start everyone muted</span>
                  <input
                    type="checkbox"
                    checked={Boolean(security.start_audio_muted)}
                    onChange={(e) =>
                      onUpdateAvModeration(e.target.checked, Boolean(security.start_video_muted))
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>
                <label className="flex items-center justify-between">
                  <span>Start with camera off</span>
                  <input
                    type="checkbox"
                    checked={Boolean(security.start_video_muted)}
                    onChange={(e) =>
                      onUpdateAvModeration(Boolean(security.start_audio_muted), e.target.checked)
                    }
                    className="h-4 w-4 accent-[#246FE5]"
                  />
                </label>
              </div>
            ) : null}

            <div className="space-y-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929]/70 p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-4 w-4 text-[#F8AE1A]" /> Room password
                </span>
                <span className="text-xs text-[#A3A3A3]">{security.has_password ? "Set" : "Off"}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password..."
                  className="flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-[#4687ED]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (password) {
                      onUpdate({ password, locked: true });
                      setPassword("");
                    }
                  }}
                  className="rounded-[6px] bg-[#246FE5] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4687ED]"
                >
                  Lock
                </button>
                {security.has_password ? (
                  <button
                    type="button"
                    onClick={() => onUpdate({ clear_password: true, locked: false })}
                    className="rounded-[6px] bg-[#CB2233]/25 px-3 py-1.5 text-xs font-semibold text-[#F24D5F] hover:bg-[#CB2233]/40"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929]/70 px-3.5 py-2.5 text-xs text-[#C2C2C2]">
            <span>Lobby: {security.lobby_enabled ? "On" : "Off"}</span>
            <span>•</span>
            <span>Room lock: {security.has_password ? "Password set" : "Unlocked"}</span>
            <span>•</span>
            <span>E2EE: {security.e2ee_enabled ? "Enabled" : "Off"}</span>
          </div>
        )}

        <div className="space-y-2 rounded-[6px] border border-[#3D3D3D] bg-[#292929]/70 p-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <KeyRound className="h-4 w-4 text-[#189B55]" /> End-to-End Encryption (E2EE)
            </span>
            {isModerator ? (
              <input
                type="checkbox"
                checked={security.e2ee_enabled}
                onChange={(e) => onUpdate({ e2ee_enabled: e.target.checked })}
                className="h-4 w-4 accent-[#189B55]"
              />
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={e2eePass}
              onChange={(e) => setE2eePass(e.target.value)}
              placeholder="Shared E2EE key passphrase..."
              className="flex-1 rounded-[6px] border border-[#3D3D3D] bg-[#141414] px-3 py-1.5 text-xs text-white outline-none focus:border-[#4687ED]"
            />
            <button
              type="button"
              onClick={() => {
                if (e2eePass.trim()) {
                  onEnableE2eePassphrase(e2eePass.trim());
                  if (isModerator) {
                    onUpdate({ e2ee_enabled: true });
                  }
                }
              }}
              className="rounded-[6px] bg-[#189B55] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
