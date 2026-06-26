import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";

import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { supabase } from "@/lib/supabase/client";
import TeamSelector from "@/components/TeamSelector";
import TeamSeasonTable from "@/components/TeamSeasonTable";
import TodaysGamesTable from "@/components/TodaysGamesTable";
import { createClient } from "@/lib/supabase/server";
import FavoriteTeamsOverview from "@/components/FavoriteTeamsOverview";

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

async function getTeams() {
  const { data, error } = await supabase
    .from("teams")
    .select("id, abbreviation, name, league, division")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data;
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

async function getFavoriteTeamIds(userId: string | undefined) {
  if (!userId) return [];

  const supabaseServer = await createClient();

  const { data, error } = await supabaseServer
    .from("user_favorite_teams")
    .select("team_id")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map((row) => row.team_id);
}

async function getFavoriteTeamSeasonRows(favoriteTeamIds: number[]) {
  if (!favoriteTeamIds.length) return [];

  const { data, error } = await supabase
    .from("agg_team_season")
    .select(
      "team_abbreviation, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
    )
    .in("team_key", favoriteTeamIds)
    .order("winning_percentage", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data;
}

export default async function DashboardPage() {
  const lastUpdated = await getLastSuccessfulRefresh();
  const teams = await getTeams();
  const trackedGamesCount = await getTrackedGamesCount();
  const teamSeasonRows = await getTeamSeasonRows();
  const todaysGames = await getTodaysGames();
  const supabaseServer = await createClient();

    const {
        data: { user },
    } = await supabaseServer.auth.getUser();

    const favoriteTeamIds = await getFavoriteTeamIds(user?.id);

    const favoriteTeamSeasonRows =
        await getFavoriteTeamSeasonRows(favoriteTeamIds);
 

  return (
    <div>
      <PageHeader
        label="Dashboard"
        title="Your MLB Command Center"
        description="Track your favorite teams, monitor performance trends, and surface useful baseball intelligence."
      />

      <DashboardGrid>
        <StatCard
            label="Favorite Teams"
            value={favoriteTeamIds.length}
            helperText={user ? "Saved to your profile" : "Login to save teams"}
        />
        <StatCard label="Tracked Games" value={trackedGamesCount} helperText="Loaded from warehouse" />
        <StatCard label="Model Accuracy" value="--" helperText="Coming soon" />
        <StatCard label="Last Updated" value={lastUpdated} helperText="Latest successful data refresh" />
      </DashboardGrid>

      <div className="mt-8">
        <SectionCard
            title="My Teams"
            description="A personalized snapshot of your selected MLB teams."
            >
        <FavoriteTeamsOverview teams={favoriteTeamSeasonRows} />
        </SectionCard>
      </div>

      <div className="mt-8">
        <SectionCard
          title="Select Favorite Teams"
          description="Choose the teams you want AX Scout to personalize your dashboard around."
        >
          <TeamSelector
            teams={teams}
            favoriteTeamIds={favoriteTeamIds}
            isLoggedIn={Boolean(user)}
            />
        </SectionCard>
      </div>
      
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
            title="Today’s Games"
            description="Current MLB matchups loaded from the AX Scout warehouse."
        >
            <TodaysGamesTable games={todaysGames} />
        </SectionCard>
    </div>




    </div>
  );

}