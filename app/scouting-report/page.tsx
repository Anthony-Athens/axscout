import PageHeader from "@/components/layout/PageHeader";
import ExportableScoutingReport from "@/components/ExportableScoutingReport";
import {
  MetricComparison,
  PlayerLeaderboard,
  TeamSnapshotCard,
  type LeaderboardPlayer,
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

const DEFAULT_TEAM_A = "PIT";
const DEFAULT_TEAM_B = "CHC";
const MIN_WEEKLY_PLATE_APPEARANCES = 10;
const MIN_WEEKLY_BATTERS_FACED = 10;

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
  batting_average: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type WeeklyPitching = {
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
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
};

type WeeklyOffensePlayerRow = {
  week_start_date: string;
  mlb_player_id: number;
  plate_appearances: number | null;
  batting_average: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type WeeklyPitchingPlayerRow = {
  week_start_date: string;
  mlb_player_id: number;
  batters_faced: number | null;
  strikeouts: number | null;
  hits_allowed: number | null;
  home_runs_allowed: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
};

function formatDecimal(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? "--" : value.toFixed(digits);
}

function formatDifferential(value: number | null | undefined, digits = 0) {
  if (value === null || value === undefined) {
    return "--";
  }

  const formatted = value.toFixed(digits);
  return value > 0 ? `+${formatted}` : formatted;
}

function latestSeasonRows<T extends { season: number }>(rows: T[]): T[] {
  const latestSeason = rows[0]?.season;
  return latestSeason === undefined
    ? []
    : rows.filter((row) => row.season === latestSeason);
}

function latestWeekRows<T extends { week_start_date: string }>(rows: T[]): T[] {
  const latestWeek = rows[0]?.week_start_date;
  return latestWeek === undefined
    ? []
    : rows.filter((row) => row.week_start_date === latestWeek);
}

function qualificationMinimum(
  gamesPlayed: number | null | undefined,
  multiplier: number
) {
  return gamesPlayed && gamesPlayed > 0
    ? Math.ceil(gamesPlayed * multiplier)
    : Number.POSITIVE_INFINITY;
}

function formatWeek(value: string | undefined) {
  if (!value) {
    return "Latest available week";
  }

  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
  return `Week of ${date}`;
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
    weeklyOffensePlayersAResult,
    weeklyOffensePlayersBResult,
    weeklyPitchingPlayersAResult,
    weeklyPitchingPlayersBResult,
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
      .select("batting_average, ops, home_runs, avg_exit_velocity")
      .eq("team_abbreviation", abbreviationA)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_offense_weekly")
      .select("batting_average, ops, home_runs, avg_exit_velocity")
      .eq("team_abbreviation", abbreviationB)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_pitching_weekly")
      .select("strikeouts, avg_pitch_speed, avg_spin_rate, era, whip")
      .eq("team_abbreviation", abbreviationA)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_pitching_weekly")
      .select("strikeouts, avg_pitch_speed, avg_spin_rate, era, whip")
      .eq("team_abbreviation", abbreviationB)
      .order("week_start_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
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
        "season, mlb_player_id, batters_faced, strikeouts, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("strikeouts", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, mlb_player_id, batters_faced, strikeouts, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("strikeouts", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_offense_weekly")
      .select(
        "week_start_date, mlb_player_id, plate_appearances, batting_average, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_offense_weekly")
      .select(
        "week_start_date, mlb_player_id, plate_appearances, batting_average, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_pitching_weekly")
      .select(
        "week_start_date, mlb_player_id, batters_faced, strikeouts, hits_allowed, home_runs_allowed, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(200),
    supabase
      .from("agg_player_pitching_weekly")
      .select(
        "week_start_date, mlb_player_id, batters_faced, strikeouts, hits_allowed, home_runs_allowed, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("week_start_date", { ascending: false })
      .limit(200),
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
  const offenseA = offenseAResult.data as WeeklyOffense | null;
  const offenseB = offenseBResult.data as WeeklyOffense | null;
  const pitchingA = pitchingAResult.data as WeeklyPitching | null;
  const pitchingB = pitchingBResult.data as WeeklyPitching | null;
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
    .sort(
      (playerA, playerB) =>
        (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
    )
    .slice(0, 3);
  const pitchingPlayersB = latestSeasonRows(
    (pitchingPlayersBResult.data ?? []) as PitchingPlayerRow[]
  )
    .filter(
      (player) =>
        (player.batters_faced ?? 0) >= minimumSeasonBattersFacedB
    )
    .sort(
      (playerA, playerB) =>
        (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
    )
    .slice(0, 3);
  const latestOffenseWeekA = latestWeekRows(
    (weeklyOffensePlayersAResult.data ?? []) as WeeklyOffensePlayerRow[]
  );
  const latestOffenseWeekB = latestWeekRows(
    (weeklyOffensePlayersBResult.data ?? []) as WeeklyOffensePlayerRow[]
  );
  const qualifiedWeeklyOffenseA = latestOffenseWeekA.filter(
    (player) =>
      player.ops !== null &&
      (player.plate_appearances ?? 0) >= MIN_WEEKLY_PLATE_APPEARANCES
  );
  const qualifiedWeeklyOffenseB = latestOffenseWeekB.filter(
    (player) =>
      player.ops !== null &&
      (player.plate_appearances ?? 0) >= MIN_WEEKLY_PLATE_APPEARANCES
  );
  const hotOffenseA = [...qualifiedWeeklyOffenseA]
    .sort((playerA, playerB) => (playerB.ops ?? 0) - (playerA.ops ?? 0))
    .slice(0, 3);
  const hotOffenseB = [...qualifiedWeeklyOffenseB]
    .sort((playerA, playerB) => (playerB.ops ?? 0) - (playerA.ops ?? 0))
    .slice(0, 3);
  const coldOffenseA = [...qualifiedWeeklyOffenseA]
    .sort((playerA, playerB) => (playerA.ops ?? 0) - (playerB.ops ?? 0))
    .slice(0, 3);
  const coldOffenseB = [...qualifiedWeeklyOffenseB]
    .sort((playerA, playerB) => (playerA.ops ?? 0) - (playerB.ops ?? 0))
    .slice(0, 3);
  const latestPitchingWeekA = latestWeekRows(
    (weeklyPitchingPlayersAResult.data ?? []) as WeeklyPitchingPlayerRow[]
  );
  const latestPitchingWeekB = latestWeekRows(
    (weeklyPitchingPlayersBResult.data ?? []) as WeeklyPitchingPlayerRow[]
  );
  const qualifiedWeeklyPitchingA = latestPitchingWeekA.filter(
    (player) =>
      (player.batters_faced ?? 0) >= MIN_WEEKLY_BATTERS_FACED
  );
  const qualifiedWeeklyPitchingB = latestPitchingWeekB.filter(
    (player) =>
      (player.batters_faced ?? 0) >= MIN_WEEKLY_BATTERS_FACED
  );
  const hotPitchingA = [...qualifiedWeeklyPitchingA]
    .sort(
      (playerA, playerB) =>
        (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
    )
    .slice(0, 3);
  const hotPitchingB = [...qualifiedWeeklyPitchingB]
    .sort(
      (playerA, playerB) =>
        (playerB.strikeouts ?? 0) - (playerA.strikeouts ?? 0)
    )
    .slice(0, 3);
  const coldPitchingSort = (
    playerA: WeeklyPitchingPlayerRow,
    playerB: WeeklyPitchingPlayerRow
  ) =>
    (playerB.home_runs_allowed ?? 0) - (playerA.home_runs_allowed ?? 0) ||
    (playerB.hits_allowed ?? 0) - (playerA.hits_allowed ?? 0);
  const coldPitchingA = [...qualifiedWeeklyPitchingA]
    .sort(coldPitchingSort)
    .slice(0, 3);
  const coldPitchingB = [...qualifiedWeeklyPitchingB]
    .sort(coldPitchingSort)
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
  const uniquePlayerIds = [...new Set(playerIds)];
  const { data: playerDimensions } = uniquePlayerIds.length
    ? await supabase
        .from("dim_players")
        .select("mlb_player_id, full_name")
        .in("mlb_player_id", uniquePlayerIds)
    : { data: [] };
  const playerNames = new Map(
    (playerDimensions ?? []).map((player) => [
      player.mlb_player_id,
      player.full_name,
    ])
  );
  const playerName = (playerId: number) =>
    playerNames.get(playerId) ?? `Player ${playerId}`;
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
  const weeklyOffenseLeaders = (
    rows: WeeklyOffensePlayerRow[]
  ): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "OPS", value: formatDecimal(player.ops, 3) },
        { label: "AVG", value: formatDecimal(player.batting_average, 3) },
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
  const weeklyPitchingLeaders = (
    rows: WeeklyPitchingPlayerRow[]
  ): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name: playerName(player.mlb_player_id),
      metrics: [
        { label: "K", value: player.strikeouts ?? "--" },
        { label: "H", value: player.hits_allowed ?? "--" },
        { label: "HR", value: player.home_runs_allowed ?? "--" },
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
  const reportOffensePlayers = (
    rows: Array<OffensePlayerRow | WeeklyOffensePlayerRow>
  ): ReportPlayer[] =>
    rows.map((player) => ({
      mlbPlayerId: player.mlb_player_id,
      fullName: playerName(player.mlb_player_id),
      ops: player.ops,
      battingAverage:
        "batting_average" in player ? player.batting_average : null,
      homeRuns: player.home_runs,
      avgExitVelocity: player.avg_exit_velocity,
    }));
  const reportPitchingPlayers = (
    rows: Array<PitchingPlayerRow | WeeklyPitchingPlayerRow>
  ): ReportPlayer[] =>
    rows.map((player) => ({
      mlbPlayerId: player.mlb_player_id,
      fullName: playerName(player.mlb_player_id),
      strikeouts: player.strikeouts,
      hitsAllowed: "hits_allowed" in player ? player.hits_allowed : null,
      homeRunsAllowed:
        "home_runs_allowed" in player ? player.home_runs_allowed : null,
      avgPitchSpeed: player.avg_pitch_speed,
      avgSpinRate: player.avg_spin_rate,
    }));
  const exportReportData: ScoutingReportData = {
    matchup: `${teamA.name} vs ${teamB.name}`,
    gameDate: null,
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

      <section className="mt-8" aria-labelledby="season-comparison-heading">
        <div className="mb-5">
          <h2
            id="season-comparison-heading"
            className="text-xl font-semibold text-white"
          >
            Season Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Full season-to-date team results.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TeamSnapshotCard
            side="Team A"
            teamName={teamA.name}
            abbreviation={abbreviationA}
            rows={[
              {
                label: "Record",
                value: seasonA ? `${seasonA.wins}-${seasonA.losses}` : "--",
              },
              {
                label: "Win %",
                value: formatDecimal(seasonA?.winning_percentage, 3),
              },
              { label: "Runs Scored", value: seasonA?.runs_scored ?? "--" },
              { label: "Runs Allowed", value: seasonA?.runs_allowed ?? "--" },
              {
                label: "Run Differential",
                value: formatDifferential(seasonA?.run_differential),
              },
            ]}
          />
          <TeamSnapshotCard
            side="Team B"
            teamName={teamB.name}
            abbreviation={abbreviationB}
            rows={[
              {
                label: "Record",
                value: seasonB ? `${seasonB.wins}-${seasonB.losses}` : "--",
              },
              {
                label: "Win %",
                value: formatDecimal(seasonB?.winning_percentage, 3),
              },
              { label: "Runs Scored", value: seasonB?.runs_scored ?? "--" },
              { label: "Runs Allowed", value: seasonB?.runs_allowed ?? "--" },
              {
                label: "Run Differential",
                value: formatDifferential(seasonB?.run_differential),
              },
            ]}
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="rolling-comparison-heading">
        <div className="mb-5">
          <h2
            id="rolling-comparison-heading"
            className="text-xl font-semibold text-white"
          >
            Rolling 14 Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-400">
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
            className="text-xl font-semibold text-white"
          >
            Offensive Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-400">
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
              teamAValue: offenseA?.home_runs ?? "--",
              teamBValue: offenseB?.home_runs ?? "--",
            },
            {
              label: "Avg Exit Velocity",
              teamAValue:
                offenseA?.avg_exit_velocity === null || !offenseA
                  ? "--"
                  : `${formatDecimal(offenseA.avg_exit_velocity)} mph`,
              teamBValue:
                offenseB?.avg_exit_velocity === null || !offenseB
                  ? "--"
                  : `${formatDecimal(offenseB.avg_exit_velocity)} mph`,
            },
          ]}
        />
      </section>

      <section className="mt-8" aria-labelledby="pitching-comparison-heading">
        <div className="mb-5">
          <h2
            id="pitching-comparison-heading"
            className="text-xl font-semibold text-white"
          >
            Pitching Comparison
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Latest available weekly pitching metrics.
          </p>
        </div>
        <MetricComparison
          teamA={abbreviationA}
          teamB={abbreviationB}
          rows={[
            {
              label: "Strikeouts",
              teamAValue: pitchingA?.strikeouts ?? "--",
              teamBValue: pitchingB?.strikeouts ?? "--",
            },
            {
              label: "Avg Pitch Speed",
              teamAValue:
                pitchingA?.avg_pitch_speed === null || !pitchingA
                  ? "--"
                  : `${formatDecimal(pitchingA.avg_pitch_speed)} mph`,
              teamBValue:
                pitchingB?.avg_pitch_speed === null || !pitchingB
                  ? "--"
                  : `${formatDecimal(pitchingB.avg_pitch_speed)} mph`,
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
            className="text-xl font-semibold text-white"
          >
            Top Offensive Players
          </h2>
          <p className="mt-1 text-sm text-slate-400">
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
            className="text-xl font-semibold text-white"
          >
            Top Pitching Players
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Strikeout leaders with a minimum of three batters faced per team game.
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

      <section className="mt-8" aria-labelledby="weekly-offense-heading">
        <div className="mb-5">
          <h2
            id="weekly-offense-heading"
            className="text-xl font-semibold text-white"
          >
            Last Week Offensive Players
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Hot and cold OPS rankings with at least 10 weekly plate appearances.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationA}
              title="Hot Offensive Players - Last Week"
              detail={formatWeek(latestOffenseWeekA[0]?.week_start_date)}
              players={weeklyOffenseLeaders(hotOffenseA)}
              emptyMessage="No hitters met the 10 PA weekly minimum."
            />
            <PlayerLeaderboard
              team={abbreviationA}
              title="Cold Offensive Players - Last Week"
              detail={formatWeek(latestOffenseWeekA[0]?.week_start_date)}
              players={weeklyOffenseLeaders(coldOffenseA)}
              emptyMessage="No hitters met the 10 PA weekly minimum."
            />
          </div>
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationB}
              title="Hot Offensive Players - Last Week"
              detail={formatWeek(latestOffenseWeekB[0]?.week_start_date)}
              players={weeklyOffenseLeaders(hotOffenseB)}
              emptyMessage="No hitters met the 10 PA weekly minimum."
            />
            <PlayerLeaderboard
              team={abbreviationB}
              title="Cold Offensive Players - Last Week"
              detail={formatWeek(latestOffenseWeekB[0]?.week_start_date)}
              players={weeklyOffenseLeaders(coldOffenseB)}
              emptyMessage="No hitters met the 10 PA weekly minimum."
            />
          </div>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="weekly-pitching-heading">
        <div className="mb-5">
          <h2
            id="weekly-pitching-heading"
            className="text-xl font-semibold text-white"
          >
            Last Week Pitching Players
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Hot and cold results with at least 10 weekly batters faced.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationA}
              title="Hot Pitching Players - Last Week"
              detail={formatWeek(latestPitchingWeekA[0]?.week_start_date)}
              players={weeklyPitchingLeaders(hotPitchingA)}
              emptyMessage="No pitchers met the 10 BF weekly minimum."
            />
            <PlayerLeaderboard
              team={abbreviationA}
              title="Cold Pitching Players - Last Week"
              detail={formatWeek(latestPitchingWeekA[0]?.week_start_date)}
              players={weeklyPitchingLeaders(coldPitchingA)}
              emptyMessage="No pitchers met the 10 BF weekly minimum."
            />
          </div>
          <div className="grid gap-4">
            <PlayerLeaderboard
              team={abbreviationB}
              title="Hot Pitching Players - Last Week"
              detail={formatWeek(latestPitchingWeekB[0]?.week_start_date)}
              players={weeklyPitchingLeaders(hotPitchingB)}
              emptyMessage="No pitchers met the 10 BF weekly minimum."
            />
            <PlayerLeaderboard
              team={abbreviationB}
              title="Cold Pitching Players - Last Week"
              detail={formatWeek(latestPitchingWeekB[0]?.week_start_date)}
              players={weeklyPitchingLeaders(coldPitchingB)}
              emptyMessage="No pitchers met the 10 BF weekly minimum."
            />
          </div>
        </div>
      </section>

      <ExportableScoutingReport data={exportReportData} />
    </div>
  );
}
