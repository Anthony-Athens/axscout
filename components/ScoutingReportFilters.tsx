"use client";

import { useRouter } from "next/navigation";

export type ScoutingTeamOption = {
  team_key: number;
  abbreviation: string;
  name: string;
};

export default function ScoutingReportFilters({
  teams,
  teamA,
  teamB,
}: {
  teams: ScoutingTeamOption[];
  teamA: string;
  teamB: string;
}) {
  const router = useRouter();

  function updateMatchup(nextTeamA: string, nextTeamB: string) {
    router.push(
      `/scouting-report?teamA=${encodeURIComponent(nextTeamA)}&teamB=${encodeURIComponent(nextTeamB)}`
    );
  }

  return (
    <form
      action="/scouting-report"
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
    >
      <div className="min-w-0">
        <label
          htmlFor="scouting-team-a"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Team A
        </label>
        <select
          id="scouting-team-a"
          name="teamA"
          value={teamA}
          disabled={!teams.length}
          onChange={(event) => updateMatchup(event.target.value, teamB)}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
        >
          {teams.map((team) => (
            <option key={team.team_key} value={team.abbreviation}>
              {team.name} ({team.abbreviation})
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0">
        <label
          htmlFor="scouting-team-b"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Team B
        </label>
        <select
          id="scouting-team-b"
          name="teamB"
          value={teamB}
          disabled={!teams.length}
          onChange={(event) => updateMatchup(teamA, event.target.value)}
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
        className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
      >
        Compare
      </button>
    </form>
  );
}
