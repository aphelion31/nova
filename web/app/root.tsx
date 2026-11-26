import { useEffect } from "react";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, Link } from "react-router";
import type { Route } from "./+types/root";
import "./app.css";

const THEME_INIT = `(function(){try{var t=localStorage.getItem("nova.theme")||"dark";if(t==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}else{document.documentElement.style.colorScheme="light";}}catch(e){document.documentElement.classList.add("dark");}})();`;

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta
          name="description"
          content="Nova — Lightweight Rust + str0m SFU + React Router WebRTC video conferencing"
        />
        <meta name="theme-color" content="#0b0f17" />
        <title>Nova Meet</title>
        <link rel="icon" type="image/svg+xml" href="/brand-assets/favicon.svg" />
        <link rel="apple-touch-icon" href="/brand-assets/icon.svg" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <Meta />
        <Links />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0b0f17] text-sm text-slate-400">
      Loading Nova…
    </div>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const title = isRouteErrorResponse(error) ? `${error.status}` : "Something went wrong";
  const detail = isRouteErrorResponse(error)
    ? error.statusText
    : error instanceof Error
      ? error.message
      : "Unexpected error";
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-[var(--ink-secondary)]">{detail}</p>
      <Link to="/" className="mt-6 inline-block rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white">
        Back to Nova
      </Link>
    </main>
  );
}
