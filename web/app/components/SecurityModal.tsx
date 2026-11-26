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
  onEnableE2eePassphrase: (passphrase: string) => void;
  onClose: () => void;
}

export function SecurityModal({ isModerator, security, onUpdate, onEnableE2eePassphrase, onClose }: SecurityModalProps) {
  const [subject, setSubject] = useState(security.subject);
  const [password, setPassword] = useState("");
  const [e2eePass, setE2eePass] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#121826] p-6 text-slate-100 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ShieldCheck className="h-5 w-5 text-blue-400" /> Security & E2EE
          </h2>
          <button type="button" onClick={onClose} aria-label="Close security modal" className="rounded-lg p-1 text-slate-400 hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isModerator ? (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300">Meeting subject</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => onUpdate({ subject })}
                  className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                >
                  Save
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm">
              <span>Enable waiting lobby</span>
              <input
                type="checkbox"
                checked={security.lobby_enabled}
                onChange={(e) => onUpdate({ lobby_enabled: e.target.checked })}
                className="h-4 w-4 accent-blue-600"
              />
            </label>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  <Lock className="h-4 w-4 text-amber-400" /> Room password
                </span>
                <span className="text-xs text-slate-400">{security.has_password ? "Set" : "Off"}</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set password..."
                  className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (password) {
                      onUpdate({ password, locked: true });
                      setPassword("");
                    }
                  }}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Lock
                </button>
                {security.has_password ? (
                  <button
                    type="button"
                    onClick={() => onUpdate({ clear_password: true, locked: false })}
                    className="rounded-lg bg-rose-600/20 px-3 py-1.5 text-xs text-rose-300"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-xs text-slate-300">
            <span>Lobby: {security.lobby_enabled ? "On" : "Off"}</span>
            <span>•</span>
            <span>Room lock: {security.has_password ? "Password set" : "Unlocked"}</span>
            <span>•</span>
            <span>E2EE: {security.e2ee_enabled ? "Enabled" : "Off"}</span>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <KeyRound className="h-4 w-4 text-emerald-400" /> End-to-End Encryption (E2EE)
            </span>
            {isModerator ? (
              <input
                type="checkbox"
                checked={security.e2ee_enabled}
                onChange={(e) => onUpdate({ e2ee_enabled: e.target.checked })}
                className="h-4 w-4 accent-emerald-500"
              />
            ) : null}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={e2eePass}
              onChange={(e) => setE2eePass(e.target.value)}
              placeholder="Shared E2EE key passphrase..."
              className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none"
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
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
