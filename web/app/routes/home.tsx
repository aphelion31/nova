import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowRight, Globe, Lock, LogIn, LogOut, Shield, Shuffle, Smartphone, Users, Video } from "lucide-react";
import { api, type RoomSummary, type SessionUser } from "~/lib/api";
import { useLang } from "~/lib/i18n";

const ADJECTIVES = ["amber", "brisk", "cobalt", "drifting", "emerald", "lunar", "nordic", "quiet", "solar", "vivid"];
const NOUNS = ["apollo", "beacon", "canyon", "comet", "harbor", "horizon", "nebula", "orbit", "quasar", "summit"];

function randomSlug(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const b = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const n = Math.floor(100 + Math.random() * 900);
  return `${a}-${b}-${n}`;
}

export default function HomePage() {
  const navigate = useNavigate();
  const { lang, setLang, t } = useLang();
  const [roomInput, setRoomInput] = useState("");
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  return (
    <div className="min-h-dvh bg-[#0b0f17] text-slate-100">
      <header className="border-b border-white/10 bg-[#0b0f17]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/brand-assets/logo_dark.svg" alt="Nova Meet" className="h-9 w-auto" />
          </Link>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLang(lang === "en" ? "id" : "en")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
            >
              <Globe className="h-3.5 w-3.5" />
              {lang.toUpperCase()}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:inline-flex">
                  {t.hostSignedIn}: {user.display_name}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                <LogIn className="h-3.5 w-3.5" />
                {t.hostSignIn}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
              <span>Rust Axum + str0m SFU + Native Swift/Kotlin UniFFI</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              Instant video meetings in one single binary.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-400">
              Nova replaces Jitsi&apos;s Prosody, Jicofo, Videobridge, and Nginx containers with compiled Rust
              signaling, a pure-Rust WebRTC SFU, SQLite persistence, and drop-in{" "}
              <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-sky-300">/external_api.js</code>{" "}
              compatibility.
            </p>

            <form onSubmit={handleJoin} className="rounded-2xl border border-white/10 bg-[#121826] p-3 shadow-2xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={roomInput}
                  onChange={(e) => setRoomInput(e.target.value)}
                  placeholder={t.roomPlaceholder}
                  aria-label="Room name"
                  className="flex-1 rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setRoomInput(randomSlug())}
                  aria-label="Generate random room name"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <Shuffle className="h-4 w-4" />
                  <span className="sm:hidden">{t.randomRoom}</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
                >
                  {t.joinNow}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {error ? <p className="mt-2 px-2 text-xs text-rose-400">{error}</p> : null}
            </form>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <FeatureChip icon={Video} title="str0m SFU" desc="Multiplexed UDP media" />
              <FeatureChip icon={Shield} title="Argon2id + E2EE" desc="Locks, lobby, JWTs" />
              <FeatureChip icon={Smartphone} title="Swift & Kotlin" desc="Shared Rust UniFFI" />
            </div>
          </div>

          <section className="rounded-2xl border border-white/10 bg-[#121826] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{t.recentRooms}</h2>
              <span className="text-xs text-slate-400 tabular-nums">{rooms.length} rooms</span>
            </div>

            {rooms.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-400">
                {t.noRooms}
              </p>
            ) : (
              <div className="space-y-2.5">
                {rooms.slice(0, 6).map((r) => (
                  <Link
                    key={r.name}
                    to={`/room/${encodeURIComponent(r.name)}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 transition hover:border-blue-500/50 hover:bg-slate-900"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-semibold text-white">
                        {r.locked ? <Lock className="h-3.5 w-3.5 text-amber-400" /> : null}
                        <span className="truncate">{r.subject || r.name}</span>
                      </p>
                      <p className="truncate text-xs text-slate-400">/{r.name}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 tabular-nums">
                        <Users className="h-3 w-3 text-blue-400" /> {r.active_participants}
                      </span>
                      <ArrowRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function FeatureChip({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#121826]/70 p-3">
      <Icon className="h-4 w-4 text-blue-400" />
      <p className="mt-2 text-xs font-semibold text-white">{title}</p>
      <p className="text-[11px] text-slate-400">{desc}</p>
    </div>
  );
}
