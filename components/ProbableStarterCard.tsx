import Link from "next/link";

export type ProbableStarter = {
  mlbGamePk: number;
  gameDate: string;
  opponentAbbreviation: string;
  isHome: boolean;
  mlbPlayerId: number | null;
  fullName: string | null;
  throws: string | null;
  era: number | null;
  whip: number | null;
  strikeouts: number | null;
};

function formatRate(value: number | null) {
  return value === null ? "Not announced" : value.toFixed(2);
}

function formatGameDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function ProbableStarterCard({
  side,
  teamName,
  abbreviation,
  starters,
}: {
  side: "Team A" | "Team B";
  teamName: string;
  abbreviation: string;
  starters: ProbableStarter[];
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {side}
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {teamName}
          </h3>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {abbreviation}
        </span>
      </div>

      {starters.length > 0 ? (
        <div className="mt-5 divide-y divide-slate-100 border-t border-slate-200">
          {starters.map((pitcher) => (
            <div
              key={pitcher.mlbGamePk}
              className="py-4 first:pt-4 last:pb-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    {formatGameDate(pitcher.gameDate)} · {pitcher.isHome ? "vs" : "at"}{" "}
                    {pitcher.opponentAbbreviation}
                  </p>
                  {pitcher.fullName && pitcher.mlbPlayerId ? (
                    <Link
                      href={`/trends/individual?playerId=${pitcher.mlbPlayerId}`}
                      className="mt-1 block font-semibold text-slate-950 hover:text-blue-600"
                    >
                      {pitcher.fullName}
                    </Link>
                  ) : (
                    <p className="mt-1 font-semibold text-slate-950">
                      {pitcher.fullName ?? "Not announced"}
                    </p>
                  )}
                </div>
                {pitcher.throws && (
                  <span className="text-xs font-medium text-slate-500">
                    Throws {pitcher.throws}
                  </span>
                )}
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-3">
                <div>
                  <dt className="text-xs font-medium text-slate-500">ERA</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {formatRate(pitcher.era)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">WHIP</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {formatRate(pitcher.whip)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">K</dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-950">
                    {pitcher.strikeouts ?? "--"}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-600">No upcoming games found</p>
      )}
    </article>
  );
}
