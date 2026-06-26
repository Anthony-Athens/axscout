import FavoriteTeamsOverview from "@/components/FavoriteTeamsOverview";
import PageHeader from "@/components/layout/PageHeader";
import TeamSeasonTable from "@/components/TeamSeasonTable";
import TeamSelector from "@/components/TeamSelector";
import TodaysGamesTable from "@/components/TodaysGamesTable";
import DashboardGrid from "@/components/ui/DashboardGrid";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type Team = {
  id: number;
  abbreviation: string;
  name: string;
  league: string | null;
  division: string | null;
};

async function getLastSuccessfulRefresh(supabase: Supabase) {
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

async function getTrackedGamesCount(supabase: Supabase) {
  const { count, error } = await supabase
    .from("fact_games")
    .select("*", { count: "exact", head: true });

  return error || count === null ? 0 : count;
}

async function getTeamSeasonRows(supabase: Supabase) {
  const { data, error } = await supabase
    .from("agg_team_season")
    .select(
      "team_abbreviation, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
    )
    .order("winning_percentage", { ascending: false });

  return error || !data ? [] : data;
}

async function getTodaysGames(supabase: Supabase) {
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

  return error || !data ? [] : data;
}

async function getPersonalization(supabase: Supabase, userId: string) {
  const [{ data: teamsData }, { data: favoritesData }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, abbreviation, name, league, division")
      .order("name"),
    supabase
      .from("user_favorite_teams")
      .select("team_id")
      .eq("user_id", userId),
  ]);

  const teams = (teamsData ?? []) as Team[];
  const favoriteTeamIds = (favoritesData ?? []).map((row) => Number(row.team_id));
  const favoriteTeams = teams.filter((team) => favoriteTeamIds.includes(team.id));
  const abbreviations = favoriteTeams.map((team) => team.abbreviation);

  if (!abbreviations.length) {
    return { teams, favoriteTeamIds, favoriteRows: [] };
  }

  const [{ data: seasonData }, { data: rollingData }] = await Promise.all([
    supabase
      .from("agg_team_season")
      .select(
        "team_abbreviation, games_played, wins, losses, winning_percentage, runs_scored, runs_allowed, run_differential"
      )
      .in("team_abbreviation", abbreviations),
    supabase
      .from("agg_team_rolling_14")
      .select(
        "team_abbreviation, games_played, wins, losses, winning_percentage, runs_scored_per_game, runs_allowed_per_game, run_differential_per_game"
      )
      .in("team_abbreviation", abbreviations),
  ]);

  const favoriteRows = favoriteTeams.map((team) => {
    const season = seasonData?.find(
      (row) => row.team_abbreviation === team.abbreviation
    );
    const rolling = rollingData?.find(
      (row) => row.team_abbreviation === team.abbreviation
    );

    return {
      team_abbreviation: team.abbreviation,
      games_played: season?.games_played ?? 0,
      wins: season?.wins ?? 0,
      losses: season?.losses ?? 0,
      winning_percentage: season?.winning_percentage ?? null,
      runs_scored: season?.runs_scored ?? 0,
      runs_allowed: season?.runs_allowed ?? 0,
      run_differential: season?.run_differential ?? 0,
      rolling_14: rolling ?? null,
    };
  });

  return { teams, favoriteTeamIds, favoriteRows };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [lastUpdated, trackedGamesCount, teamSeasonRows, todaysGames] =
    await Promise.all([
      getLastSuccessfulRefresh(supabase),
      getTrackedGamesCount(supabase),
      getTeamSeasonRows(supabase),
      getTodaysGames(supabase),
    ]);

  const personalization = user
    ? await getPersonalization(supabase, user.id)
    : null;
  const favoriteCount = personalization?.favoriteTeamIds.length ?? 0;

  return (
    <div>
      <PageHeader
        label="Dashboard"
        title="Your MLB Command Center"
        description="Track public MLB performance, monitor season records, and surface useful baseball intelligence."
      />

      <DashboardGrid>
        <StatCard
          label="Favorite Teams"
          value={user ? favoriteCount : "--"}
          helperText={user ? "Saved to your account" : "Log in to personalize"}
        />
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

      {user && personalization && (
        <>
          <div className="mt-8">
            <SectionCard
              title="My Teams"
              description="Season and recent form for your favorite teams."
            >
              <FavoriteTeamsOverview teams={personalization.favoriteRows} />
            </SectionCard>
          </div>

          <div className="mt-8">
            <SectionCard
              title="Favorite Teams"
              description="Select the teams you want to follow on your dashboard."
            >
              <TeamSelector
                teams={personalization.teams}
                favoriteTeamIds={personalization.favoriteTeamIds}
                isLoggedIn
              />
            </SectionCard>
          </div>
        </>
      )}

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
