import Link from "next/link";

export type InjuryReportItem = {
  id: number;
  mlbPlayerId: number | null;
  playerName: string;
  status: string | null;
  injuryDescription: string | null;
  injuredListDesignation: string | null;
  datePlaced: string | null;
  expectedReturn: string | null;
};

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function InjuryReportCard({
  teamName,
  abbreviation,
  injuries,
}: {
  teamName: string;
  abbreviation: string;
  injuries: InjuryReportItem[];
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
            {abbreviation} Injuries
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-950">
            {teamName}
          </h3>
        </div>
        <span className="text-sm font-semibold text-slate-500">
          {injuries.length} active
        </span>
      </div>

      {injuries.length ? (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-200">
          {injuries.map((injury) => {
            const placed = formatDate(injury.datePlaced);
            return (
              <li key={injury.id} className="py-4 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  {injury.mlbPlayerId ? (
                    <Link
                      href={`/trends/individual?playerId=${injury.mlbPlayerId}`}
                      className="font-semibold text-slate-950 hover:text-blue-600"
                    >
                      {injury.playerName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-slate-950">
                      {injury.playerName}
                    </span>
                  )}
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {injury.injuredListDesignation ?? injury.status ?? "Injured"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-700">
                  {injury.injuryDescription ?? "Injury details unavailable"}
                </p>
                {(placed || injury.expectedReturn) && (
                  <p className="mt-1 text-xs text-slate-500">
                    {placed ? `Placed ${placed}` : null}
                    {placed && injury.expectedReturn ? " | " : null}
                    {injury.expectedReturn
                      ? `Expected return: ${injury.expectedReturn}`
                      : null}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-5 text-sm text-slate-600">
          No active injuries found.
        </p>
      )}
    </article>
  );
}
