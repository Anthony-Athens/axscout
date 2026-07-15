import "server-only";

import { createClient } from "@/lib/supabase/server";

export type MatchupDataResult<T> = { data: T; error: string | null };
export type MatchupSampleQuality = "low" | "medium" | "high";

export type MatchupPitcher = {
  mlbPlayerId: number;
  playerName: string;
  throws: string | null;
  season: number;
  primaryArchetypeId: string;
  primaryArchetypeName: string;
  primaryArchetypeSlug: string | null;
  archetypeConfidence: number | null;
  primaryPitchType: string | null;
  fastballVelocity: number | null;
  totalPitches: number;
  modelVersion: string;
  featureVersion: string;
  refreshedAt: string;
};

export type MatchupTeam = {
  teamAbbreviation: string;
  teamName: string;
  season: number;
};

export type MatchupArsenalRow = {
  pitchType: string;
  pitchName: string | null;
  usageRate: number | null;
  avgVelocity: number | null;
  avgSpinRate: number | null;
  whiffRate: number | null;
  cswRate: number | null;
};

export type MatchupTeamPerformance = {
  teamAbbreviation: string;
  teamName: string;
  plateAppearances: number;
  ops: number | null;
  xwoba: number | null;
  strikeoutRate: number | null;
  walkRate: number | null;
  hardHitRate: number | null;
  sampleQuality: MatchupSampleQuality;
  periodStart: string;
  periodEnd: string;
};

export type MatchupBatterPerformance = {
  mlbBatterId: number;
  fullName: string;
  plateAppearances: number;
  ops: number | null;
  xwoba: number | null;
  homeRuns: number;
  strikeoutRate: number | null;
  walkRate: number | null;
  avgExitVelocity: number | null;
  hardHitRate: number | null;
  sampleQuality: MatchupSampleQuality;
};

export type PitcherMatchupContext = {
  pitcher: MatchupPitcher | null;
  arsenal: MatchupArsenalRow[];
  teamPerformance: MatchupTeamPerformance | null;
  batters: MatchupBatterPerformance[];
  dataFreshness: string | null;
};

type ProfileRow = {
  mlb_player_id: number;
  season: number;
  primary_archetype_id: string;
  archetype_probability: number | null;
  primary_pitch_type: string | null;
  fastball_velocity: number | null;
  total_pitches: number | null;
  model_version: string | null;
  feature_version: string;
  refreshed_at: string;
  period_end: string;
};

type PlayerRow = {
  mlb_player_id: number;
  full_name: string | null;
  throws: string | null;
  current_team_abbreviation?: string | null;
};

type ArchetypeRow = {
  archetype_id: string;
  archetype_name: string;
  archetype_slug: string | null;
};

type TeamLookupRow = { abbreviation: string; name: string };
type MatchupAvailabilityRow = {
  season: number;
  archetype_id: string;
  team_abbreviation: string;
  model_version: string;
};

const profileSelect = "mlb_player_id,season,primary_archetype_id,archetype_probability,primary_pitch_type,fastball_velocity,total_pitches,model_version,feature_version,refreshed_at,period_end";

async function hydratePitchers(rows: ProfileRow[]): Promise<MatchupPitcher[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const playerIds = [...new Set(rows.map((row) => row.mlb_player_id))];
  const archetypeIds = [...new Set(rows.map((row) => row.primary_archetype_id))];
  const [{ data: players }, { data: archetypes }] = await Promise.all([
    supabase.from("dim_players").select("mlb_player_id,full_name,throws").in("mlb_player_id", playerIds),
    supabase.from("pitcher_archetypes").select("archetype_id,archetype_name,archetype_slug").in("archetype_id", archetypeIds),
  ]);
  const playerMap = new Map(((players ?? []) as PlayerRow[]).map((row) => [row.mlb_player_id, row]));
  const archetypeMap = new Map(((archetypes ?? []) as ArchetypeRow[]).map((row) => [row.archetype_id, row]));
  return rows.flatMap((row) => {
    const archetype = archetypeMap.get(row.primary_archetype_id);
    if (!archetype || !row.model_version) return [];
    const player = playerMap.get(row.mlb_player_id);
    return [{
      mlbPlayerId: row.mlb_player_id,
      playerName: player?.full_name ?? `MLB pitcher ${row.mlb_player_id}`,
      throws: player?.throws ?? null,
      season: row.season,
      primaryArchetypeId: row.primary_archetype_id,
      primaryArchetypeName: archetype.archetype_name,
      primaryArchetypeSlug: archetype.archetype_slug,
      archetypeConfidence: row.archetype_probability,
      primaryPitchType: row.primary_pitch_type,
      fastballVelocity: row.fastball_velocity,
      totalPitches: row.total_pitches ?? 0,
      modelVersion: row.model_version,
      featureVersion: row.feature_version,
      refreshedAt: row.refreshed_at,
    }];
  });
}

export async function listMatchupPitchers(): Promise<MatchupDataResult<MatchupPitcher[]>> {
  const supabase = await createClient();
  const [{ data: profiles, error }, { data: availability, error: matchupError }] = await Promise.all([
    supabase.from("pitcher_profiles").select(profileSelect).not("primary_archetype_id", "is", null).not("model_version", "is", null).order("season", { ascending: false }).order("period_end", { ascending: false }).limit(1500),
    supabase.from("team_vs_pitcher_archetype").select("season,archetype_id,team_abbreviation,model_version").order("season", { ascending: false }).limit(5000),
  ]);
  if (error || matchupError) return { data: [], error: error?.message ?? matchupError?.message ?? "Matchup data could not be loaded." };
  const availableKeys = new Set(((availability ?? []) as MatchupAvailabilityRow[]).map((row) => `${row.season}:${row.archetype_id}:${row.model_version}`));
  const latest = new Map<string, ProfileRow>();
  for (const row of (profiles ?? []) as ProfileRow[]) {
    const key = `${row.mlb_player_id}:${row.season}`;
    if (!latest.has(key) && row.model_version && availableKeys.has(`${row.season}:${row.primary_archetype_id}:${row.model_version}`)) latest.set(key, row);
  }
  const pitchers = await hydratePitchers([...latest.values()]);
  return { data: pitchers.sort((a, b) => b.season - a.season || a.playerName.localeCompare(b.playerName)), error: null };
}

export async function listMatchupTeams(): Promise<MatchupDataResult<MatchupTeam[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("team_vs_pitcher_archetype").select("season,team_abbreviation").order("season", { ascending: false }).limit(5000);
  if (error) return { data: [], error: error.message };
  const rows = (data ?? []) as Pick<MatchupAvailabilityRow, "season" | "team_abbreviation">[];
  const abbreviations = [...new Set(rows.map((row) => row.team_abbreviation))];
  const { data: teams, error: teamError } = abbreviations.length
    ? await supabase.from("dim_teams").select("abbreviation,name").in("abbreviation", abbreviations)
    : { data: [], error: null };
  if (teamError) return { data: [], error: teamError.message };
  const names = new Map(((teams ?? []) as TeamLookupRow[]).map((team) => [team.abbreviation, team.name]));
  const unique = new Map<string, MatchupTeam>();
  for (const row of rows) {
    const key = `${row.season}:${row.team_abbreviation}`;
    if (!unique.has(key)) unique.set(key, { teamAbbreviation: row.team_abbreviation, teamName: names.get(row.team_abbreviation) ?? row.team_abbreviation, season: row.season });
  }
  return { data: [...unique.values()].sort((a, b) => b.season - a.season || a.teamName.localeCompare(b.teamName)), error: null };
}

export async function getPitcherMatchupContext(pitcherId: number, teamAbbreviation: string, season: number): Promise<MatchupDataResult<PitcherMatchupContext>> {
  const supabase = await createClient();
  const { data: profileData, error: profileError } = await supabase.from("pitcher_profiles").select(profileSelect).eq("mlb_player_id", pitcherId).eq("season", season).not("primary_archetype_id", "is", null).not("model_version", "is", null).order("period_end", { ascending: false }).limit(1).maybeSingle();
  if (profileError) return { data: { pitcher: null, arsenal: [], teamPerformance: null, batters: [], dataFreshness: null }, error: profileError.message };
  if (!profileData) return { data: { pitcher: null, arsenal: [], teamPerformance: null, batters: [], dataFreshness: null }, error: null };
  const profileRow = profileData as ProfileRow;
  const pitcher = (await hydratePitchers([profileRow]))[0] ?? null;
  if (!pitcher) return { data: { pitcher: null, arsenal: [], teamPerformance: null, batters: [], dataFreshness: null }, error: null };

  const [{ data: arsenalData, error: arsenalError }, { data: teamData, error: teamError }, { data: batterData, error: batterError }] = await Promise.all([
    supabase.from("pitcher_pitch_profiles").select("period_end,pitch_type,pitch_name,usage_rate,avg_velocity,avg_spin_rate,whiff_rate,csw_rate").eq("mlb_player_id", pitcherId).eq("season", season).order("period_end", { ascending: false }).order("usage_rate", { ascending: false }).limit(100),
    supabase.from("team_vs_pitcher_archetype").select("team_abbreviation,plate_appearances,ops,xwoba,strikeout_rate,walk_rate,hard_hit_rate,sample_quality,period_start,period_end").eq("archetype_id", pitcher.primaryArchetypeId).eq("team_abbreviation", teamAbbreviation).eq("season", season).eq("model_version", pitcher.modelVersion).order("period_end", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("batter_vs_pitcher_archetype").select("mlb_batter_id,plate_appearances,ops,xwoba,home_runs,strikeout_rate,walk_rate,avg_exit_velocity,hard_hit_rate,sample_quality,period_end").eq("archetype_id", pitcher.primaryArchetypeId).eq("season", season).eq("model_version", pitcher.modelVersion).order("period_end", { ascending: false }).order("ops", { ascending: false, nullsFirst: false }).limit(750),
  ]);
  const firstError = arsenalError ?? teamError ?? batterError;

  type ArsenalRow = { period_end: string; pitch_type: string; pitch_name: string | null; usage_rate: number | null; avg_velocity: number | null; avg_spin_rate: number | null; whiff_rate: number | null; csw_rate: number | null };
  type TeamRow = { team_abbreviation: string; plate_appearances: number | null; ops: number | null; xwoba: number | null; strikeout_rate: number | null; walk_rate: number | null; hard_hit_rate: number | null; sample_quality: MatchupSampleQuality; period_start: string; period_end: string };
  type BatterRow = { mlb_batter_id: number; plate_appearances: number | null; ops: number | null; xwoba: number | null; home_runs: number | null; strikeout_rate: number | null; walk_rate: number | null; avg_exit_velocity: number | null; hard_hit_rate: number | null; sample_quality: MatchupSampleQuality; period_end: string };

  const arsenalRows = (arsenalData ?? []) as ArsenalRow[];
  const latestArsenalPeriod = arsenalRows[0]?.period_end;
  const arsenal = arsenalRows.filter((row) => row.period_end === latestArsenalPeriod).map((row) => ({ pitchType: row.pitch_type, pitchName: row.pitch_name, usageRate: row.usage_rate, avgVelocity: row.avg_velocity, avgSpinRate: row.avg_spin_rate, whiffRate: row.whiff_rate, cswRate: row.csw_rate }));

  const teamRow = teamData as TeamRow | null;
  const teamLookup = await supabase.from("dim_teams").select("abbreviation,name").eq("abbreviation", teamAbbreviation).maybeSingle();
  const teamName = (teamLookup.data as TeamLookupRow | null)?.name ?? teamAbbreviation;
  const teamPerformance = teamRow ? { teamAbbreviation: teamRow.team_abbreviation, teamName, plateAppearances: teamRow.plate_appearances ?? 0, ops: teamRow.ops, xwoba: teamRow.xwoba, strikeoutRate: teamRow.strikeout_rate, walkRate: teamRow.walk_rate, hardHitRate: teamRow.hard_hit_rate, sampleQuality: teamRow.sample_quality, periodStart: teamRow.period_start, periodEnd: teamRow.period_end } : null;

  const allBatterRows = (batterData ?? []) as BatterRow[];
  const latestBatterPeriod = allBatterRows[0]?.period_end;
  const currentBatterRows = allBatterRows.filter((row) => row.period_end === latestBatterPeriod);
  const batterIds = [...new Set(currentBatterRows.map((row) => row.mlb_batter_id))];
  const { data: players, error: playerError } = batterIds.length
    ? await supabase.from("dim_players").select("mlb_player_id,full_name,throws,current_team_abbreviation").in("mlb_player_id", batterIds)
    : { data: [], error: null };
  const playerMap = new Map(((players ?? []) as PlayerRow[]).map((player) => [player.mlb_player_id, player]));
  const batters = currentBatterRows.flatMap((row) => {
    const player = playerMap.get(row.mlb_batter_id);
    if (player?.current_team_abbreviation !== teamAbbreviation) return [];
    return [{ mlbBatterId: row.mlb_batter_id, fullName: player.full_name ?? `MLB batter ${row.mlb_batter_id}`, plateAppearances: row.plate_appearances ?? 0, ops: row.ops, xwoba: row.xwoba, homeRuns: row.home_runs ?? 0, strikeoutRate: row.strikeout_rate, walkRate: row.walk_rate, avgExitVelocity: row.avg_exit_velocity, hardHitRate: row.hard_hit_rate, sampleQuality: row.sample_quality }];
  }).sort((a, b) => (b.ops ?? -1) - (a.ops ?? -1));

  return { data: { pitcher, arsenal, teamPerformance, batters, dataFreshness: teamRow?.period_end ?? latestBatterPeriod ?? pitcher.refreshedAt }, error: firstError?.message ?? playerError?.message ?? teamLookup.error?.message ?? null };
}
