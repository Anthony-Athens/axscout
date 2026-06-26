type FavoriteTeamRow = {
  team_abbreviation: string;
  games_played: number;
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored: number;
  runs_allowed: number;
  run_differential: number;
  rolling_14?: {
    games_played: number;
    wins: number;
    losses: number;
    winning_percentage: number | null;
    runs_scored_per_game: number | null;
    runs_allowed_per_game: number | null;
    run_differential_per_game: number | null;
  } | null;
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
              <p className="text-slate-500">Season Win %</p>
              <p className="font-semibold text-slate-200">
                {team.winning_percentage ?? "--"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Season Diff</p>
              <p className="font-semibold text-slate-200">
                {team.run_differential}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Last 14</p>
              <p className="font-semibold text-slate-200">
                {team.rolling_14
                  ? `${team.rolling_14.wins}-${team.rolling_14.losses}`
                  : "--"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Last 14 Diff/G</p>
              <p className="font-semibold text-slate-200">
                {team.rolling_14?.run_differential_per_game ?? "--"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">RS/G</p>
              <p className="font-semibold text-slate-200">
                {team.rolling_14?.runs_scored_per_game ?? "--"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">RA/G</p>
              <p className="font-semibold text-slate-200">
                {team.rolling_14?.runs_allowed_per_game ?? "--"}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}