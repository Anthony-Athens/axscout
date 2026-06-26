import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import TeamSeasonTable from "@/components/TeamSeasonTable";
import TodaysGamesTable from "@/components/TodaysGamesTable";
import { supabase } from "@/lib/supabase/client";

async function getLastSuccessfulRefresh() {
  const { data, error } = await supabase
    .from("data_refresh_runs")
    .select("finished_at")
    .eq("status", "success")
    .order("finished_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data?.finished_at) {
    return "Awaiting data refresh";
  }

  return new Date(data.finished_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

async function getTrackedGamesCount() {
  const { count, error } = await supabase
    .from("fact_games")
    .select("*", { count: "exact", head: true });

  if (error || count === null) {
    return 0;
  }

  return count;
}

async function getTeamSeasonRows() {
  const { data, error } = await supabase
    .from("agg_team_season")
    .select(
      "team_abbreviation, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
    )
    .order("winning_percentage", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

async function getTodaysGames() {
  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("fact_games")
    .select(`
      mlb_game_pk,
      game_date,
      home_score,
      away_score,
      status,
      home_team:dim_teams!fact_games_home_team_key_fkey(abbreviation),
      away_team:dim_teams!fact_games_away_team_key_fkey(abbreviation)
    `)
    .eq("game_date", today)
    .order("mlb_game_pk", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
}

export default async function DashboardPage() {
  const lastUpdated = await getLastSuccessfulRefresh();
  const trackedGamesCount = await getTrackedGamesCount();
  const teamSeasonRows = await getTeamSeasonRows();
  const todaysGames = await getTodaysGames();

  return (
    <div>
      <PageHeader
        label="Dashboard"
        title="Your MLB Command Center"
        description="Track public MLB performance, monitor season records, and surface useful baseball intelligence."
      />

      <DashboardGrid>
        <StatCard label="Favorite Teams" value="--" helperText="Coming soon" />
        <StatCard
          label="Tracked Games"
          value={trackedGamesCount}
          helperText="Loaded from warehouse"
        />
        <StatCard label="Model Accuracy" value="--" helperText="Coming soon" />
        <StatCard
          label="Last Updated"
          value={lastUpdated}
          helperText="Latest successful data refresh"
        />
      </DashboardGrid>

      <div className="mt-8">
        <SectionCard
          title="Team Season Overview"
          description="Season-to-date team records and run production from the AX Scout warehouse."
        >
          <TeamSeasonTable rows={teamSeasonRows} />
        </SectionCard>
      </div>

      <div className="mt-8">
        <SectionCard
          title="Today's Games"
          description="Current MLB matchups loaded from the AX Scout warehouse."
        >
          <TodaysGamesTable games={todaysGames} />
        </SectionCard>
      </div>
    </div>
  );
}
