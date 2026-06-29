import Link from "next/link";

export type ComparisonRow = {
  label: string;
  teamAValue: string | number;
  teamBValue: string | number;
};

export type LeaderboardPlayer = {
  mlb_player_id: number;
  full_name: string;
  metrics: Array<{ label: string; value: string | number }>;
};

export type SnapshotSection = {
  title: string;
  rows: Array<{ label: string; value: string | number }>;
};

export function TeamSnapshotCard({
  side,
  teamName,
  abbreviation,
  sections,
}: {
  side: "Team A" | "Team B";
  teamName: string;
  abbreviation: string;
  sections: SnapshotSection[];
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        {side}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 text-lg font-semibold text-slate-950">{teamName}</h3>
        <span className="shrink-0 text-sm font-semibold text-slate-500">
          {abbreviation}
        </span>
      </div>
      <div className="mt-5 space-y-5">
        {sections.map((section) => (
          <section key={section.title}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              {section.title}
            </h4>
            <dl className="mt-2 divide-y divide-slate-100 border-y border-slate-200">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-4 py-2.5"
                >
                  <dt className="text-sm text-slate-600">{row.label}</dt>
                  <dd className="text-right text-sm font-semibold text-slate-950">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </article>
  );
}

export function MetricComparison({
  teamA,
  teamB,
  rows,
}: {
  teamA: string;
  teamB: string;
  rows: ComparisonRow[];
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold">
        <span className="text-blue-600">{teamA}</span>
        <span className="text-center text-slate-600">Metric</span>
        <span className="text-right text-emerald-700">{teamB}</span>
      </div>
      <dl className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] items-center gap-2 px-4 py-3"
          >
            <dd className="text-sm font-semibold text-slate-950">
              {row.teamAValue}
            </dd>
            <dt className="text-center text-xs text-slate-600 sm:text-sm">
              {row.label}
            </dt>
            <dd className="text-right text-sm font-semibold text-slate-950">
              {row.teamBValue}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PlayerLeaderboard({
  team,
  title,
  detail,
  players,
  emptyMessage = "No qualified player data available.",
}: {
  team: string;
  title: string;
  detail?: string;
  players: LeaderboardPlayer[];
  emptyMessage?: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <span className="text-sm font-semibold text-blue-600">{team}</span>
      </div>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}

      {players.length ? (
        <ol className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
          {players.map((player, index) => (
            <li key={player.mlb_player_id} className="py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
                  {index + 1}
                </span>
                <Link
                  href={`/trends/individual?playerId=${player.mlb_player_id}`}
                  className="min-w-0 truncate font-semibold text-slate-950 hover:text-blue-600"
                >
                  {player.full_name}
                </Link>
              </div>
              <dl
                className={`mt-3 grid gap-2 pl-10 ${
                  player.metrics.length >= 6
                    ? "grid-cols-2 sm:grid-cols-4"
                    : player.metrics.length === 5
                      ? "grid-cols-2 sm:grid-cols-5"
                      : player.metrics.length === 4
                        ? "grid-cols-2 sm:grid-cols-4"
                        : "grid-cols-3"
                }`}
              >
                {player.metrics.map((metric) => (
                  <div key={metric.label} className="min-w-0">
                    <dt className="text-xs font-medium text-slate-500">
                      {metric.label}
                    </dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-slate-900">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-slate-600">{emptyMessage}</p>
      )}
    </article>
  );
}
