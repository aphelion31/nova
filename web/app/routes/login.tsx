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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#040404] px-4 text-white">
      <div className="w-full max-w-md rounded-[8px] border border-[#3D3D3D] bg-[#141414] p-8 shadow-2xl">
        <Link to="/" className="mb-6 flex items-center justify-center">
          <img src="/brand-assets/logo_dark.svg" alt="Nova Meet" className="h-9 w-auto" />
        </Link>

        <div className="mb-6 grid grid-cols-2 rounded-[6px] bg-[#292929] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-[4px] py-2 transition ${mode === "login" ? "bg-[#246FE5] text-white" : "text-[#C2C2C2] hover:text-white"}`}
          >
            Host Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`rounded-[4px] py-2 transition ${mode === "register" ? "bg-[#246FE5] text-white" : "text-[#C2C2C2] hover:text-white"}`}
          >
            Create Host
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "register" ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]" htmlFor="display_name">
                Display name
              </label>
              <input
                id="display_name"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alice"
                className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
              />
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="host@nova.local"
              className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#C2C2C2]" htmlFor="password">
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
              className="w-full rounded-[6px] border border-[#3D3D3D] bg-[#292929] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3] outline-none focus:border-[#4687ED]"
            />
          </div>

          {error ? <p className="rounded-[6px] bg-[#CB2233]/20 px-3 py-2 text-xs text-[#F24D5F]">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-[6px] bg-[#246FE5] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#4687ED] disabled:opacity-50"
          >
            {busy ? "Signing in…" : mode === "login" ? "Sign in" : "Register host"}
          </button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#A3A3A3]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#189B55]" />
          Protected with Argon2id + HttpOnly HMAC sessions
        </p>
      </div>
    </div>
  );
}
