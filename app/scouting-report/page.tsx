import PageHeader from "@/components/layout/PageHeader";
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

const DEFAULT_TEAM_A = "PIT";
const DEFAULT_TEAM_B = "CHC";

type SeasonMetrics = {
  season: number;
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
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type PitchingPlayerRow = {
  season: number;
  mlb_player_id: number;
  strikeouts: number | null;
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
    : rows.filter((row) => row.season === latestSeason).slice(0, 3);
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
  ] = await Promise.all([
    supabase
      .from("agg_team_season")
      .select(
        "season, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
      )
      .eq("team_abbreviation", abbreviationA)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_team_season")
      .select(
        "season, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
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
      .select("season, mlb_player_id, ops, home_runs, avg_exit_velocity")
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("ops", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_offense_season")
      .select("season, mlb_player_id, ops, home_runs, avg_exit_velocity")
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("ops", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, mlb_player_id, strikeouts, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationA)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("strikeouts", { ascending: false, nullsFirst: false })
      .limit(50),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, mlb_player_id, strikeouts, avg_pitch_speed, avg_spin_rate"
      )
      .eq("team_abbreviation", abbreviationB)
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("strikeouts", { ascending: false, nullsFirst: false })
      .limit(50),
  ]);

  const seasonA = seasonAResult.data as SeasonMetrics | null;
  const seasonB = seasonBResult.data as SeasonMetrics | null;
  const rollingA = rollingAResult.data as RollingMetrics | null;
  const rollingB = rollingBResult.data as RollingMetrics | null;
  const offenseA = offenseAResult.data as WeeklyOffense | null;
  const offenseB = offenseBResult.data as WeeklyOffense | null;
  const pitchingA = pitchingAResult.data as WeeklyPitching | null;
  const pitchingB = pitchingBResult.data as WeeklyPitching | null;
  const offensePlayersA = latestSeasonRows(
    (offensePlayersAResult.data ?? []) as OffensePlayerRow[]
  );
  const offensePlayersB = latestSeasonRows(
    (offensePlayersBResult.data ?? []) as OffensePlayerRow[]
  );
  const pitchingPlayersA = latestSeasonRows(
    (pitchingPlayersAResult.data ?? []) as PitchingPlayerRow[]
  );
  const pitchingPlayersB = latestSeasonRows(
    (pitchingPlayersBResult.data ?? []) as PitchingPlayerRow[]
  );
  const playerIds = [
    ...offensePlayersA,
    ...offensePlayersB,
    ...pitchingPlayersA,
    ...pitchingPlayersB,
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
  const offenseLeaders = (rows: OffensePlayerRow[]): LeaderboardPlayer[] =>
    rows.map((player) => ({
      mlb_player_id: player.mlb_player_id,
      full_name:
        playerNames.get(player.mlb_player_id) ?? `Player ${player.mlb_player_id}`,
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
      full_name:
        playerNames.get(player.mlb_player_id) ?? `Player ${player.mlb_player_id}`,
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
            Season leaders ranked by OPS.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerLeaderboard
            team={abbreviationA}
            title={teamA.name}
            players={offenseLeaders(offensePlayersA)}
          />
          <PlayerLeaderboard
            team={abbreviationB}
            title={teamB.name}
            players={offenseLeaders(offensePlayersB)}
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
            Season leaders ranked by strikeouts.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PlayerLeaderboard
            team={abbreviationA}
            title={teamA.name}
            players={pitchingLeaders(pitchingPlayersA)}
          />
          <PlayerLeaderboard
            team={abbreviationB}
            title={teamB.name}
            players={pitchingLeaders(pitchingPlayersB)}
          />
        </div>
      </section>
    </div>
  );
}
