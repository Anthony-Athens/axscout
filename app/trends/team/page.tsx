import WeeklyMetricChart, {
  type WeeklyMetricPoint,
} from "@/components/charts/WeeklyMetricChart";
import PageHeader from "@/components/layout/PageHeader";
import RecentTeamGamesTable, {
  type RecentTeamGame,
} from "@/components/RecentTeamGamesTable";
import TeamTrendsFilter, {
  type TeamFilterOption,
} from "@/components/TeamTrendsFilter";
import DashboardGrid from "@/components/ui/DashboardGrid";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TEAM = "PIT";

type SeasonMetrics = {
  wins: number;
  losses: number;
  winning_percentage: number | null;
  runs_scored: number;
  runs_allowed: number;
  run_differential: number;
};

type RollingMetrics = SeasonMetrics & {
  runs_scored_per_game: number | null;
  runs_allowed_per_game: number | null;
  run_differential_per_game: number | null;
};

type WeeklyOffense = {
  week_start_date: string;
  batting_average: number | null;
  ops: number | null;
  home_runs: number;
  avg_exit_velocity: number | null;
};

type WeeklyPitching = {
  week_start_date: string;
  strikeouts: number;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
  era: number | null;
  whip: number | null;
};

function formatWinningPercentage(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value.toFixed(3);
}

function formatDecimal(value: number | null | undefined, digits = 2) {
  return value === null || value === undefined ? "--" : value.toFixed(digits);
}

function formatDifferential(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : value;
}

function chartData<T extends { week_start_date: string }>(
  rows: T[],
  key: keyof T
): WeeklyMetricPoint[] {
  return rows.map((row) => ({
    week_start_date: row.week_start_date,
    value: typeof row[key] === "number" ? row[key] : null,
  }));
}

export default async function TeamTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string | string[] }>;
}) {
  const supabase = await createClient();
  const { data: teamsData } = await supabase
    .from("dim_teams")
    .select("team_key, abbreviation, name")
    .order("name");

  const teams = (teamsData ?? []) as TeamFilterOption[];
  const query = await searchParams;
  const requestedTeam = Array.isArray(query.team) ? query.team[0] : query.team;
  const normalizedTeam = requestedTeam?.trim().toUpperCase() ?? DEFAULT_TEAM;
  const selectedTeam =
    teams.find((team) => team.abbreviation === normalizedTeam) ??
    teams.find((team) => team.abbreviation === DEFAULT_TEAM) ??
    teams[0];
  const selectedAbbreviation = selectedTeam?.abbreviation ?? DEFAULT_TEAM;

  const [
    seasonResult,
    rollingResult,
    recentGamesResult,
    offenseResult,
    pitchingResult,
  ] = await Promise.all([
    supabase
      .from("agg_team_season")
      .select(
        "wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
      )
      .eq("team_abbreviation", selectedAbbreviation)
      .maybeSingle(),
    supabase
      .from("agg_team_rolling_14")
      .select(
        "wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential, runs_scored_per_game, runs_allowed_per_game, run_differential_per_game"
      )
      .eq("team_abbreviation", selectedAbbreviation)
      .maybeSingle(),
    supabase
      .from("agg_team_daily")
      .select(
        "mlb_game_pk, game_date, opponent_abbreviation, is_home, wins, losses, runs_scored, runs_allowed, run_differential"
      )
      .eq("team_abbreviation", selectedAbbreviation)
      .order("game_date", { ascending: false })
      .order("mlb_game_pk", { ascending: false })
      .limit(10),
    supabase
      .from("agg_team_offense_weekly")
      .select(
        "week_start_date, batting_average, ops, home_runs, avg_exit_velocity"
      )
      .eq("team_abbreviation", selectedAbbreviation)
      .order("week_start_date", { ascending: false })
      .limit(12),
    supabase
      .from("agg_team_pitching_weekly")
      .select(
        "week_start_date, strikeouts, avg_pitch_speed, avg_spin_rate, era, whip"
      )
      .eq("team_abbreviation", selectedAbbreviation)
      .order("week_start_date", { ascending: false })
      .limit(12),
  ]);

  const season = seasonResult.data as SeasonMetrics | null;
  const rolling = rollingResult.data as RollingMetrics | null;
  const recentGames = (recentGamesResult.data ?? []) as RecentTeamGame[];
  const offense = ((offenseResult.data ?? []) as WeeklyOffense[]).reverse();
  const pitching = ((pitchingResult.data ?? []) as WeeklyPitching[]).reverse();
  const latestOffense = offense[offense.length - 1];
  const latestPitching = pitching[pitching.length - 1];
  const selectedName = selectedTeam?.name ?? selectedAbbreviation;

  return (
    <div>
      <PageHeader
        label="Team Trends"
        title="MLB Team Trends"
        description={`${selectedName} season performance, recent form, and weekly Statcast trends.`}
      />

      <SectionCard
        title="Team Filter"
        description="Choose a team to update every trend view."
      >
        <TeamTrendsFilter teams={teams} selectedTeam={selectedAbbreviation} />
      </SectionCard>

      <section className="mt-8" aria-labelledby="overall-heading">
        <div className="mb-5">
          <h2 id="overall-heading" className="text-xl font-semibold text-slate-900">
            Overall Summary
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Season-to-date results and recent 14-game form.
          </p>
        </div>
        <DashboardGrid>
          <StatCard
            label="Season Record"
            value={season ? `${season.wins}-${season.losses}` : "--"}
          />
          <StatCard
            label="Season Win %"
            value={formatWinningPercentage(season?.winning_percentage)}
          />
          <StatCard label="Runs Scored" value={season?.runs_scored ?? "--"} />
          <StatCard label="Runs Allowed" value={season?.runs_allowed ?? "--"} />
          <StatCard
            label="Run Differential"
            value={formatDifferential(season?.run_differential)}
          />
          <StatCard
            label="Last 14 Record"
            value={rolling ? `${rolling.wins}-${rolling.losses}` : "--"}
          />
          <StatCard
            label="Last 14 Win %"
            value={formatWinningPercentage(rolling?.winning_percentage)}
          />
          <StatCard
            label="Last 14 Diff/G"
            value={formatDifferential(rolling?.run_differential_per_game)}
          />
        </DashboardGrid>
      </section>

      <section className="mt-8" aria-labelledby="offense-heading">
        <div className="mb-5">
          <h2 id="offense-heading" className="text-xl font-semibold text-slate-900">
            Offensive Statistics
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest available weekly batting metrics.
          </p>
        </div>
        <DashboardGrid>
          <StatCard
            label="Batting Average"
            value={formatDecimal(latestOffense?.batting_average, 3)}
          />
          <StatCard label="OPS" value={formatDecimal(latestOffense?.ops, 3)} />
          <StatCard label="Home Runs" value={latestOffense?.home_runs ?? "--"} />
          <StatCard
            label="Avg Exit Velocity"
            value={formatDecimal(latestOffense?.avg_exit_velocity)}
            helperText="mph"
          />
        </DashboardGrid>
      </section>

      <section className="mt-8" aria-labelledby="pitching-heading">
        <div className="mb-5">
          <h2 id="pitching-heading" className="text-xl font-semibold text-slate-900">
            Pitching Statistics
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest available weekly pitching metrics.
          </p>
        </div>
        <DashboardGrid>
          <StatCard label="Strikeouts" value={latestPitching?.strikeouts ?? "--"} />
          <StatCard
            label="Avg Pitch Speed"
            value={formatDecimal(latestPitching?.avg_pitch_speed)}
            helperText="mph"
          />
          <StatCard
            label="Avg Spin Rate"
            value={formatDecimal(latestPitching?.avg_spin_rate)}
            helperText="rpm"
          />
          <StatCard
            label="ERA"
            value={latestPitching?.era === null || !latestPitching ? "--" : formatDecimal(latestPitching.era)}
            helperText={latestPitching?.era === null || !latestPitching ? "Coming soon" : undefined}
          />
          <StatCard
            label="WHIP"
            value={latestPitching?.whip === null || !latestPitching ? "--" : formatDecimal(latestPitching.whip, 3)}
            helperText={latestPitching?.whip === null || !latestPitching ? "Coming soon" : undefined}
          />
        </DashboardGrid>
      </section>

      <section className="mt-8" aria-labelledby="offense-trends-heading">
        <div className="mb-5">
          <h2 id="offense-trends-heading" className="text-xl font-semibold text-slate-900">
            Weekly Offensive Trends
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Calendar-week movement across the latest available Statcast window.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyMetricChart
            title="Batting Average"
            data={chartData(offense, "batting_average")}
            color="#38bdf8"
            valueFormat="decimal3"
          />
          <WeeklyMetricChart
            title="OPS"
            data={chartData(offense, "ops")}
            color="#34d399"
            valueFormat="decimal3"
          />
          <WeeklyMetricChart
            title="Home Runs"
            data={chartData(offense, "home_runs")}
            color="#f59e0b"
            valueFormat="integer"
          />
          <WeeklyMetricChart
            title="Average Exit Velocity"
            data={chartData(offense, "avg_exit_velocity")}
            color="#fb7185"
          />
        </div>
      </section>

      <section className="mt-8" aria-labelledby="pitching-trends-heading">
        <div className="mb-5">
          <h2 id="pitching-trends-heading" className="text-xl font-semibold text-slate-900">
            Weekly Pitching Trends
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Calendar-week pitching volume and pitch-quality movement.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <WeeklyMetricChart
            title="Strikeouts"
            data={chartData(pitching, "strikeouts")}
            color="#22d3ee"
            valueFormat="integer"
          />
          <WeeklyMetricChart
            title="Average Pitch Speed"
            data={chartData(pitching, "avg_pitch_speed")}
            color="#a3e635"
          />
          <WeeklyMetricChart
            title="Average Spin Rate"
            data={chartData(pitching, "avg_spin_rate")}
            color="#fb923c"
          />
          <WeeklyMetricChart
            title="ERA"
            data={chartData(pitching, "era")}
            color="#f87171"
            emptyLabel="Coming soon"
          />
          <WeeklyMetricChart
            title="WHIP"
            data={chartData(pitching, "whip")}
            color="#c084fc"
            valueFormat="decimal3"
            emptyLabel="Coming soon"
          />
        </div>
      </section>

      <div className="mt-8">
        <SectionCard
          title="Recent Games"
          description={`Latest completed games for ${selectedAbbreviation}.`}
        >
          <RecentTeamGamesTable games={recentGames} />
        </SectionCard>
      </div>
    </div>
  );
}
