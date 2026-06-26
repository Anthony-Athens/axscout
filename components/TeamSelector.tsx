"use client";

import { useState, useTransition } from "react";

import { toggleFavoriteTeam } from "@/app/dashboard/actions";

type Team = {
  id: number;
  abbreviation: string;
  name: string;
  league: string | null;
  division: string | null;
};

type TeamSelectorProps = {
  teams: Team[];
  favoriteTeamIds: number[];
  isLoggedIn: boolean;
};

export default function TeamSelector({
  teams,
  favoriteTeamIds,
  isLoggedIn,
}: TeamSelectorProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateFavorite(teamId: number, isFavorite: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleFavoriteTeam(teamId, isFavorite);
      setError(result?.error ?? null);
    });
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const isFavorite = favoriteTeamIds.includes(team.id);

          return (
            <button
              type="button"
              key={team.id}
              disabled={!isLoggedIn || pending}
              aria-pressed={isFavorite}
              onClick={() => updateFavorite(team.id, isFavorite)}
              className={`rounded-lg border p-4 text-left transition ${
                isFavorite
                  ? "border-blue-400 bg-blue-500/10"
                  : "border-slate-800 bg-slate-900 hover:border-blue-400 hover:bg-slate-800"
              } ${!isLoggedIn || pending ? "cursor-wait opacity-60" : ""}`}
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

              <p className="mt-3 text-xs text-slate-500">
                {isFavorite ? "Selected" : "Click to select"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
