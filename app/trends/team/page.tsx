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

function formatWinningPercentage(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value.toFixed(3);
}

function formatPerGame(value: number | null | undefined) {
  return value === null || value === undefined ? "--" : value.toFixed(2);
}

function formatDifferential(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "--";
  }

  return value > 0 ? `+${value}` : value;
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

  const [seasonResult, rollingResult, recentGamesResult] = await Promise.all([
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
  ]);

  const season = seasonResult.data as SeasonMetrics | null;
  const rolling = rollingResult.data as RollingMetrics | null;
  const recentGames = (recentGamesResult.data ?? []) as RecentTeamGame[];
  const selectedName = selectedTeam?.name ?? selectedAbbreviation;

  return (
    <div>
      <PageHeader
        label="Team Trends"
        title="MLB Team Trends"
        description={`${selectedName} season performance, recent form, and game-level results.`}
      />

      <SectionCard
        title="Team Filter"
        description="Choose a team to update every trend view."
      >
        <TeamTrendsFilter teams={teams} selectedTeam={selectedAbbreviation} />
      </SectionCard>

      <section className="mt-8" aria-labelledby="season-heading">
        <div className="mb-5">
          <h2 id="season-heading" className="text-xl font-semibold text-white">
            Season Overview
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Full season-to-date results for {selectedAbbreviation}.
          </p>
        </div>
        <DashboardGrid>
          <StatCard label="Wins" value={season?.wins ?? "--"} />
          <StatCard label="Losses" value={season?.losses ?? "--"} />
          <StatCard
            label="Win %"
            value={formatWinningPercentage(season?.winning_percentage)}
          />
          <StatCard label="Runs Scored" value={season?.runs_scored ?? "--"} />
          <StatCard label="Runs Allowed" value={season?.runs_allowed ?? "--"} />
          <StatCard
            label="Run Differential"
            value={formatDifferential(season?.run_differential)}
          />
        </DashboardGrid>
      </section>

      <section className="mt-8" aria-labelledby="rolling-heading">
        <div className="mb-5">
          <h2 id="rolling-heading" className="text-xl font-semibold text-white">
            Rolling 14
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Performance across the latest 14 completed games.
          </p>
        </div>
        <DashboardGrid>
          <StatCard label="Wins" value={rolling?.wins ?? "--"} />
          <StatCard label="Losses" value={rolling?.losses ?? "--"} />
          <StatCard
            label="Win %"
            value={formatWinningPercentage(rolling?.winning_percentage)}
          />
          <StatCard
            label="RS/G"
            value={formatPerGame(rolling?.runs_scored_per_game)}
          />
          <StatCard
            label="RA/G"
            value={formatPerGame(rolling?.runs_allowed_per_game)}
          />
          <StatCard
            label="Diff/G"
            value={formatDifferential(rolling?.run_differential_per_game)}
          />
        </DashboardGrid>
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
