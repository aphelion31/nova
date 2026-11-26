import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Globe, Lock, LogIn, LogOut, Settings, Shuffle, Trash2, Users, Video, X } from "lucide-react";
import { api, type RoomSummary, type SessionUser } from "~/lib/api";
import { useLang } from "~/lib/i18n";

const ADJECTIVES = ["amber", "brisk", "cobalt", "drifting", "emerald", "lunar", "nordic", "quiet", "solar", "vivid"];
const NOUNS = ["apollo", "beacon", "canyon", "comet", "harbor", "horizon", "nebula", "orbit", "quasar", "summit"];

export interface RecentRoomItem {
  name: string;
  subject?: string;
  visitedAt: number;
}

function randomSlug(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${a}-${b}-${n}`;
}

function loadRecentRooms(): RecentRoomItem[] {
  try {
    const raw = localStorage.getItem("nova.recentRooms");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RecentRoomItem[]) : [];
  } catch {
    return [];
  }
}

export default function HomePage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const [roomInput, setRoomInput] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [recentRooms, setRecentRooms] = useState<RecentRoomItem[]>([]);
  const [activeTab, setActiveTab] = useState<"recent" | "active">("active");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [defaultName, setDefaultName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const recent = loadRecentRooms();
    setRecentRooms(recent);
    if (recent.length > 0) {
      setActiveTab("recent");
    }
    try {
      setDefaultName(localStorage.getItem("nova.displayName") || "");
    } catch {
      // ignore storage errors
    }

    let active = true;
    api
      .getMe()
      .then((res) => {
        if (active) setUser(res.user);
      })
      .catch(() => undefined);
    api
      .listRooms()
      .then((res) => {
        if (active) setRooms(res.rooms);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = roomInput.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    const slug = cleaned || randomSlug();
    setError(null);
    try {
      await api.createRoom({ name: slug });
      navigate(`/room/${encodeURIComponent(slug)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    }
  };

  const handleLogout = async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
  };

  const clearRecentItem = (name: string) => {
    const next = recentRooms.filter((r) => r.name !== name);
    setRecentRooms(next);
    try {
      localStorage.setItem("nova.recentRooms", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const saveDefaultName = (val: string) => {
    setDefaultName(val);
    try {
      localStorage.setItem("nova.displayName", val);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#131519]">
      {/* Top Jitsi Meet dark-blue gradient hero */}
      <header
        className="relative overflow-hidden bg-[#131519] px-4 pt-4 pb-16 text-white sm:px-6"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 85% 95% at 50% -15%, rgba(0, 116, 224, 0.58) 0%, rgba(18, 43, 84, 0.5) 45%, #131519 80%)",
        }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/brand-assets/logo_dark.svg" alt="Nova Meet" className="h-8 w-auto" />
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "id" : "en")}
              className="inline-flex items-center gap-1.5 rounded-[4px] bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-[4px] bg-[#189B55]/25 px-2.5 py-1 text-xs font-medium text-emerald-200 sm:inline-flex">
                  {t.hostSignedIn}: {user.display_name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-[4px] bg-white/15 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-[4px] bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/25"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t.hostSignIn}
              </Link>
            )}

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Settings"
              className="flex h-8 w-8 items-center justify-center rounded-[4px] bg-white/20 text-white transition hover:bg-white/30"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-[688px] text-center">
          <h1 className="text-[40px] font-normal leading-[1.2] tracking-tight text-white sm:text-[42px]">
            {t.welcomeTitle}
          </h1>
          <p className="mt-3 mb-8 text-lg font-semibold text-white/95 sm:text-xl">
            {t.welcomeSubtitle}
          </p>

          <form
            onSubmit={handleJoin}
            className="mx-auto flex max-w-[480px] items-center rounded-[4px] bg-white p-1 text-left shadow-2xl"
          >
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              placeholder={t.roomPlaceholder}
              aria-label="Room name"
              className="h-[46px] min-w-0 flex-1 rounded-[4px] bg-white px-3 text-sm text-[#253858] placeholder-[#253858]/60 outline-none"
            />
            <button
              type="button"
              onClick={() => setRoomInput(randomSlug())}
              aria-label="Generate random room name"
              title={t.randomRoom}
              className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] text-[#253858]/70 transition hover:bg-slate-100 hover:text-[#0074E0]"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              type="submit"
              className="inline-flex h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-[3px] bg-[#0074E0] px-5 text-sm font-semibold text-white transition hover:bg-[#4687ED]"
            >
              {t.startMeeting}
            </button>
          </form>
          {error ? <p className="mt-2.5 text-xs font-medium text-rose-300">{error}</p> : null}
        </div>
      </header>

      {/* Lower crisp white Jitsi Recent / Active Meetings card band */}
      <main className="mx-auto w-full max-w-[688px] flex-1 px-4 py-10">
        <div
          role="tablist"
          aria-label="Meetings view"
          className="mb-5 grid grid-cols-2 rounded-[6px] bg-[#c7ddff] p-1 text-sm font-medium text-[#0163FF]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "recent"}
            onClick={() => setActiveTab("recent")}
            className={`rounded-[6px] py-2 transition ${
              activeTab === "recent" ? "bg-white font-semibold shadow-sm" : "hover:bg-white/40"
            }`}
          >
            {t.recentTab} {recentRooms.length > 0 ? `(${recentRooms.length})` : ""}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "active"}
            onClick={() => setActiveTab("active")}
            className={`rounded-[6px] py-2 transition ${
              activeTab === "active" ? "bg-white font-semibold shadow-sm" : "hover:bg-white/40"
            }`}
          >
            {t.activeRoomsTab} ({rooms.length} {rooms.length === 1 ? "room" : "rooms"})
          </button>
        </div>

        {activeTab === "recent" ? (
          recentRooms.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {t.noRecent}
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentRooms.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-[6px] border border-slate-200 bg-[#f8fafc] px-4 py-3 transition hover:border-[#0074E0]/40 hover:bg-[#f0f6ff]"
                >
                  <Link to={`/room/${encodeURIComponent(item.name)}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0074E0] text-white">
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#131519]">{item.subject || item.name}</p>
                      <p className="truncate text-xs text-slate-500">/{item.name}</p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={() => clearRecentItem(item.name)}
                    aria-label={`Remove ${item.name}`}
                    className="ml-2 rounded p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : rooms.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            {t.noRooms}
          </div>
        ) : (
          <div className="space-y-2.5">
            {rooms.slice(0, 8).map((r) => (
              <Link
                key={r.name}
                to={`/room/${encodeURIComponent(r.name)}`}
                className="flex items-center justify-between rounded-[6px] border border-slate-200 bg-[#f8fafc] px-4 py-3 transition hover:border-[#0074E0]/45 hover:bg-[#f0f6ff]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0074E0] text-white">
                    {r.locked ? <Lock className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#131519]">{r.subject || r.name}</p>
                    <p className="truncate text-xs text-slate-500">/{r.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f0ff] px-2.5 py-1 font-medium text-[#0056E0] tabular-nums">
                    <Users className="h-3.5 w-3.5" /> {r.active_participants}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-4 text-center text-xs text-slate-500">
        Nova Meet — Single-binary Rust Axum + str0m SFU + UniFFI Swift/Kotlin rewrite ·{" "}
        <a href="/external_api.js" className="font-medium text-[#0074E0] hover:underline">
          /external_api.js
        </a>
      </footer>

      {settingsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">{t.settings}</h2>
              <button type="button" onClick={() => setSettingsOpen(false)} aria-label="Close settings" className="rounded p-1 text-[#C2C2C2] hover:bg-[#292929]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]" htmlFor="welcome-default-name">
                {t.yourName}
              </label>
              <input
                id="welcome-default-name"
                type="text"
                value={defaultName}
                onChange={(e) => saveDefaultName(e.target.value)}
                placeholder="Alex"
                className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3 py-2 text-sm text-white outline-none focus:border-[#4687ED]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]">Language</label>
              <div className="grid grid-cols-2 gap-2">
                {(["en", "id"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    className={`rounded-[6px] py-2 text-xs font-semibold ${
                      lang === code ? "bg-[#246FE5] text-white" : "bg-[#292929] text-[#C2C2C2] hover:bg-[#3D3D3D]"
                    }`}
                  >
                    {code === "en" ? "English" : "Bahasa Indonesia"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-[6px] bg-[#246FE5] px-4 py-2 text-xs font-semibold text-white hover:bg-[#4687ED]"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
