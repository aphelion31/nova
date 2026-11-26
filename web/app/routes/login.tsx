import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ShieldCheck } from "lucide-react";
import { api } from "~/lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") {
        await api.login(email, password);
      } else {
        await api.register(email, displayName, password);
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 text-slate-100">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#121826] p-8 shadow-2xl">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src="/brand-assets/logo_dark.svg" alt="Nova" className="h-9 w-auto" />
        </Link>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-950 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg py-2 transition ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-400"}`}
          >
            Host Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-lg py-2 transition ${mode === "register" ? "bg-blue-600 text-white" : "text-slate-400"}`}
          >
            Create Host
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="display_name">
                Display name
              </label>
              <input
                id="display_name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@nova.local"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500"
            />
          </div>

          {error ? <p className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Signing in…" : mode === "login" ? "Sign in" : "Register host"}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          Protected with Argon2id + HttpOnly HMAC sessions
        </p>
      </div>
    </div>
  );
}
