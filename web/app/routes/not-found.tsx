import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0b0f17] px-4 text-center text-slate-100">
      <h1 className="text-4xl font-extrabold">404</h1>
      <p className="mt-2 text-sm text-slate-400">That meeting route could not be found.</p>
      <Link to="/" className="mt-6 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">
        Return to Nova
      </Link>
    </div>
  );
}
