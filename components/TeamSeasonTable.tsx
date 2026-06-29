type TeamSeasonRow = {
  team_abbreviation: string;
  games_played: number;
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored: number;
  runs_allowed: number;
  run_differential: number;
};

export default function TeamSeasonTable({
  rows,
}: {
  rows: TeamSeasonRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 text-slate-600">
          <tr>
            <th className="py-3">Team</th>
            <th className="py-3">GP</th>
            <th className="py-3">W</th>
            <th className="py-3">L</th>
            <th className="py-3">Win %</th>
            <th className="py-3">RS</th>
            <th className="py-3">RA</th>
            <th className="py-3">Diff</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.team_abbreviation} className="border-b border-slate-900">
              <td className="py-3 font-semibold text-slate-950">{row.team_abbreviation}</td>
              <td className="py-3 text-slate-800">{row.games_played}</td>
              <td className="py-3 text-slate-800">{row.wins}</td>
              <td className="py-3 text-slate-800">{row.losses}</td>
              <td className="py-3 text-slate-800">
                {row.winning_percentage ?? "--"}
              </td>
              <td className="py-3 text-slate-800">{row.runs_scored}</td>
              <td className="py-3 text-slate-800">{row.runs_allowed}</td>
              <td className="py-3 text-slate-800">{row.run_differential}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
