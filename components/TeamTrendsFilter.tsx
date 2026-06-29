"use client";

import { useRouter } from "next/navigation";

export type TeamFilterOption = {
  team_key: number;
  abbreviation: string;
  name: string;
};

export default function TeamTrendsFilter({
  teams,
  selectedTeam,
}: {
  teams: TeamFilterOption[];
  selectedTeam: string;
}) {
  const router = useRouter();

  function selectTeam(team: string) {
    router.push(`/trends/team?team=${encodeURIComponent(team)}`);
  }

  return (
    <form action="/trends/team" className="flex max-w-xl items-end gap-3">
      <div className="min-w-0 flex-1">
        <label
          htmlFor="team-filter"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Team
        </label>
        <select
          id="team-filter"
          name="team"
          value={selectedTeam}
          disabled={!teams.length}
          onChange={(event) => selectTeam(event.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
        >
          {teams.map((team) => (
            <option key={team.team_key} value={team.abbreviation}>
              {team.name} ({team.abbreviation})
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={!teams.length}
        className="shrink-0 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        View Team
      </button>
    </form>
  );
}
