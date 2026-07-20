"use client";

import { useMemo, useState } from "react";

import type { MatchupPitcher, MatchupTeam } from "@/lib/data/matchups";

type Props = {
  pitchers: MatchupPitcher[];
  opponentTeams: MatchupTeam[];
  seasons: number[];
  initialPitcherTeam: string;
  initialPitcherId: number;
  initialOpponentTeam: string;
  initialSeason: number;
  canUpdate: boolean;
};

const normalizePitcherName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized.includes(",")) return normalized;
  const [last, first] = normalized.split(",").map((part) => part.trim());
  return `${first} ${last}`.trim();
};

const preferredPitcher = (pitchers: MatchupPitcher[]) =>
  [...pitchers].sort((a, b) => b.totalPitches - a.totalPitches).find((pitcher) => normalizePitcherName(pitcher.playerName) === "paul skenes")
  ?? [...pitchers].sort((a, b) => b.totalPitches - a.totalPitches || a.playerName.localeCompare(b.playerName))[0];

const pitcherTeamsForSeason = (pitchers: MatchupPitcher[], season: number) => {
  const teams = new Map<string, string>();
  for (const pitcher of pitchers) {
    if (pitcher.season === season && pitcher.teamAbbreviation) teams.set(pitcher.teamAbbreviation, pitcher.teamName ?? pitcher.teamAbbreviation);
  }
  return [...teams].map(([abbreviation, name]) => ({ abbreviation, name })).sort((a, b) => a.name.localeCompare(b.name));
};

export default function MatchupControls({ pitchers, opponentTeams, seasons, initialPitcherTeam, initialPitcherId, initialOpponentTeam, initialSeason, canUpdate }: Props) {
  const [season, setSeason] = useState(initialSeason);
  const [pitcherTeam, setPitcherTeam] = useState(initialPitcherTeam);
  const [pitcherId, setPitcherId] = useState(initialPitcherId);
  const [opponentTeam, setOpponentTeam] = useState(initialOpponentTeam);

  const pitcherTeams = useMemo(() => pitcherTeamsForSeason(pitchers, season), [pitchers, season]);
  const seasonPitchers = useMemo(() => pitchers.filter((pitcher) => pitcher.season === season), [pitchers, season]);
  const filteredPitchers = pitcherTeam ? seasonPitchers.filter((pitcher) => pitcher.teamAbbreviation === pitcherTeam) : seasonPitchers;
  const seasonOpponentTeams = opponentTeams.filter((team) => team.season === season);

  const changePitcherTeam = (nextTeam: string) => {
    setPitcherTeam(nextTeam);
    const candidates = nextTeam ? seasonPitchers.filter((pitcher) => pitcher.teamAbbreviation === nextTeam) : seasonPitchers;
    if (!candidates.some((pitcher) => pitcher.mlbPlayerId === pitcherId)) setPitcherId(preferredPitcher(candidates)?.mlbPlayerId ?? 0);
  };

  const changeSeason = (nextSeason: number) => {
    setSeason(nextSeason);
    const nextSeasonPitchers = pitchers.filter((pitcher) => pitcher.season === nextSeason);
    const nextPitcherTeams = pitcherTeamsForSeason(pitchers, nextSeason);
    const nextTeam = nextPitcherTeams.some((team) => team.abbreviation === pitcherTeam)
      ? pitcherTeam
      : nextPitcherTeams.find((team) => team.abbreviation === "PIT")?.abbreviation ?? nextPitcherTeams[0]?.abbreviation ?? "";
    setPitcherTeam(nextTeam);
    const nextCandidates = nextTeam ? nextSeasonPitchers.filter((pitcher) => pitcher.teamAbbreviation === nextTeam) : nextSeasonPitchers;
    const nextPitcher = nextCandidates.find((pitcher) => pitcher.mlbPlayerId === pitcherId) ?? preferredPitcher(nextCandidates);
    setPitcherId(nextPitcher?.mlbPlayerId ?? 0);
    const nextOpponents = opponentTeams.filter((team) => team.season === nextSeason);
    if (!nextOpponents.some((team) => team.teamAbbreviation === opponentTeam)) setOpponentTeam(nextOpponents.find((team) => team.teamAbbreviation === "CHC")?.teamAbbreviation ?? nextOpponents[0]?.teamAbbreviation ?? "");
  };

  const selectClass = "block w-full min-w-0 max-w-full truncate rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal text-slate-900 disabled:bg-slate-50 disabled:text-slate-500";

  return <form className="grid w-full min-w-0 gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 sm:p-5 lg:grid-cols-4 xl:grid-cols-5" aria-label="Matchup controls">
    <p className="text-sm leading-6 text-slate-600 md:col-span-2 lg:col-span-4 xl:col-span-5">Select a pitcher team first to narrow the pitcher list.</p>
    <label className="min-w-0 space-y-1.5 text-sm font-semibold text-slate-700"><span>Pitcher Team</span>{pitcherTeams.length ? <select name="pitcherTeam" value={pitcherTeam} onChange={(event) => changePitcherTeam(event.target.value)} className={selectClass}>{pitcherTeams.map((team) => <option key={team.abbreviation} value={team.abbreviation}>{team.name} ({team.abbreviation})</option>)}</select> : <select disabled className={selectClass}><option>Team data unavailable</option></select>}</label>
    <label className="min-w-0 space-y-1.5 text-sm font-semibold text-slate-700"><span>Pitcher</span><select name="pitcherId" value={pitcherId} onChange={(event) => setPitcherId(Number(event.target.value))} disabled={!filteredPitchers.length} className={selectClass}>{filteredPitchers.length ? filteredPitchers.map((pitcher) => <option key={pitcher.mlbPlayerId} value={pitcher.mlbPlayerId}>{pitcher.playerName} · {pitcher.primaryArchetypeName}</option>) : <option value={0}>No pitchers available</option>}</select></label>
    <label className="min-w-0 space-y-1.5 text-sm font-semibold text-slate-700"><span>Opponent Team</span><select name="team" value={opponentTeam} onChange={(event) => setOpponentTeam(event.target.value)} className={selectClass}>{seasonOpponentTeams.map((team) => <option key={team.teamAbbreviation} value={team.teamAbbreviation}>{team.teamName} ({team.teamAbbreviation})</option>)}</select></label>
    <label className="min-w-0 space-y-1.5 text-sm font-semibold text-slate-700"><span>Season</span><select name="season" value={season} onChange={(event) => changeSeason(Number(event.target.value))} className={selectClass}>{seasons.map((availableSeason) => <option key={availableSeason} value={availableSeason}>{availableSeason}</option>)}</select></label>
    <button disabled={!canUpdate || !filteredPitchers.length || !seasonOpponentTeams.length} className="w-full self-end rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">Update Matchup</button>
    {!canUpdate ? <p className="text-sm font-medium text-blue-700 md:col-span-2 lg:col-span-4 xl:col-span-5">Custom matchup updates are available with AXScout Premium.</p> : null}
    {!filteredPitchers.length ? <p className="text-sm text-amber-700 md:col-span-2 lg:col-span-4 xl:col-span-5">No pitchers with archetype data are available for this team yet.</p> : null}
  </form>;
}
