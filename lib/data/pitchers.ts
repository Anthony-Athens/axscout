import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PitcherProfile = {
  mlbPlayerId: number; fullName: string; throws: string | null;
  teamAbbreviation: string | null; teamName: string | null;
  season: number; periodStart: string; periodEnd: string; totalPitches: number;
  primaryPitchType: string | null; primaryPitchUsage: number | null;
  secondaryPitchType: string | null; fastballVelocity: number | null;
  overallWhiffRate: number | null; overallCswRate: number | null;
  overallXwobaAllowed: number | null; archetypeId: string | null;
  archetypeName: string | null; archetypeSlug: string | null;
  archetypeProbability: number | null; outlierScore: number | null;
  mapX: number | null; mapY: number | null; starterShare: number | null;
  featureVersion: string; modelVersion: string | null; refreshedAt: string;
};
export type PitchArsenalRow = {
  pitchType: string; pitchName: string | null; pitchCount: number;
  usageRate: number | null; avgVelocity: number | null; avgSpinRate: number | null;
  avgIvb: number | null; avgHorizontalBreak: number | null;
  whiffRate: number | null; cswRate: number | null; xwobaAllowed: number | null;
};
export type PitcherArchetype = {
  archetypeId: string; name: string; slug: string; shortDescription: string | null;
  season: number; modelVersion: string; pitcherCount: number;
  representativeMlbPlayerId: number | null; representativeName: string | null;
  silhouetteScore: number | null; featureVersion: string; features: ArchetypeFeature[];
};
export type ArchetypeFeature = {
  name: string; mean: number | null; stddev: number | null;
  leaguePercentile: number | null; importanceRank: number | null;
};
export type SimilarPitcher = {
  mlbPlayerId: number; fullName: string; similarityScore: number;
  featureDistance: number | null; sameArchetype: boolean | null;
  explanation: string | null; archetypeName: string | null;
};
export type DataResult<T> = { data: T; error: string | null };
export type PitcherMapPoint = {
  mlbPlayerId: number; fullName: string; season: number;
  mapX: number; mapY: number; archetypeId: string | null;
  archetypeName: string | null; primaryPitchType: string | null;
  fastballVelocity: number | null; overallWhiffRate: number | null;
  archetypeProbability: number | null; starterShare: number | null;
};
export type PitcherMapFilters = {
  seasons: number[];
  archetypes: { id: string; name: string }[];
  hasRoleData: boolean;
};
export type PitcherProfileVisualizationData = {
  arsenal: PitchArsenalRow[];
  usage: { pitchType: string; pitchName: string; pitchCount: number; usageRate: number }[];
  movement: { pitchType: string; pitchName: string; horizontal: number; vertical: number; usageRate: number }[];
};

type ProfileRow = {
  mlb_player_id: number; season: number; period_start: string; period_end: string;
  total_pitches: number | null; primary_pitch_type: string | null;
  primary_pitch_usage: number | null; secondary_pitch_type: string | null;
  fastball_velocity: number | null; overall_whiff_rate: number | null;
  overall_csw_rate: number | null; overall_xwoba_allowed: number | null;
  primary_archetype_id: string | null; archetype_probability: number | null;
  outlier_score: number | null; model_version: string | null; refreshed_at: string;
  map_x: number | null; map_y: number | null; starter_share: number | null;
  feature_version: string;
};
type PlayerRow = { mlb_player_id: number; full_name: string | null; throws: string | null; current_team_abbreviation: string | null };
type TeamRow = { abbreviation: string; name: string };
type ArchetypeRow = {
  archetype_id: string; archetype_name: string; archetype_slug: string;
  short_description: string | null; season: number; model_version: string;
  pitcher_count: number | null; representative_mlb_player_id: number | null;
  silhouette_score: number | null; feature_version: string;
};

async function hydrateProfiles(rows: ProfileRow[]): Promise<PitcherProfile[]> {
  if (!rows.length) return [];
  const supabase = await createClient();
  const playerIds = [...new Set(rows.map((row) => row.mlb_player_id))];
  const archetypeIds = [...new Set(rows.map((row) => row.primary_archetype_id).filter((id): id is string => Boolean(id)))];
  const [{ data: players }, { data: archetypes }, { data: teams }] = await Promise.all([
    supabase.from("dim_players").select("mlb_player_id,full_name,throws,current_team_abbreviation").in("mlb_player_id", playerIds),
    archetypeIds.length
      ? supabase.from("pitcher_archetypes").select("archetype_id,archetype_name,archetype_slug").in("archetype_id", archetypeIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("dim_teams").select("abbreviation,name"),
  ]);
  const playerMap = new Map(((players ?? []) as PlayerRow[]).map((row) => [row.mlb_player_id, row]));
  const archetypeMap = new Map(((archetypes ?? []) as Pick<ArchetypeRow, "archetype_id" | "archetype_name" | "archetype_slug">[]).map((row) => [row.archetype_id, row]));
  const teamMap = new Map(((teams ?? []) as TeamRow[]).map((row) => [row.abbreviation, row.name]));
  return rows.map((row) => {
    const player = playerMap.get(row.mlb_player_id);
    const archetype = row.primary_archetype_id ? archetypeMap.get(row.primary_archetype_id) : undefined;
    return {
      mlbPlayerId: row.mlb_player_id, fullName: player?.full_name ?? `MLB pitcher ${row.mlb_player_id}`,
      throws: player?.throws ?? null,
      teamAbbreviation: player?.current_team_abbreviation ?? null,
      teamName: player?.current_team_abbreviation ? teamMap.get(player.current_team_abbreviation) ?? null : null,
      season: row.season, periodStart: row.period_start,
      periodEnd: row.period_end, totalPitches: row.total_pitches ?? 0,
      primaryPitchType: row.primary_pitch_type, primaryPitchUsage: row.primary_pitch_usage,
      secondaryPitchType: row.secondary_pitch_type, fastballVelocity: row.fastball_velocity,
      overallWhiffRate: row.overall_whiff_rate, overallCswRate: row.overall_csw_rate,
      overallXwobaAllowed: row.overall_xwoba_allowed, archetypeId: row.primary_archetype_id,
      archetypeName: archetype?.archetype_name ?? null, archetypeSlug: archetype?.archetype_slug ?? null,
      archetypeProbability: row.archetype_probability, outlierScore: row.outlier_score,
      mapX: row.map_x, mapY: row.map_y, starterShare: row.starter_share,
      featureVersion: row.feature_version, modelVersion: row.model_version,
      refreshedAt: row.refreshed_at,
    };
  });
}

export async function listPitchers(): Promise<DataResult<PitcherProfile[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pitcher_profiles").select("mlb_player_id,season,period_start,period_end,total_pitches,starter_share,primary_pitch_type,primary_pitch_usage,secondary_pitch_type,fastball_velocity,overall_whiff_rate,overall_csw_rate,overall_xwoba_allowed,primary_archetype_id,archetype_probability,outlier_score,map_x,map_y,feature_version,model_version,refreshed_at").order("season", { ascending: false }).order("period_end", { ascending: false }).order("total_pitches", { ascending: false }).limit(1000);
  if (error) return { data: [], error: error.message };
  return { data: await hydrateProfiles((data ?? []) as ProfileRow[]), error: null };
}

export async function getPitcherProfile(playerId: number): Promise<DataResult<PitcherProfile | null>> {
  const result = await listPitchers();
  return { data: result.data.find((row) => row.mlbPlayerId === playerId) ?? null, error: result.error };
}

export async function getPitcherArsenal(playerId: number): Promise<DataResult<PitchArsenalRow[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pitcher_pitch_profiles").select("season,period_end,pitch_type,pitch_name,pitch_count,usage_rate,avg_velocity,avg_spin_rate,avg_ivb,avg_horizontal_break,whiff_rate,csw_rate,xwoba_allowed").eq("mlb_player_id", playerId).order("season", { ascending: false }).order("period_end", { ascending: false }).order("usage_rate", { ascending: false }).limit(100);
  if (error) return { data: [], error: error.message };
  type Row = { season: number; period_end: string; pitch_type: string; pitch_name: string | null; pitch_count: number; usage_rate: number | null; avg_velocity: number | null; avg_spin_rate: number | null; avg_ivb: number | null; avg_horizontal_break: number | null; whiff_rate: number | null; csw_rate: number | null; xwoba_allowed: number | null };
  const rows = (data ?? []) as Row[];
  const latest = rows[0];
  const current = latest ? rows.filter((row) => row.season === latest.season && row.period_end === latest.period_end) : [];
  return { data: current.map((row) => ({ pitchType: row.pitch_type, pitchName: row.pitch_name, pitchCount: row.pitch_count, usageRate: row.usage_rate, avgVelocity: row.avg_velocity, avgSpinRate: row.avg_spin_rate, avgIvb: row.avg_ivb, avgHorizontalBreak: row.avg_horizontal_break, whiffRate: row.whiff_rate, cswRate: row.csw_rate, xwobaAllowed: row.xwoba_allowed })), error: null };
}

export async function listPitcherArchetypes(): Promise<DataResult<PitcherArchetype[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pitcher_archetypes").select("archetype_id,archetype_name,archetype_slug,short_description,season,model_version,feature_version,pitcher_count,representative_mlb_player_id,silhouette_score").order("season", { ascending: false }).order("cluster_number");
  if (error) return { data: [], error: error.message };
  const rows = (data ?? []) as ArchetypeRow[];
  const ids = rows.map((row) => row.archetype_id);
  const playerIds = rows.map((row) => row.representative_mlb_player_id).filter((id): id is number => id !== null);
  const [{ data: features }, { data: players }] = await Promise.all([
    ids.length ? supabase.from("pitcher_archetype_features").select("archetype_id,feature_name,feature_mean,feature_stddev,league_percentile,importance_rank").in("archetype_id", ids).lte("importance_rank", 5).order("importance_rank") : Promise.resolve({ data: [], error: null }),
    playerIds.length ? supabase.from("dim_players").select("mlb_player_id,full_name,throws,current_team_abbreviation").in("mlb_player_id", playerIds) : Promise.resolve({ data: [], error: null }),
  ]);
  type FeatureRow = { archetype_id: string; feature_name: string; feature_mean: number | null; feature_stddev: number | null; league_percentile: number | null; importance_rank: number | null };
  const featureRows = (features ?? []) as FeatureRow[];
  const playerMap = new Map(((players ?? []) as PlayerRow[]).map((row) => [row.mlb_player_id, row.full_name]));
  return { data: rows.map((row) => ({ archetypeId: row.archetype_id, name: row.archetype_name, slug: row.archetype_slug, shortDescription: row.short_description, season: row.season, modelVersion: row.model_version, featureVersion: row.feature_version, pitcherCount: row.pitcher_count ?? 0, representativeMlbPlayerId: row.representative_mlb_player_id, representativeName: row.representative_mlb_player_id ? playerMap.get(row.representative_mlb_player_id) ?? null : null, silhouetteScore: row.silhouette_score, features: featureRows.filter((feature) => feature.archetype_id === row.archetype_id).map((feature) => ({ name: feature.feature_name, mean: feature.feature_mean, stddev: feature.feature_stddev, leaguePercentile: feature.league_percentile, importanceRank: feature.importance_rank })) })), error: null };
}

export async function getPitcherMapPoints(): Promise<DataResult<PitcherMapPoint[]>> {
  const result = await listPitchers();
  const latestByPitcherSeason = new Map<string, PitcherProfile>();
  for (const profile of result.data) {
    const key = `${profile.mlbPlayerId}-${profile.season}`;
    if (!latestByPitcherSeason.has(key)) latestByPitcherSeason.set(key, profile);
  }
  return {
    data: [...latestByPitcherSeason.values()]
      .filter((profile): profile is PitcherProfile & { mapX: number; mapY: number } => profile.mapX !== null && profile.mapY !== null)
      .map((profile) => ({
        mlbPlayerId: profile.mlbPlayerId, fullName: profile.fullName,
        season: profile.season, mapX: profile.mapX, mapY: profile.mapY,
        archetypeId: profile.archetypeId, archetypeName: profile.archetypeName,
        primaryPitchType: profile.primaryPitchType,
        fastballVelocity: profile.fastballVelocity,
        overallWhiffRate: profile.overallWhiffRate,
        archetypeProbability: profile.archetypeProbability,
        starterShare: profile.starterShare,
      })),
    error: result.error,
  };
}

export function getPitcherMapFilters(points: PitcherMapPoint[]): PitcherMapFilters {
  const archetypes = new Map<string, string>();
  for (const point of points) {
    if (point.archetypeId && point.archetypeName) archetypes.set(point.archetypeId, point.archetypeName);
  }
  return {
    seasons: [...new Set(points.map((point) => point.season))].sort((a, b) => b - a),
    archetypes: [...archetypes].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    hasRoleData: points.some((point) => point.starterShare !== null),
  };
}

export async function getPitcherProfileVisualizationData(playerId: number): Promise<DataResult<PitcherProfileVisualizationData>> {
  const arsenal = await getPitcherArsenal(playerId);
  return {
    data: {
      arsenal: arsenal.data,
      usage: arsenal.data
        .filter((pitch): pitch is PitchArsenalRow & { usageRate: number } => pitch.usageRate !== null)
        .map((pitch) => ({ pitchType: pitch.pitchType, pitchName: pitch.pitchName ?? pitch.pitchType, pitchCount: pitch.pitchCount, usageRate: pitch.usageRate })),
      movement: arsenal.data
        .filter((pitch): pitch is PitchArsenalRow & { avgHorizontalBreak: number; avgIvb: number; usageRate: number } => pitch.avgHorizontalBreak !== null && pitch.avgIvb !== null && pitch.usageRate !== null)
        .map((pitch) => ({ pitchType: pitch.pitchType, pitchName: pitch.pitchName ?? pitch.pitchType, horizontal: pitch.avgHorizontalBreak, vertical: pitch.avgIvb, usageRate: pitch.usageRate })),
    },
    error: arsenal.error,
  };
}

export async function getPitcherArchetype(slug: string): Promise<DataResult<PitcherArchetype | null>> {
  const result = await listPitcherArchetypes();
  return { data: result.data.find((row) => row.slug === slug) ?? null, error: result.error };
}

export async function getSimilarPitchers(playerId: number): Promise<DataResult<SimilarPitcher[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("pitcher_similarities").select("season,model_version,similar_mlb_player_id,similarity_score,feature_distance,same_archetype,similarity_explanation").eq("mlb_player_id", playerId).order("season", { ascending: false }).order("calculated_at", { ascending: false }).order("similarity_rank").limit(50);
  if (error) return { data: [], error: error.message };
  type Row = { season: number; model_version: string; similar_mlb_player_id: number; similarity_score: number; feature_distance: number | null; same_archetype: boolean | null; similarity_explanation: string | null };
  const allRows = (data ?? []) as Row[];
  const newest = allRows[0];
  const rows = newest ? allRows.filter((row) => row.season === newest.season && row.model_version === newest.model_version).slice(0, 10) : [];
  const profiles = await listPitchers();
  const profileMap = new Map<number, PitcherProfile>();
  for (const profile of profiles.data) {
    if (!profileMap.has(profile.mlbPlayerId)) profileMap.set(profile.mlbPlayerId, profile);
  }
  return { data: rows.map((row) => ({ mlbPlayerId: row.similar_mlb_player_id, fullName: profileMap.get(row.similar_mlb_player_id)?.fullName ?? `MLB pitcher ${row.similar_mlb_player_id}`, similarityScore: row.similarity_score, featureDistance: row.feature_distance, sameArchetype: row.same_archetype, explanation: row.similarity_explanation, archetypeName: profileMap.get(row.similar_mlb_player_id)?.archetypeName ?? null })), error: profiles.error };
}

export async function getPitcherArchetypeRefreshStatus(): Promise<DataResult<{ finishedAt: string; recordsLoaded: number } | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("data_refresh_runs").select("finished_at,records_loaded").eq("pipeline_name", "build_pitcher_archetypes").eq("status", "success").order("finished_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data ? { finishedAt: String(data.finished_at), recordsLoaded: Number(data.records_loaded ?? 0) } : null, error: null };
}
