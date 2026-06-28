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

export function TeamSnapshotCard({
  side,
  teamName,
  abbreviation,
  rows,
}: {
  side: "Team A" | "Team B";
  teamName: string;
  abbreviation: string;
  rows: Array<{ label: string; value: string | number }>;
}) {
  return (
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase text-blue-400">{side}</p>
      <div className="mt-2 flex items-baseline justify-between gap-4">
        <h3 className="min-w-0 text-lg font-semibold text-white">{teamName}</h3>
        <span className="shrink-0 text-sm font-semibold text-slate-400">
          {abbreviation}
        </span>
      </div>
      <dl className="mt-5 divide-y divide-slate-800 border-t border-slate-800">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 py-3"
          >
            <dt className="text-sm text-slate-400">{row.label}</dt>
            <dd className="text-sm font-semibold text-white">{row.value}</dd>
          </div>
        ))}
      </dl>
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
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] border-b border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-semibold">
        <span className="text-blue-300">{teamA}</span>
        <span className="text-center text-slate-500">Metric</span>
        <span className="text-right text-emerald-300">{teamB}</span>
      </div>
      <dl className="divide-y divide-slate-800">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,0.8fr)_minmax(0,1fr)] items-center gap-2 px-4 py-3"
          >
            <dd className="text-sm font-semibold text-white">
              {row.teamAValue}
            </dd>
            <dt className="text-center text-xs text-slate-400 sm:text-sm">
              {row.label}
            </dt>
            <dd className="text-right text-sm font-semibold text-white">
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
    <article className="rounded-lg border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-sm font-semibold text-slate-500">{team}</span>
      </div>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}

      {players.length ? (
        <ol className="mt-4 divide-y divide-slate-800 border-t border-slate-800">
          {players.map((player, index) => (
            <li key={player.mlb_player_id} className="py-4">
              <div className="flex items-center gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                  {index + 1}
                </span>
                <Link
                  href={`/trends/individual?playerId=${player.mlb_player_id}`}
                  className="min-w-0 truncate font-semibold text-white hover:text-blue-300"
                >
                  {player.full_name}
                </Link>
              </div>
              <dl
                className={`mt-3 grid gap-2 pl-10 ${
                  player.metrics.length >= 5
                    ? "grid-cols-2 sm:grid-cols-5"
                    : player.metrics.length === 4
                      ? "grid-cols-2 sm:grid-cols-4"
                      : "grid-cols-3"
                }`}
              >
                {player.metrics.map((metric) => (
                  <div key={metric.label} className="min-w-0">
                    <dt className="text-xs text-slate-500">{metric.label}</dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-slate-200">
                      {metric.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm text-slate-400">{emptyMessage}</p>
      )}
    </article>
  );
}
