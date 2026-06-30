import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import ExportableScoutingReport from "@/components/ExportableScoutingReport";
import ProbableStarterCard, {
  type ProbableStarter,
} from "@/components/ProbableStarterCard";
import {
  MetricComparison,
  PlayerLeaderboard,
  TeamSnapshotCard,
  type LeaderboardPlayer,
  type SnapshotSection,
} from "@/components/ScoutingComparison";
import ScoutingReportFilters, {
  type ScoutingTeamOption,
} from "@/components/ScoutingReportFilters";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";
import type {
  ReportPlayer,
  ScoutingReportData,
} from "@/lib/scouting-report-export";

export const metadata: Metadata = {
  title: "Scouting Report",
  description:
    "Build a side-by-side MLB matchup scouting report with team form, recent trends, and player leaders.",
  alternates: { canonical: "/scouting-report" },
};

const DEFAULT_TEAM_A = "PIT";
const DEFAULT_TEAM_B = "CHC";
const MIN_ROLLING_7_PLATE_APPEARANCES = 10;
const MIN_ROLLING_7_BATTERS_FACED = 10;

type SeasonMetrics = {
  season: number;
  games_played: number;
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored: number | null;
  runs_allowed: number | null;
  run_differential: number | null;
};

type RollingMetrics = {
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored_per_game: number | null;
  runs_allowed_per_game: number | null;
  run_differential_per_game: number | null;
};

type WeeklyOffense = {
  season: number;
  week_start_date: string;
  batting_average: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type WeeklyPitching = {
  season: number;
  week_start_date: string;
  strikeouts: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
  era: number | null;
  whip: number | null;
};

type OffensePlayerRow = {
  season: number;
  mlb_player_id: number;
  plate_appearances: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type PitchingPlayerRow = {
  season: number;
  mlb_player_id: number;
  batters_faced: number | null;
  strikeouts: number | null;
  era: number | null;
  whip: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
};

type RollingOffensePlayerRow = {
  window_start_date: string;
  window_end_date: string;
  mlb_player_id: number;
  plate_appearances: number | null;
  batting_average: number | null;
  ops: number | null;
  home_runs: number | null;
  strikeouts: number | null;
  avg_exit_velocity: number | null;
};

type RollingPitchingPlayerRow = {
  window_start_date: string;
  window_end_date: string;
  mlb_player_id: number;
  batters_faced: number | null;
  strikeouts: number | null;
  walks: number | null;
  hits_allowed: number | null;
  home_runs_allowed: number | null;
  era: number | null;
  whip: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
};

type PitchingRankingRow = {
  era: number | null;
  whip: number | null;
  strikeouts: number | null;
};

type MatchupGameRow = {
  mlb_game_pk: number;
  game_date: string;
  home_team_key: number;
  away_team_key: number;
  status: string | null;
  home_probable_pitcher_mlb_id: number | null;
  home_probable_pitcher_name: string | null;
  away_probable_pitcher_mlb_id: number | null;
  away_probable_pitcher_name: string | null;
};

function formatDecimal(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? "--" : value.toFixed(digits);
}

function formatBaseballRate(value: number | null | undefined) {
  const formatted = formatDecimal(value, 3);
  return formatted.startsWith("0.") ? formatted.slice(1) : formatted;
}

function formatInteger(value: number | null | undefined) {
  return value === null || value === undefined
    ? "--"
    : Math.round(value).toString();
}

function formatDifferential(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) {
    return "--";
  }

  const formatted = value.toFixed(digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function compareNullableNumber(
  valueA: number | null,
  valueB: number | null,
  direction: "ascending" | "descending"
) {
  if (valueA === null && valueB === null) {
    return 0;
  }
  if (valueA === null) {
    return 1;
  }
  if (valueB === null) {
    return -1;
  }
  return direction === "ascending" ? valueA - valueB : valueB - valueA;
}

function bestPitchingSort(
  playerA: PitchingRankingRow,
  playerB: PitchingRankingRow
) {
  return (
    compareNullableNumber(playerA.era, playerB.era, "ascending") ||
    compareNullableNumber(playerA.whip, playerB.whip, "ascending") ||
    (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
  );
}

function hotOffenseSort(
  playerA: RollingOffensePlayerRow,
  playerB: RollingOffensePlayerRow
) {
  return (
    compareNullableNumber(playerA.ops, playerB.ops, "descending") ||
    compareNullableNumber(
      playerA.avg_exit_velocity,
      playerB.avg_exit_velocity,
      "descending"
    )
  );
}

function coldOffenseSort(
  playerA: RollingOffensePlayerRow,
  playerB: RollingOffensePlayerRow
) {
  return (
    compareNullableNumber(playerA.ops, playerB.ops, "ascending") ||
    (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
  );
}

function coldPitchingSort(
  playerA: RollingPitchingPlayerRow,
  playerB: RollingPitchingPlayerRow
) {
  return (
    compareNullableNumber(playerA.era, playerB.era, "descending") ||
    compareNullableNumber(playerA.whip, playerB.whip, "descending") ||
    compareNullableNumber(
      playerA.hits_allowed,
      playerB.hits_allowed,
      "descending"
    ) ||
    compareNullableNumber(
      playerA.home_runs_allowed,
      playerB.home_runs_allowed,
      "descending"
    )
  );
}

function hotPitchingFallbackSort(
  playerA: RollingPitchingPlayerRow,
  playerB: RollingPitchingPlayerRow
) {
  return (
    compareNullableNumber(playerA.whip, playerB.whip, "ascending") ||
    compareNullableNumber(
      playerA.hits_allowed,
      playerB.hits_allowed,
      "ascending"
    ) ||
    (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
  );
}

function coldPitchingFallbackSort(
  playerA: RollingPitchingPlayerRow,
  playerB: RollingPitchingPlayerRow
) {
  return (
    compareNullableNumber(playerA.whip, playerB.whip, "descending") ||
    compareNullableNumber(
      playerA.hits_allowed,
      playerB.hits_allowed,
      "descending"
    ) ||
    compareNullableNumber(
      playerA.home_runs_allowed,
      playerB.home_runs_allowed,
      "descending"
    )
  );
}

function hasEnoughEra(rows: RollingPitchingPlayerRow[]) {
  const required = Math.min(3, rows.length);
  return required > 0 && rows.filter((row) => row.era !== null).length >= required;
}

function isoDateWithOffset(days: number) {
  const value = new Date();
  value.setUTCHours(0, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function selectMatchupGame(games: MatchupGameRow[]) {
  const today = isoDateWithOffset(0);
  const upcoming = games.find(
    (game) =>
      game.game_date >= today &&
      !["Final", "Game Over"].includes(game.status ?? "")
  );
  if (upcoming) {
    return upcoming;
  }
  return [...games].reverse().find((game) => game.game_date <= today) ?? null;
}

function latestSeasonRows<T extends { season: number }>(rows: T[]): T[] {
  const latestSeason = rows[0]?.season;
  return latestSeason === undefined
    ? []
    : rows.filter((row) => row.season === latestSeason);
}

function latestRollingRows<T extends { window_end_date: string }>(rows: T[]): T[] {
  const latestWindow = rows[0]?.window_end_date;
  return latestWindow === undefined
    ? []
    : rows.filter((row) => row.window_end_date === latestWindow);
}

function seasonSnapshotSections(
  season: SeasonMetrics | null,
  offense: WeeklyOffense | null,
  pitching: WeeklyPitching | null
): SnapshotSection[] {
  return [
    {
      title: "Season Results",
      rows: [
        {
          label: "Record",
          value: season ? `${season.wins}-${season.losses}` : "--",
        },
        {
          label: "Win %",
          value: formatDecimal(season?.winning_percentage, 3),
        },
        { label: "Runs Scored", value: formatInteger(season?.runs_scored) },
        { label: "Runs Allowed", value: formatInteger(season?.runs_allowed) },
        {
          label: "Run Differential",
          value: formatDifferential(season?.run_differential),
        },
      ],
    },
    {
      title: "Season Offense",
      rows: [
        {
          label: "BA",
          value: formatDecimal(offense?.batting_average, 3),
        },
        { label: "OPS", value: formatDecimal(offense?.ops, 3) },
        { label: "Home Runs", value: formatInteger(offense?.home_runs) },
        {
          label: "Avg Exit Velocity",
          value:
            offense?.avg_exit_velocity == null
              ? "--"
              : `${formatDecimal(offense.avg_exit_velocity, 1)} mph`,
        },
      ],
    },
    {
      title: "Season Pitching",
      rows: [
        { label: "Strikeouts", value: formatInteger(pitching?.strikeouts) },
        {
          label: "ERA",
          value:
            pitching?.era == null ? "Coming soon" : formatDecimal(pitching.era),
        },
        {
          label: "WHIP",
          value:
            pitching?.whip == null
              ? "Coming soon"
              : formatDecimal(pitching.whip, 3),
        },
        {
          label: "Avg Pitch Speed",
          value:
            pitching?.avg_pitch_speed == null
              ? "--"
              : `${formatDecimal(pitching.avg_pitch_speed, 1)} mph`,
        },
        {
          label: "Avg Spin Rate",
          value:
            pitching?.avg_spin_rate == null
              ? "--"
              : `${formatDecimal(pitching.avg_spin_rate, 0)} rpm`,
        },
      ],
    },
  ];
}

function qualificationMinimum(
  gamesPlayed: number | null | undefined,
  multiplier: number
) {
  return gamesPlayed && gamesPlayed > 0
    ? Math.ceil(gamesPlayed * multiplier)
    : Number.POSITIVE_INFINITY;
}

function formatRollingWindow(
  startValue: string | undefined,
  endValue: string | undefined
) {
  if (!startValue || !endValue) {
    return "Latest rolling 7-day window";
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const start = formatter.format(new Date(`${startValue}T00:00:00Z`));
  const end = formatter.format(new Date(`${endValue}T00:00:00Z`));
  return `${start} - ${end}`;
}

export default async function ScoutingReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    teamA?: string | string[];
    teamB?: string | string[];
  }>;
}) {
  const supabase = await createClient();
  const { data: teamsData } = await supabase
    .from("dim_teams")
    .select("team_key, abbreviation, name")
    .order("name");
  const teams = (teamsData ?? []) as ScoutingTeamOption[];
  const query = await searchParams;
  const rawTeamA = Array.isArray(query.teamA) ? query.teamA[0] : query.teamA;
  const rawTeamB = Array.isArray(query.teamB) ? query.teamB[0] : query.teamB;
  const requestedTeamA = rawTeamA?.trim().toUpperCase() ?? DEFAULT_TEAM_A;
  const requestedTeamB = rawTeamB?.trim().toUpperCase() ?? DEFAULT_TEAM_B;
  const teamA =
    teams.find((team) => team.abbreviation === requestedTeamA) ??
    teams.find((team) => team.abbreviation === DEFAULT_TEAM_A) ??
    teams[0];
  const teamB =
    teams.find((team) => team.abbreviation === requestedTeamB) ??
    teams.find((team) => team.abbreviation === DEFAULT_TEAM_B) ??
    teams.find((team) => team.abbreviation !== teamA?.abbreviation) ??
    teams[0];

  if (!teamA || !teamB) {
    return (
      <div>
        <PageHeader
          label="Scouting Report"
          title="Matchup Scouting Report"
          description="Team comparison and player-level matchup intelligence."
        />
        <EmptyState
          title="No teams available"
          description="The scouting report will appear after team dimensions are loaded."
        />
      </div>
    );
  }

  const abbreviationA = teamA.abbreviation;
  const abbreviationB = teamB.abbreviation;
  const [
    seasonAResult,
    seasonBResult,
    rollingAResult,
    rollingBResult,
    offenseAResult,
    offenseBResult,
    pitchingAResult,
    pitchingBResult,
    offensePlayersAResult,
    offensePlayersBResult,
    pitchingPlayersAResult,
    pitchingPlayersBResult,
    rollingOffensePlayersAResult,
    rollingOffensePlayersBResult,
    rollingPitchingPlayersAResult,
    rollingPitchingPlayersBResult,
    upcomingGamesResult,
    latestRefreshResult,
  ] = await Promise.all([
    supabase
      .from("agg_team_season")
      .select(
        "season, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
      )
      .eq("team_abbreviation", abbreviationA)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_season")
      .select(
        "season, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
      )
      .eq("team_abbreviation", abbreviationB)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_rolling_14")
      .select(
        "wins, losses, winning_percentage, runs_scored_per_game, runs_allowed_per_game, run_differential_per_game"
      )
      .eq("team_abbreviation", abbreviationA)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_rolling_14")
      .select(
        "wins, losses, winning_percentage, runs_scored_per_game, runs_allowed_per_game, run_differential_per_game"
      )
      .eq("team_abbreviation", abbreviationB)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_offense_weekly")
      .select(
        "season, week_start_date, batting_average, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationA)
      .order("season", { ascending: false })
      .order("week_start_date", { ascending: false })
      .limit(1),
    supabase
      .from("agg_team_offense_weekly")
      .select(
        "season, week_start_date, batting_average, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationB)
      .order("season", { ascending: false })
      .order("week_start_date", { ascending: false })
      .limit(1),
    supabase
      .from("agg_team_pitching_weekly")
      .select(
        "season, week_start_date, strikeouts, avg_pitch_speed, avg_spin_rate, era, whip"
      )
      .eq("team_abbreviation", abbreviationA)
      .order("season", { ascending: false })
      .order("week_start_date", { ascending: false })
      .limit(1),
    supabase
      .from("agg_team_pitching_weekly")
      .select(
        "season, week_start_date, strikeouts, avg_pitch_speed, avg_spin_rate, era, whip"
      )
      .eq("team_abbreviation", abbreviationB)
      .order("season", { ascending: false })
      .order("week_start_date", { ascending: false })
      .limit(1),
    supabase
      .from("agg_player_offense_season")
      .select(
        "season, mlb_player_id, plate_appearances, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("ops", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_offense_season")
      .select(
        "season, mlb_player_id, plate_appearances, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("ops", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, mlb_player_id, batters_faced, strikeouts, era, whip, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("era", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, mlb_player_id, batters_faced, strikeouts, era, whip, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("era", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_offense_rolling_7")
      .select(
        "window_start_date, window_end_date, mlb_player_id, plate_appearances, batting_average, ops, home_runs, strikeouts, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("window_end_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_offense_rolling_7")
      .select(
        "window_start_date, window_end_date, mlb_player_id, plate_appearances, batting_average, ops, home_runs, strikeouts, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("window_end_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_pitching_rolling_7")
      .select(
        "window_start_date, window_end_date, mlb_player_id, batters_faced, strikeouts, walks, hits_allowed, home_runs_allowed, era, whip, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("window_end_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_pitching_rolling_7")
      .select(
        "window_start_date, window_end_date, mlb_player_id, batters_faced, strikeouts, walks, hits_allowed, home_runs_allowed, era, whip, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("window_end_date", { ascending: false })
      .limit(200),
    supabase
      .from("fact_games")
      .select(
        "mlb_game_pk, game_date, home_team_key, away_team_key, status, home_probable_pitcher_mlb_id, home_probable_pitcher_name, away_probable_pitcher_mlb_id, away_probable_pitcher_name"
      )
      .or(
        `home_team_key.in.(${teamA.team_key},${teamB.team_key}),away_team_key.in.(${teamA.team_key},${teamB.team_key})`
      )
      .gte("game_date", isoDateWithOffset(0))
      .lte("game_date", isoDateWithOffset(60))
      .order("game_date", { ascending: true })
      .order("mlb_game_pk", { ascending: true })
      .limit(100),
    supabase
      .from("data_refresh_runs")
      .select("finished_at")
      .eq("status", "success")
      .not("finished_at", "is", null)
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const seasonA = seasonAResult.data as SeasonMetrics | null;
  const seasonB = seasonBResult.data as SeasonMetrics | null;
  const rollingA = rollingAResult.data as RollingMetrics | null;
  const rollingB = rollingBResult.data as RollingMetrics | null;
  const offenseRowsA = (offenseAResult.data ?? []) as WeeklyOffense[];
  const offenseRowsB = (offenseBResult.data ?? []) as WeeklyOffense[];
  const pitchingRowsA = (pitchingAResult.data ?? []) as WeeklyPitching[];
  const pitchingRowsB = (pitchingBResult.data ?? []) as WeeklyPitching[];
  const offenseA = offenseRowsA[0] ?? null;
  const offenseB = offenseRowsB[0] ?? null;
  const pitchingA = pitchingRowsA[0] ?? null;
  const pitchingB = pitchingRowsB[0] ?? null;
  const upcomingGames = (upcomingGamesResult.data ?? []) as MatchupGameRow[];
  const gamesForTeam = (teamKey: number) =>
    upcomingGames
      .filter(
        (game) =>
          game.home_team_key === teamKey || game.away_team_key === teamKey
      )
      .slice(0, 3);
  const starterGamesA = gamesForTeam(teamA.team_key);
  const starterGamesB = gamesForTeam(teamB.team_key);
  const selectedMatchupGame = selectMatchupGame(
    upcomingGames.filter(
      (game) =>
        (game.home_team_key === teamA.team_key &&
          game.away_team_key === teamB.team_key) ||
        (game.home_team_key === teamB.team_key &&
          game.away_team_key === teamA.team_key)
    )
  );
  const probablePitcherIds = [...starterGamesA, ...starterGamesB]
    .flatMap((game) => [
      game.home_probable_pitcher_mlb_id,
      game.away_probable_pitcher_mlb_id,
    ])
    .filter(
      (playerId): playerId is number =>
        playerId !== null && playerId !== undefined
    );
  const minimumSeasonPlateAppearancesA = qualificationMinimum(
    seasonA?.games_played,
    2.5
  );
  const minimumSeasonPlateAppearancesB = qualificationMinimum(
    seasonB?.games_played,
    2.5
  );
  const minimumSeasonBattersFacedA = qualificationMinimum(
    seasonA?.games_played,
    3
  );
  const minimumSeasonBattersFacedB = qualificationMinimum(
    seasonB?.games_played,
    3
  );
  const offensePlayersA = latestSeasonRows(
    (offensePlayersAResult.data ?? []) as OffensePlayerRow[]
  )
    .filter(
      (player) =>
        player.ops !== null &&
        (player.plate_appearances ?? 0) >= minimumSeasonPlateAppearancesA
    )
    .sort((playerA, playerB) => (playerB.ops ?? 0) - (playerA.ops ?? 0))
    .slice(0, 3);
  const offensePlayersB = latestSeasonRows(
    (offensePlayersBResult.data ?? []) as OffensePlayerRow[]
  )
    .filter(
      (player) =>
        player.ops !== null &&
        (player.plate_appearances ?? 0) >= minimumSeasonPlateAppearancesB
    )
    .sort((playerA, playerB) => (playerB.ops ?? 0) - (playerA.ops ?? 0))
    .slice(0, 3);
  const pitchingPlayersA = latestSeasonRows(
    (pitchingPlayersAResult.data ?? []) as PitchingPlayerRow[]
  )
    .filter(
      (player) =>
        (player.batters_faced ?? 0) >= minimumSeasonBattersFacedA
    )
    .sort(bestPitchingSort)
    .slice(0, 3);
  const pitchingPlayersB = latestSeasonRows(
    (pitchingPlayersBResult.data ?? []) as PitchingPlayerRow[]
  )
    .filter(
      (player) =>
        (player.batters_faced ?? 0) >= minimumSeasonBattersFacedB
    )
    .sort(bestPitchingSort)
    .slice(0, 3);
  const latestOffenseWindowA = latestRollingRows(
    (rollingOffensePlayersAResult.data ?? []) as RollingOffensePlayerRow[]
  );
  const latestOffenseWindowB = latestRollingRows(
    (rollingOffensePlayersBResult.data ?? []) as RollingOffensePlayerRow[]
  );
  const qualifiedRollingOffenseA = latestOffenseWindowA.filter(
    (player) =>
      (player.plate_appearances ?? 0) >= MIN_ROLLING_7_PLATE_APPEARANCES
  );
  const qualifiedRollingOffenseB = latestOffenseWindowB.filter(
    (player) =>
      (player.plate_appearances ?? 0) >= MIN_ROLLING_7_PLATE_APPEARANCES
  );
  const hotOffenseA = [...qualifiedRollingOffenseA]
    .sort(hotOffenseSort)
    .slice(0, 3);
  const hotOffenseB = [...qualifiedRollingOffenseB]
    .sort(hotOffenseSort)
    .slice(0, 3);
  const coldOffenseA = [...qualifiedRollingOffenseA]
    .sort(coldOffenseSort)
    .slice(0, 3);
  const coldOffenseB = [...qualifiedRollingOffenseB]
    .sort(coldOffenseSort)
    .slice(0, 3);
  const latestPitchingWindowA = latestRollingRows(
    (rollingPitchingPlayersAResult.data ?? []) as RollingPitchingPlayerRow[]
  );
  const latestPitchingWindowB = latestRollingRows(
    (rollingPitchingPlayersBResult.data ?? []) as RollingPitchingPlayerRow[]
  );
  const qualifiedRollingPitchingA = latestPitchingWindowA.filter(
    (player) =>
      (player.batters_faced ?? 0) >= MIN_ROLLING_7_BATTERS_FACED
  );
  const qualifiedRollingPitchingB = latestPitchingWindowB.filter(
    (player) =>
      (player.batters_faced ?? 0) >= MIN_ROLLING_7_BATTERS_FACED
  );
  const hotPitchingA = [...qualifiedRollingPitchingA]
    .sort(
      hasEnoughEra(qualifiedRollingPitchingA)
        ? bestPitchingSort
        : hotPitchingFallbackSort
    )
    .slice(0, 3);
  const hotPitchingB = [...qualifiedRollingPitchingB]
    .sort(
      hasEnoughEra(qualifiedRollingPitchingB)
        ? bestPitchingSort
        : hotPitchingFallbackSort
    )
    .slice(0, 3);
  const coldPitchingA = [...qualifiedRollingPitchingA]
    .sort(
      hasEnoughEra(qualifiedRollingPitchingA)
        ? coldPitchingSort
        : coldPitchingFallbackSort
    )
    .slice(0, 3);
  const coldPitchingB = [...qualifiedRollingPitchingB]
    .sort(
      hasEnoughEra(qualifiedRollingPitchingB)
        ? coldPitchingSort
        : coldPitchingFallbackSort
    )
    .slice(0, 3);
  const playerIds = [
    ...offensePlayersA,
    ...offensePlayersB,
    ...pitchingPlayersA,
    ...pitchingPlayersB,
    ...hotOffenseA,
    ...hotOffenseB,
    ...coldOffenseA,
    ...coldOffenseB,
    ...hotPitchingA,
    ...hotPitchingB,
    ...coldPitchingA,
    ...coldPitchingB,
  ].map((player) => player.mlb_player_id);
  playerIds.push(...probablePitcherIds);
  const uniquePlayerIds = [...new Set(playerIds)];
  const { data: playerDimensions } = uniquePlayerIds.length
    ? await supabase
        .from("dim_players")
        .select("mlb_player_id, full_name, throws")
        .in("mlb_player_id", uniquePlayerIds)
    : { data: [] };
  const { data: probablePitchingRows } = probablePitcherIds.length
    ? await supabase
        .from("agg_player_pitching_season")
        .select("season, mlb_player_id, era, whip, strikeouts")
        .in("mlb_player_id", probablePitcherIds)
        .order("season", { ascending: false })
    : { data: [] };
  const playerNames = new Map(
    (playerDimensions ?? []).map((player) => [
      player.mlb_player_id,
      player.full_name,
    ])
  );
  const playerThrows = new Map(
    (playerDimensions ?? []).map((player) => [
      player.mlb_player_id,
      player.throws,
    ])
  );
  const probablePitchingById = new Map<
    number,
    { era: number | null; whip: number | null; strikeouts: number | null }
  >();
  for (const row of probablePitchingRows ?? []) {
    if (!probablePitchingById.has(row.mlb_player_id)) {
      probablePitchingById.set(row.mlb_player_id, row);
    }
  }
  const playerName = (playerId: number) =>
    playerNames.get(playerId) ?? `Player ${playerId}`;
  const teamByKey = new Map(teams.map((team) => [team.team_key, team]));
  const probableStartersForTeam = (
    teamKey: number,
    games: MatchupGameRow[]
  ): ProbableStarter[] =>
    games.map((game) => {
      const isHome = game.home_team_key === teamKey;
      const opponentKey = isHome ? game.away_team_key : game.home_team_key;
      const playerId = isHome
        ? game.home_probable_pitcher_mlb_id
        : game.away_probable_pitcher_mlb_id;
      const scheduleName = isHome
        ? game.home_probable_pitcher_name
        : game.away_probable_pitcher_name;
      const stats = playerId ? probablePitchingById.get(playerId) : null;
      return {
        mlbGamePk: game.mlb_game_pk,
        gameDate: game.game_date,
        opponentAbbreviation:
          teamByKey.get(opponentKey)?.abbreviation ?? "TBD",
        isHome,
        mlbPlayerId: playerId,
        fullName: playerId
          ? playerNames.get(playerId) ?? scheduleName
          : scheduleName,
        throws: playerId ? playerThrows.get(playerId) ?? null : null,
        era: stats?.era ?? null,
        whip: stats?.whip ?? null,
        strikeouts: stats?.strikeouts ?? null,
      };
    });
  const probableStartersA = probableStartersForTeam(
    teamA.team_key,
    starterGamesA
  );
  const probableStartersB = probableStartersForTeam(
    teamB.team_key,
    starterGamesB
  );
  const offenseLeaders = (rows: OffensePlayerRow[]): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "OPS", value: formatDecimal(player.ops, 3) },
        { label: "HR", value: player.home_runs ?? "--" },
        {
          label: "Avg EV",
          value:
            player.avg_exit_velocity === null
              ? "--"
              : `${formatDecimal(player.avg_exit_velocity)} mph`,
        },
      ],
    }));
  const pitchingLeaders = (rows: PitchingPlayerRow[]): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "ERA", value: formatDecimal(player.era) },
        { label: "WHIP", value: formatDecimal(player.whip) },
        { label: "K", value: player.strikeouts ?? "--" },
        {
          label: "Avg Velo",
          value:
            player.avg_pitch_speed === null
              ? "--"
              : `${formatDecimal(player.avg_pitch_speed)} mph`,
        },
        {
          label: "Avg Spin",
          value:
            player.avg_spin_rate === null
              ? "--"
              : `${formatDecimal(player.avg_spin_rate, 0)} rpm`,
        },
      ],
    }));
  const rollingOffenseLeaders = (
    rows: RollingOffensePlayerRow[]
  ): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "OPS", value: formatBaseballRate(player.ops) },
        { label: "AVG", value: formatBaseballRate(player.batting_average) },
        { label: "HR", value: player.home_runs ?? "--" },
        { label: "PA", value: player.plate_appearances ?? "--" },
        {
          label: "Avg EV",
          value:
            player.avg_exit_velocity === null
              ? "--"
              : `${formatDecimal(player.avg_exit_velocity, 1)} mph`,
        },
      ],
    }));
  const rollingPitchingLeaders = (
    rows: RollingPitchingPlayerRow[]
  ): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "ERA", value: formatDecimal(player.era) },
        { label: "WHIP", value: formatDecimal(player.whip) },
        { label: "K", value: player.strikeouts ?? "--" },
        { label: "H", value: player.hits_allowed ?? "--" },
        { label: "BB", value: player.walks ?? "--" },
        { label: "HR", value: player.home_runs_allowed ?? "--" },
      ],
    }));
  const reportOffensePlayers = (
    rows: Array<OffensePlayerRow | RollingOffensePlayerRow>
  ): ReportPlayer[] =>
    rows.map((player) => ({
      mlbPlayerId: player.mlb_player_id,
      fullName: playerName(player.mlb_player_id),
      ops: player.ops,
      battingAverage:
        "batting_average" in player ? player.batting_average : null,
      plateAppearances: player.plate_appearances,
      homeRuns: player.home_runs,
      avgExitVelocity: player.avg_exit_velocity,
    }));
  const reportPitchingPlayers = (
    rows: Array<PitchingPlayerRow | RollingPitchingPlayerRow>
  ): ReportPlayer[] =>
    rows.map((player) => ({
      mlbPlayerId: player.mlb_player_id,
      fullName: playerName(player.mlb_player_id),
      era: player.era,
      whip: player.whip,
      strikeouts: player.strikeouts,
      walks: "walks" in player ? player.walks : null,
      hitsAllowed: "hits_allowed" in player ? player.hits_allowed : null,
      homeRunsAllowed:
        "home_runs_allowed" in player ? player.home_runs_allowed : null,
      avgPitchSpeed: player.avg_pitch_speed,
      avgSpinRate: player.avg_spin_rate,
    }));
  const exportReportData: ScoutingReportData = {
    matchup: `${teamA.name} vs ${teamB.name}`,
    gameDate: selectedMatchupGame?.game_date ?? null,
    latestRefreshAt: latestRefreshResult.data?.finished_at ?? null,
    teamA: {
      side: "Team A",
      name: teamA.name,
      abbreviation: abbreviationA,
      season: seasonA
        ? {
            gamesPlayed: seasonA.games_played,
            wins: seasonA.wins,
            losses: seasonA.losses,
            winningPercentage: seasonA.winning_percentage,
            runsScored: seasonA.runs_scored,
            runsAllowed: seasonA.runs_allowed,
            runDifferential: seasonA.run_differential,
          }
        : null,
      rolling: rollingA
        ? {
            wins: rollingA.wins,
            losses: rollingA.losses,
            winningPercentage: rollingA.winning_percentage,
            runsScoredPerGame: rollingA.runs_scored_per_game,
            runsAllowedPerGame: rollingA.runs_allowed_per_game,
            runDifferentialPerGame: rollingA.run_differential_per_game,
          }
        : null,
      offense: offenseA
        ? {
            battingAverage: offenseA.batting_average,
            ops: offenseA.ops,
            homeRuns: offenseA.home_runs,
            avgExitVelocity: offenseA.avg_exit_velocity,
          }
        : null,
      pitching: pitchingA
        ? {
            strikeouts: pitchingA.strikeouts,
            avgPitchSpeed: pitchingA.avg_pitch_speed,
            avgSpinRate: pitchingA.avg_spin_rate,
            era: pitchingA.era,
            whip: pitchingA.whip,
          }
        : null,
      seasonOffenseLeaders: reportOffensePlayers(offensePlayersA),
      seasonPitchingLeaders: reportPitchingPlayers(pitchingPlayersA),
      hotOffense: reportOffensePlayers(hotOffenseA),
      coldOffense: reportOffensePlayers(coldOffenseA),
      hotPitching: reportPitchingPlayers(hotPitchingA),
      coldPitching: reportPitchingPlayers(coldPitchingA),
    },
    teamB: {
      side: "Team B",
      name: teamB.name,
      abbreviation: abbreviationB,
      season: seasonB
        ? {
            gamesPlayed: seasonB.games_played,
            wins: seasonB.wins,
            losses: seasonB.losses,
            winningPercentage: seasonB.winning_percentage,
            runsScored: seasonB.runs_scored,
            runsAllowed: seasonB.runs_allowed,
            runDifferential: seasonB.run_differential,
          }
        : null,
      rolling: rollingB
        ? {
            wins: rollingB.wins,
            losses: rollingB.losses,
            winningPercentage: rollingB.winning_percentage,
            runsScoredPerGame: rollingB.runs_scored_per_game,
            runsAllowedPerGame: rollingB.runs_allowed_per_game,
            runDifferentialPerGame: rollingB.run_differential_per_game,
          }
        : null,
      offense: offenseB
        ? {
            battingAverage: offenseB.batting_average,
            ops: offenseB.ops,
            homeRuns: offenseB.home_runs,
            avgExitVelocity: offenseB.avg_exit_velocity,
          }
        : null,
      pitching: pitchingB
        ? {
            strikeouts: pitchingB.strikeouts,
            avgPitchSpeed: pitchingB.avg_pitch_speed,
            avgSpinRate: pitchingB.avg_spin_rate,
            era: pitchingB.era,
            whip: pitchingB.whip,
          }
        : null,
      seasonOffenseLeaders: reportOffensePlayers(offensePlayersB),
      seasonPitchingLeaders: reportPitchingPlayers(pitchingPlayersB),
      hotOffense: reportOffensePlayers(hotOffenseB),
      coldOffense: reportOffensePlayers(coldOffenseB),
      hotPitching: reportPitchingPlayers(hotPitchingB),
      coldPitching: reportPitchingPlayers(coldPitchingB),
    },
  };

  return (
    <div>
      <PageHeader
        label="Scouting Report"
        title={`${teamA.name} vs ${teamB.name}`}
        description="Season performance, recent form, team trends, and player leaders."
      />

      <SectionCard title="Matchup">
        <ScoutingReportFilters
          teams={teams}
          teamA={abbreviationA}
          teamB={abbreviationB}
        />
      </SectionCard>

      <section className="mt-8" aria-labelledby="expected-starters-heading">
        <div className="mb-5">
          <h2
            id="expected-starters-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Expected Starting Pitchers
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Next 3 expected starters for each selected team.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ProbableStarterCard
            side="Team A"
            teamName={teamA.name}
            abbreviation={abbreviationA}
            starters={probableStartersA}
          />
          <ProbableStarterCard
            side="Team B"
            teamName={teamB.name}
            abbreviation={abbreviationB}
            starters={probableStartersB}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="season-comparison-heading">
        <div className="mb-5">
          <h2
            id="season-comparison-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Season Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Season-to-date results with the latest weekly offense and pitching snapshot.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TeamSnapshotCard
            side="Team A"
            teamName={teamA.name}
            abbreviation={abbreviationA}
            sections={seasonSnapshotSections(seasonA, offenseA, pitchingA)}
          />
          <TeamSnapshotCard
            side="Team B"
            teamName={teamB.name}
            abbreviation={abbreviationB}
            sections={seasonSnapshotSections(seasonB, offenseB, pitchingB)}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="rolling-comparison-heading">
        <div className="mb-5">
          <h2
            id="rolling-comparison-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Rolling 14 Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Recent results and per-game run production.
          </p>
        </div>
        <MetricComparison
          teamA={abbreviationA}
          teamB={abbreviationB}
          rows={[
            {
              label: "W-L",
              teamAValue: rollingA ? `${rollingA.wins}-${rollingA.losses}` : "--",
              teamBValue: rollingB ? `${rollingB.wins}-${rollingB.losses}` : "--",
            },
            {
              label: "Win %",
              teamAValue: formatDecimal(rollingA?.winning_percentage, 3),
              teamBValue: formatDecimal(rollingB?.winning_percentage, 3),
            },
            {
              label: "RS/G",
              teamAValue: formatDecimal(rollingA?.runs_scored_per_game),
              teamBValue: formatDecimal(rollingB?.runs_scored_per_game),
            },
            {
              label: "RA/G",
              teamAValue: formatDecimal(rollingA?.runs_allowed_per_game),
              teamBValue: formatDecimal(rollingB?.runs_allowed_per_game),
            },
            {
              label: "Diff/G",
              teamAValue: formatDifferential(
                rollingA?.run_differential_per_game,
                2
              ),
              teamBValue: formatDifferential(
                rollingB?.run_differential_per_game,
                2
              ),
            },
          ]}
        />
      </section>

      <section className="mt-8" aria-labelledby="offense-comparison-heading">
        <div className="mb-5">
          <h2
            id="offense-comparison-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Offensive Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest available weekly offense metrics.
          </p>
        </div>
        <MetricComparison
          teamA={abbreviationA}
          teamB={abbreviationB}
          rows={[
            {
              label: "BA",
              teamAValue: formatDecimal(offenseA?.batting_average, 3),
              teamBValue: formatDecimal(offenseB?.batting_average, 3),
            },
            {
              label: "OPS",
              teamAValue: formatDecimal(offenseA?.ops, 3),
              teamBValue: formatDecimal(offenseB?.ops, 3),
            },
            {
              label: "HR",
              teamAValue: formatInteger(offenseA?.home_runs),
              teamBValue: formatInteger(offenseB?.home_runs),
            },
            {
              label: "Avg Exit Velocity",
              teamAValue:
                offenseA?.avg_exit_velocity === null || !offenseA
                  ? "--"
                  : `${formatDecimal(offenseA.avg_exit_velocity, 1)} mph`,
              teamBValue:
                offenseB?.avg_exit_velocity === null || !offenseB
                  ? "--"
                  : `${formatDecimal(offenseB.avg_exit_velocity, 1)} mph`,
            },
          ]}
        />
      </section>

      <section className="mt-8" aria-labelledby="pitching-comparison-heading">
        <div className="mb-5">
          <h2
            id="pitching-comparison-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Pitching Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest available weekly pitching metrics.
          </p>
        </div>
        <MetricComparison
          teamA={abbreviationA}
          teamB={abbreviationB}
          rows={[
            {
              label: "Strikeouts",
              teamAValue: formatInteger(pitchingA?.strikeouts),
              teamBValue: formatInteger(pitchingB?.strikeouts),
            },
            {
              label: "Avg Pitch Speed",
              teamAValue:
                pitchingA?.avg_pitch_speed === null || !pitchingA
                  ? "--"
                  : `${formatDecimal(pitchingA.avg_pitch_speed, 1)} mph`,
              teamBValue:
                pitchingB?.avg_pitch_speed === null || !pitchingB
                  ? "--"
                  : `${formatDecimal(pitchingB.avg_pitch_speed, 1)} mph`,
            },
            {
              label: "Avg Spin Rate",
              teamAValue:
                pitchingA?.avg_spin_rate === null || !pitchingA
                  ? "--"
                  : `${formatDecimal(pitchingA.avg_spin_rate, 0)} rpm`,
              teamBValue:
                pitchingB?.avg_spin_rate === null || !pitchingB
                  ? "--"
                  : `${formatDecimal(pitchingB.avg_spin_rate, 0)} rpm`,
            },
            {
              label: "ERA",
              teamAValue:
                pitchingA?.era === null || !pitchingA
                  ? "Coming soon"
                  : formatDecimal(pitchingA.era),
              teamBValue:
                pitchingB?.era === null || !pitchingB
                  ? "Coming soon"
                  : formatDecimal(pitchingB.era),
            },
            {
              label: "WHIP",
              teamAValue:
                pitchingA?.whip === null || !pitchingA
                  ? "Coming soon"
                  : formatDecimal(pitchingA.whip, 3),
              teamBValue:
                pitchingB?.whip === null || !pitchingB
                  ? "Coming soon"
                  : formatDecimal(pitchingB.whip, 3),
            },
          ]}
        />
      </section>

      <section className="mt-8" aria-labelledby="offense-leaders-heading">
        <div className="mb-5">
          <h2
            id="offense-leaders-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Top Offensive Players
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            OPS leaders with a minimum of 2.5 plate appearances per team game.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerLeaderboard
            team={abbreviationA}
            title={teamA.name}
            players={offenseLeaders(offensePlayersA)}
            emptyMessage="No hitters met the season plate appearance minimum."
          />
          <PlayerLeaderboard
            team={abbreviationB}
            title={teamB.name}
            players={offenseLeaders(offensePlayersB)}
            emptyMessage="No hitters met the season plate appearance minimum."
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="pitching-leaders-heading">
        <div className="mb-5">
          <h2
            id="pitching-leaders-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Top Pitching Players
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Lowest ERA among pitchers with at least three batters faced per team game.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerLeaderboard
            team={abbreviationA}
            title={teamA.name}
            players={pitchingLeaders(pitchingPlayersA)}
            emptyMessage="No pitchers met the season batters-faced minimum."
          />
          <PlayerLeaderboard
            team={abbreviationB}
            title={teamB.name}
            players={pitchingLeaders(pitchingPlayersB)}
            emptyMessage="No pitchers met the season batters-faced minimum."
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="rolling-offense-heading">
        <div className="mb-5">
          <h2
            id="rolling-offense-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Offensive Players - Last 7 Days
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Hot and cold OPS rankings with at least 10 plate appearances.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationA}
              title="Hot Offensive Players - Last 7 Days"
              detail={formatRollingWindow(
                latestOffenseWindowA[0]?.window_start_date,
                latestOffenseWindowA[0]?.window_end_date
              )}
              players={rollingOffenseLeaders(hotOffenseA)}
              emptyMessage="No qualified players in the last 7 days."
            />
            <PlayerLeaderboard
              team={abbreviationA}
              title="Cold Offensive Players - Last 7 Days"
              detail={formatRollingWindow(
                latestOffenseWindowA[0]?.window_start_date,
                latestOffenseWindowA[0]?.window_end_date
              )}
              players={rollingOffenseLeaders(coldOffenseA)}
              emptyMessage="No qualified players in the last 7 days."
            />
          </div>
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationB}
              title="Hot Offensive Players - Last 7 Days"
              detail={formatRollingWindow(
                latestOffenseWindowB[0]?.window_start_date,
                latestOffenseWindowB[0]?.window_end_date
              )}
              players={rollingOffenseLeaders(hotOffenseB)}
              emptyMessage="No qualified players in the last 7 days."
            />
            <PlayerLeaderboard
              team={abbreviationB}
              title="Cold Offensive Players - Last 7 Days"
              detail={formatRollingWindow(
                latestOffenseWindowB[0]?.window_start_date,
                latestOffenseWindowB[0]?.window_end_date
              )}
              players={rollingOffenseLeaders(coldOffenseB)}
              emptyMessage="No qualified players in the last 7 days."
            />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="rolling-pitching-heading">
        <div className="mb-5">
          <h2
            id="rolling-pitching-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Pitching Players - Last 7 Days
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Lowest and highest ERA results with at least 10 batters faced.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationA}
              title="Hot Pitching Players - Last 7 Days"
              detail={formatRollingWindow(
                latestPitchingWindowA[0]?.window_start_date,
                latestPitchingWindowA[0]?.window_end_date
              )}
              players={rollingPitchingLeaders(hotPitchingA)}
              emptyMessage="No qualified players in the last 7 days."
            />
            <PlayerLeaderboard
              team={abbreviationA}
              title="Cold Pitching Players - Last 7 Days"
              detail={formatRollingWindow(
                latestPitchingWindowA[0]?.window_start_date,
                latestPitchingWindowA[0]?.window_end_date
              )}
              players={rollingPitchingLeaders(coldPitchingA)}
              emptyMessage="No qualified players in the last 7 days."
            />
          </div>
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationB}
              title="Hot Pitching Players - Last 7 Days"
              detail={formatRollingWindow(
                latestPitchingWindowB[0]?.window_start_date,
                latestPitchingWindowB[0]?.window_end_date
              )}
              players={rollingPitchingLeaders(hotPitchingB)}
              emptyMessage="No qualified players in the last 7 days."
            />
            <PlayerLeaderboard
              team={abbreviationB}
              title="Cold Pitching Players - Last 7 Days"
              detail={formatRollingWindow(
                latestPitchingWindowB[0]?.window_start_date,
                latestPitchingWindowB[0]?.window_end_date
              )}
              players={rollingPitchingLeaders(coldPitchingB)}
              emptyMessage="No qualified players in the last 7 days."
            />
          </div>
        </div>
      </section>

      <ExportableScoutingReport data={exportReportData} />
    </div>
  );
}
