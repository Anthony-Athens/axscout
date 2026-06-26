type GameRow = {
  mlb_game_pk: number;
  game_date: string;
  home_team: {
    abbreviation: string;
  } | null;
  away_team: {
    abbreviation: string;
  } | null;
  home_score: number | null;
  away_score: number | null;
  status: string | null;
};

export default function TodaysGamesTable({ games }: { games: GameRow[] }) {
  if (!games.length) {
    return (
      <p className="text-sm text-slate-400">
        No games found for today.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-800 text-slate-400">
          <tr>
            <th className="py-3">Matchup</th>
            <th className="py-3">Status</th>
            <th className="py-3">Score</th>
          </tr>
        </thead>

        <tbody>
          {games.map((game) => (
            <tr key={game.mlb_game_pk} className="border-b border-slate-900">
              <td className="py-3 font-semibold text-white">
                {game.away_team?.abbreviation ?? "TBD"} @{" "}
                {game.home_team?.abbreviation ?? "TBD"}
              </td>

              <td className="py-3 text-slate-300">{game.status ?? "--"}</td>

              <td className="py-3 text-slate-300">
                {game.away_score ?? "-"} - {game.home_score ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}