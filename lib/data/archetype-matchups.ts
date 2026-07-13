import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SampleQuality = "low" | "medium" | "high";
export type MatchupSort = "best_ops" | "worst_ops" | "highest_xwoba" | "lowest_strikeout";
export type TeamArchetypeMatchup = {
  teamAbbreviation: string; teamName: string; plateAppearances: number;
  ops: number | null; xwoba: number | null; strikeoutRate: number | null;
  walkRate: number | null; hardHitRate: number | null;
  sampleQuality: SampleQuality; periodStart: string; periodEnd: string;
};
export type BatterArchetypeMatchup = {
  mlbBatterId: number; fullName: string; teamAbbreviation: string | null;
  plateAppearances: number; ops: number | null; xwoba: number | null;
  homeRuns: number; strikeoutRate: number | null; walkRate: number | null;
  sampleQuality: SampleQuality; periodStart: string; periodEnd: string;
};
export type ArchetypeMatchupSummary = {
  teams: TeamArchetypeMatchup[];
  batters: BatterArchetypeMatchup[];
};
export type StarterArchetypeMatchup = {
  mlbPlayerId: number; pitcherName: string; opponentAbbreviation: string;
  archetypeId: string; archetypeName: string; archetypeSlug: string;
  teamPerformance: TeamArchetypeMatchup | null;
};
export type MatchupResult<T> = { data: T; error: string | null };

type TeamRow = {
  team_abbreviation: string; plate_appearances: number | null; ops: number | null;
  xwoba: number | null; strikeout_rate: number | null; walk_rate: number | null;
  hard_hit_rate: number | null; sample_quality: SampleQuality;
  period_start: string; period_end: string;
};
type BatterRow = {
  mlb_batter_id: number; plate_appearances: number | null; ops: number | null;
  xwoba: number | null; home_runs: number | null; strikeout_rate: number | null;
  walk_rate: number | null; sample_quality: SampleQuality;
  period_start: string; period_end: string;
};

function sortColumn(sort: MatchupSort) {
  if (sort === "highest_xwoba") return { column: "xwoba", ascending: false };
  if (sort === "lowest_strikeout") return { column: "strikeout_rate", ascending: true };
  return { column: "ops", ascending: sort === "worst_ops" };
}

export async function getTeamVsArchetype(archetypeId: string, sort: MatchupSort = "best_ops"): Promise<MatchupResult<TeamArchetypeMatchup[]>> {
  const supabase = await createClient();
  const order = sortColumn(sort);
  const { data, error } = await supabase.from("team_vs_pitcher_archetype").select("team_abbreviation,plate_appearances,ops,xwoba,strikeout_rate,walk_rate,hard_hit_rate,sample_quality,period_start,period_end").eq("archetype_id", archetypeId).order("season", { ascending: false }).order("period_end", { ascending: false }).order(order.column, { ascending: order.ascending, nullsFirst: false }).limit(250);
  if (error) return { data: [], error: error.message };
  const allRows = (data ?? []) as TeamRow[];
  const latestPeriodEnd = allRows[0]?.period_end;
  const rows = latestPeriodEnd ? allRows.filter((row) => row.period_end === latestPeriodEnd) : [];
  const abbreviations = [...new Set(rows.map((row) => row.team_abbreviation))];
  const { data: teams } = abbreviations.length ? await supabase.from("dim_teams").select("abbreviation,name").in("abbreviation", abbreviations) : { data: [] };
  const names = new Map(((teams ?? []) as { abbreviation: string; name: string }[]).map((team) => [team.abbreviation, team.name]));
  return { data: rows.map((row) => ({ teamAbbreviation: row.team_abbreviation, teamName: names.get(row.team_abbreviation) ?? row.team_abbreviation, plateAppearances: row.plate_appearances ?? 0, ops: row.ops, xwoba: row.xwoba, strikeoutRate: row.strikeout_rate, walkRate: row.walk_rate, hardHitRate: row.hard_hit_rate, sampleQuality: row.sample_quality, periodStart: row.period_start, periodEnd: row.period_end })), error: null };
}

export async function getBattersVsArchetype(archetypeId: string, sort: MatchupSort = "best_ops"): Promise<MatchupResult<BatterArchetypeMatchup[]>> {
  const supabase = await createClient();
  const order = sortColumn(sort);
  const { data, error } = await supabase.from("batter_vs_pitcher_archetype").select("mlb_batter_id,plate_appearances,ops,xwoba,home_runs,strikeout_rate,walk_rate,sample_quality,period_start,period_end").eq("archetype_id", archetypeId).order("season", { ascending: false }).order("period_end", { ascending: false }).order(order.column, { ascending: order.ascending, nullsFirst: false }).limit(500);
  if (error) return { data: [], error: error.message };
  const allRows = (data ?? []) as BatterRow[];
  const latestPeriodEnd = allRows[0]?.period_end;
  const rows = latestPeriodEnd ? allRows.filter((row) => row.period_end === latestPeriodEnd) : [];
  const ids = [...new Set(rows.map((row) => row.mlb_batter_id))];
  const { data: players } = ids.length ? await supabase.from("dim_players").select("mlb_player_id,full_name,current_team_abbreviation").in("mlb_player_id", ids) : { data: [] };
  type Player = { mlb_player_id: number; full_name: string | null; current_team_abbreviation: string | null };
  const playerMap = new Map(((players ?? []) as Player[]).map((player) => [player.mlb_player_id, player]));
  return { data: rows.map((row) => { const player = playerMap.get(row.mlb_batter_id); return { mlbBatterId: row.mlb_batter_id, fullName: player?.full_name ?? `MLB batter ${row.mlb_batter_id}`, teamAbbreviation: player?.current_team_abbreviation ?? null, plateAppearances: row.plate_appearances ?? 0, ops: row.ops, xwoba: row.xwoba, homeRuns: row.home_runs ?? 0, strikeoutRate: row.strikeout_rate, walkRate: row.walk_rate, sampleQuality: row.sample_quality, periodStart: row.period_start, periodEnd: row.period_end }; }), error: null };
}

export async function getArchetypeMatchupSummary(archetypeId: string): Promise<MatchupResult<ArchetypeMatchupSummary>> {
  const [teams, batters] = await Promise.all([getTeamVsArchetype(archetypeId), getBattersVsArchetype(archetypeId)]);
  return { data: { teams: teams.data.slice(0, 5), batters: batters.data.slice(0, 5) }, error: teams.error ?? batters.error };
}

export async function getStarterArchetypeMatchupForScoutingReport(starters: { mlbPlayerId: number; pitcherName: string; opponentAbbreviation: string }[]): Promise<MatchupResult<StarterArchetypeMatchup[]>> {
  if (!starters.length) return { data: [], error: null };
  const supabase = await createClient();
  const pitcherIds = [...new Set(starters.map((starter) => starter.mlbPlayerId))];
  const { data: profiles, error } = await supabase.from("pitcher_profiles").select("mlb_player_id,primary_archetype_id,season,refreshed_at").in("mlb_player_id", pitcherIds).not("primary_archetype_id", "is", null).order("season", { ascending: false }).order("refreshed_at", { ascending: false });
  if (error) return { data: [], error: error.message };
  type Profile = { mlb_player_id: number; primary_archetype_id: string; season: number; refreshed_at: string };
  const latest = new Map<number, Profile>();
  for (const profile of (profiles ?? []) as Profile[]) if (!latest.has(profile.mlb_player_id)) latest.set(profile.mlb_player_id, profile);
  const archetypeIds = [...new Set([...latest.values()].map((profile) => profile.primary_archetype_id))];
  if (!archetypeIds.length) return { data: [], error: null };
  const [{ data: archetypes }, { data: matchups }] = await Promise.all([
    supabase.from("pitcher_archetypes").select("archetype_id,archetype_name,archetype_slug").in("archetype_id", archetypeIds),
    supabase.from("team_vs_pitcher_archetype").select("archetype_id,team_abbreviation,plate_appearances,ops,xwoba,strikeout_rate,walk_rate,hard_hit_rate,sample_quality,period_start,period_end").in("archetype_id", archetypeIds).in("team_abbreviation", [...new Set(starters.map((starter) => starter.opponentAbbreviation))]).order("season", { ascending: false }).order("period_end", { ascending: false }),
  ]);
  type Archetype = { archetype_id: string; archetype_name: string; archetype_slug: string };
  const archetypeMap = new Map(((archetypes ?? []) as Archetype[]).map((row) => [row.archetype_id, row]));
  type MatchupRow = TeamRow & { archetype_id: string };
  const matchupRows = (matchups ?? []) as MatchupRow[];
  return { data: starters.flatMap((starter) => { const profile = latest.get(starter.mlbPlayerId); if (!profile) return []; const archetype = archetypeMap.get(profile.primary_archetype_id); if (!archetype) return []; const row = matchupRows.find((item) => item.archetype_id === profile.primary_archetype_id && item.team_abbreviation === starter.opponentAbbreviation); return [{ mlbPlayerId: starter.mlbPlayerId, pitcherName: starter.pitcherName, opponentAbbreviation: starter.opponentAbbreviation, archetypeId: profile.primary_archetype_id, archetypeName: archetype.archetype_name, archetypeSlug: archetype.archetype_slug, teamPerformance: row ? { teamAbbreviation: row.team_abbreviation, teamName: row.team_abbreviation, plateAppearances: row.plate_appearances ?? 0, ops: row.ops, xwoba: row.xwoba, strikeoutRate: row.strikeout_rate, walkRate: row.walk_rate, hardHitRate: row.hard_hit_rate, sampleQuality: row.sample_quality, periodStart: row.period_start, periodEnd: row.period_end } : null }]; }), error: null };
}
