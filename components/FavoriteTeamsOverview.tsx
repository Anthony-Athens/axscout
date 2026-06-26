type FavoriteTeamRow = {
  team_abbreviation: string;
  games_played: number;
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored: number;
  runs_allowed: number;
  run_differential: number;
};

export default function FavoriteTeamsOverview({
  teams,
}: {
  teams: FavoriteTeamRow[];
}) {
  if (!teams.length) {
    return (
      <p className="text-sm text-slate-400">
        Select favorite teams below to personalize your dashboard.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <div
          key={team.team_abbreviation}
          className="rounded-xl border border-slate-800 bg-slate-950 p-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">
              {team.team_abbreviation}
            </h3>
            <span className="text-sm text-slate-400">
              {team.wins}-{team.losses}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Win %</p>
              <p className="font-semibold text-slate-200">
                {team.winning_percentage ?? "--"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Run Diff</p>
              <p className="font-semibold text-slate-200">
                {team.run_differential}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Runs Scored</p>
              <p className="font-semibold text-slate-200">
                {team.runs_scored}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Runs Allowed</p>
              <p className="font-semibold text-slate-200">
                {team.runs_allowed}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}