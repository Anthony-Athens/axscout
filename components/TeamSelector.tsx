type Team = {
  id: number;
  abbreviation: string;
  name: string;
  league: string | null;
  division: string | null;
};

type TeamSelectorProps = {
  teams: Team[];
};

export default function TeamSelector({ teams }: TeamSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <button
          key={team.id}
          className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left hover:border-blue-400 hover:bg-slate-800"
        >
          <div className="flex items-center justify-between">
            <p className="font-semibold text-white">{team.name}</p>
            <span className="rounded bg-slate-800 px-2 py-1 text-xs text-blue-300">
              {team.abbreviation}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            {team.league} {team.division}
          </p>
        </button>
      ))}
    </div>
  );
}