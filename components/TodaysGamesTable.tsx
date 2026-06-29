type GameRow = {
  mlb_game_pk: number;
  game_date: string;


  home_team:
  | { abbreviation: string }
  | { abbreviation: string }[]
  | null;
  away_team:
  | { abbreviation: string }
  | { abbreviation: string }[]
  | null;



  home_score: number | null;
  away_score: number | null;
  status: string | null;
};

export default function TodaysGamesTable({ games }: { games: GameRow[] }) {
  if (!games.length) {
    return (
      <p className="text-sm text-slate-600">
        No games found for today.
      </p>
    );
  }

  const getAbbreviation = (
    team: { abbreviation: string } | { abbreviation: string }[] | null
  ) => {
    if (Array.isArray(team)) {
      return team[0]?.abbreviation ?? "TBD";
  }

    return team?.abbreviation ?? "TBD";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="py-3">Matchup</th>
            <th className="py-3">Status</th>
            <th className="py-3">Score</th>
          </tr>
        </thead>

        <tbody>
          {games.map((game) => (
            <tr key={game.mlb_game_pk} className="border-b border-slate-900">
              <td className="py-3 font-semibold text-slate-950">
                {getAbbreviation(game.away_team)} @ {getAbbreviation(game.home_team)}
              </td>

              <td className="py-3 text-slate-800">{game.status ?? "--"}</td>

              <td className="py-3 text-slate-800">
                {game.away_score ?? "-"} - {game.home_score ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
