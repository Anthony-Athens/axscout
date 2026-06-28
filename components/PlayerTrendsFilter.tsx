"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type PlayerFilterOption = {
  player_key: number;
  mlb_player_id: number;
  full_name: string;
  current_team_abbreviation: string | null;
  primary_position: string | null;
};

export default function PlayerTrendsFilter({
  players,
  selectedPlayerId,
}: {
  players: PlayerFilterOption[];
  selectedPlayerId: number | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [playerId, setPlayerId] = useState(
    selectedPlayerId ? String(selectedPlayerId) : ""
  );
  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return players;
    }

    return players.filter((player) =>
      [
        player.full_name,
        player.current_team_abbreviation,
        player.primary_position,
        String(player.mlb_player_id),
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [players, search]);
  const visiblePlayerId = filteredPlayers.some(
    (player) => String(player.mlb_player_id) === playerId
  )
    ? playerId
    : "";

  function viewPlayer(nextPlayerId: string) {
    setPlayerId(nextPlayerId);
    if (nextPlayerId) {
      router.push(
        `/trends/individual?playerId=${encodeURIComponent(nextPlayerId)}`
      );
    }
  }

  return (
    <form
      action="/trends/individual"
      className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_auto] md:items-end"
    >
      <div className="min-w-0">
        <label
          htmlFor="player-search"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Search players
        </label>
        <input
          id="player-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name, team, position, or MLB ID"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
        />
      </div>

      <div className="min-w-0">
        <label
          htmlFor="player-filter"
          className="mb-2 block text-sm font-medium text-slate-200"
        >
          Player
        </label>
        <select
          id="player-filter"
          name="playerId"
          value={visiblePlayerId}
          disabled={!filteredPlayers.length}
          onChange={(event) => viewPlayer(event.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-blue-400 disabled:opacity-60"
        >
          {!filteredPlayers.length && <option value="">No players found</option>}
          {filteredPlayers.length > 0 && !visiblePlayerId && (
            <option value="">Select a player</option>
          )}
          {filteredPlayers.map((player) => (
            <option key={player.player_key} value={player.mlb_player_id}>
              {player.full_name}
              {player.current_team_abbreviation
                ? ` (${player.current_team_abbreviation})`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        disabled={!visiblePlayerId}
        className="rounded-lg bg-blue-500 px-5 py-3 font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
      >
        View Player
      </button>
    </form>
  );
}
