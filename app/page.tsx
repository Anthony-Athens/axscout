import Link from "next/link";

export default function Home() {
  return (
    <section className="space-y-10">
      <div className="max-w-3xl space-y-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
          AX Scout
        </p>

        <h1 className="text-5xl font-bold tracking-tight">
          Baseball intelligence powered by data.
        </h1>

        <p className="text-lg text-slate-300">
          Track team trends, evaluate player performance, generate scouting
          reports, and explore prediction-driven MLB insights.
        </p>

        <div className="flex gap-4">
          <Link
            href="/dashboard"
            className="rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400"
          >
            View Dashboard
          </Link>

          <Link
            href="/scouting-report"
            className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-200 hover:bg-slate-900"
          >
            Build Scouting Report
          </Link>
        </div>
      </div>
    </section>
  );
}