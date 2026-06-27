export type RecentTeamGame = {
  mlb_game_pk: number;
  game_date: string;
  opponent_abbreviation: string;
  is_home: boolean;
  wins: number;
  losses: number;
  runs_scored: number | null;
  runs_allowed: number | null;
  run_differential: number | null;
};

function formatGameDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDifferential(value: number | null) {
  if (value === null) {
    return "--";
  }

  return value > 0 ? `+${value}` : value;
}

export default function RecentTeamGamesTable({
  games,
}: {
  games: RecentTeamGame[];
}) {
  if (!games.length) {
    return <p className="text-sm text-slate-400">No completed games found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="py-3 pr-4">Date</th>
            <th className="py-3 pr-4">Opponent</th>
            <th className="py-3 pr-4">Home/Away</th>
            <th className="py-3 pr-4">Result</th>
            <th className="py-3 pr-4">RS</th>
            <th className="py-3 pr-4">RA</th>
            <th className="py-3">Diff</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.mlb_game_pk} className="border-b border-slate-900">
              <td className="py-3 pr-4 text-slate-300">
                {formatGameDate(game.game_date)}
              </td>
              <td className="py-3 pr-4 font-semibold text-white">
                {game.opponent_abbreviation}
              </td>
              <td className="py-3 pr-4 text-slate-300">
                {game.is_home ? "Home" : "Away"}
              </td>
              <td className="py-3 pr-4 font-semibold text-slate-200">
                {game.wins > game.losses ? "W" : "L"}
              </td>
              <td className="py-3 pr-4 text-slate-300">
                {game.runs_scored ?? "--"}
              </td>
              <td className="py-3 pr-4 text-slate-300">
                {game.runs_allowed ?? "--"}
              </td>
              <td className="py-3 text-slate-300">
                {formatDifferential(game.run_differential)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
