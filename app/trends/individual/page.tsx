import WeeklyMetricChart, {
  type WeeklyMetricPoint,
} from "@/components/charts/WeeklyMetricChart";
import PageHeader from "@/components/layout/PageHeader";
import PlayerTrendsFilter, {
  type PlayerFilterOption,
} from "@/components/PlayerTrendsFilter";
import DashboardGrid from "@/components/ui/DashboardGrid";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/server";

const PLAYER_PAGE_SIZE = 1000;

type OffenseSeason = {
  season: number;
  plate_appearances: number | null;
  batting_average: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type PitchingSeason = {
  season: number;
  batters_faced: number | null;
  strikeouts: number | null;
  walks: number | null;
  hits_allowed: number | null;
  home_runs_allowed: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
  era: number | null;
  whip: number | null;
};

type OffenseWeekly = {
  week_start_date: string;
  batting_average: number | null;
  ops: number | null;
  home_runs: number | null;
  avg_exit_velocity: number | null;
};

type PitchingWeekly = {
  week_start_date: string;
  strikeouts: number | null;
  walks: number | null;
  home_runs_allowed: number | null;
  avg_pitch_speed: number | null;
  avg_spin_rate: number | null;
};

function formatDecimal(value: number | null | undefined, digits = 3) {
  return value === null || value === undefined ? "--" : value.toFixed(digits);
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

export default async function IndividualTrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string | string[] }>;
}) {
  const supabase = await createClient();
  const players: PlayerFilterOption[] = [];
  let offset = 0;

  while (true) {
    const { data } = await supabase
      .from("dim_players")
      .select(
        "player_key, mlb_player_id, full_name, current_team_abbreviation, primary_position"
      )
      .not("mlb_player_id", "is", null)
      .order("full_name")
      .order("mlb_player_id")
      .range(offset, offset + PLAYER_PAGE_SIZE - 1);
    const page = (data ?? []).filter(
      (player): player is PlayerFilterOption =>
        typeof player.mlb_player_id === "number" &&
        typeof player.full_name === "string" &&
        player.full_name.trim().length > 0
    );
    players.push(...page);

    if (!data || data.length < PLAYER_PAGE_SIZE) {
      break;
    }
    offset += PLAYER_PAGE_SIZE;
  }

  const query = await searchParams;
  const rawPlayerId = Array.isArray(query.playerId)
    ? query.playerId[0]
    : query.playerId;
  const requestedPlayerId = rawPlayerId ? Number(rawPlayerId) : null;
  const requestedPlayer = Number.isInteger(requestedPlayerId)
    ? players.find((player) => player.mlb_player_id === requestedPlayerId)
    : undefined;

  const [defaultOffenseResult, defaultPitchingResult] = await Promise.all([
    supabase
      .from("agg_player_offense_season")
      .select("mlb_player_id")
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("plate_appearances", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_player_pitching_season")
      .select("mlb_player_id")
      .not("mlb_player_id", "is", null)
      .order("season", { ascending: false })
      .order("batters_faced", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const defaultPlayerIds = [
    defaultOffenseResult.data?.mlb_player_id,
    defaultPitchingResult.data?.mlb_player_id,
  ];
  const selectedPlayer =
    requestedPlayer ??
    players.find((player) => defaultPlayerIds.includes(player.mlb_player_id)) ??
    players[0];

  if (!selectedPlayer) {
    return (
      <div>
        <PageHeader
          label="Player Trends"
          title="MLB Player Trends"
          description="Year-to-date performance and weekly Statcast trends."
        />
        <EmptyState
          title="No players available"
          description="Player trends will appear after the player warehouse is populated."
        />
      </div>
    );
  }

  const playerId = selectedPlayer.mlb_player_id;
  const [offenseSeasonResult, pitchingSeasonResult] = await Promise.all([
    supabase
      .from("agg_player_offense_season")
      .select(
        "season, plate_appearances, batting_average, obp, slg, ops, home_runs, avg_exit_velocity"
      )
      .eq("mlb_player_id", playerId)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("agg_player_pitching_season")
      .select(
        "season, batters_faced, strikeouts, walks, hits_allowed, home_runs_allowed, avg_pitch_speed, avg_spin_rate, era, whip"
      )
      .eq("mlb_player_id", playerId)
      .order("season", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const offenseSeason = offenseSeasonResult.data as OffenseSeason | null;
  const pitchingSeason = pitchingSeasonResult.data as PitchingSeason | null;

  let offenseWeeklyQuery = supabase
    .from("agg_player_offense_weekly")
    .select(
      "week_start_date, batting_average, ops, home_runs, avg_exit_velocity"
    )
    .eq("mlb_player_id", playerId);
  if (offenseSeason) {
    offenseWeeklyQuery = offenseWeeklyQuery.eq("season", offenseSeason.season);
  }

  let pitchingWeeklyQuery = supabase
    .from("agg_player_pitching_weekly")
    .select(
      "week_start_date, strikeouts, walks, home_runs_allowed, avg_pitch_speed, avg_spin_rate"
    )
    .eq("mlb_player_id", playerId);
  if (pitchingSeason) {
    pitchingWeeklyQuery = pitchingWeeklyQuery.eq("season", pitchingSeason.season);
  }

  const [offenseWeeklyResult, pitchingWeeklyResult] = await Promise.all([
    offenseWeeklyQuery.order("week_start_date", { ascending: false }).limit(12),
    pitchingWeeklyQuery.order("week_start_date", { ascending: false }).limit(12),
  ]);
  const offenseWeekly = (
    (offenseWeeklyResult.data ?? []) as OffenseWeekly[]
  ).reverse();
  const pitchingWeekly = (
    (pitchingWeeklyResult.data ?? []) as PitchingWeekly[]
  ).reverse();

  return (
    <div>
      <PageHeader
        label="Player Trends"
        title={selectedPlayer.full_name}
        description="Year-to-date performance and weekly Statcast trends."
      />

      <div className="mb-8 flex flex-wrap gap-x-8 gap-y-3 border-y border-slate-200 py-4 text-sm">
        <p>
          <span className="text-slate-500">Team</span>{" "}
          <span className="font-semibold text-slate-900">
            {selectedPlayer.current_team_abbreviation ?? "--"}
          </span>
        </p>
        <p>
          <span className="text-slate-500">Position</span>{" "}
          <span className="font-semibold text-slate-900">
            {selectedPlayer.primary_position ?? "--"}
          </span>
        </p>
        <p>
          <span className="text-slate-500">MLB ID</span>{" "}
          <span className="font-semibold text-slate-900">{playerId}</span>
        </p>
      </div>

      <SectionCard
        title="Player Search"
        description="Find a player by name, team, position, or MLB ID."
      >
        <PlayerTrendsFilter players={players} selectedPlayerId={playerId} />
      </SectionCard>

      <section className="mt-8" aria-labelledby="offense-heading">
        <div className="mb-5">
          <h2 id="offense-heading" className="text-xl font-semibold text-slate-900">
            YTD Offense
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {offenseSeason
              ? `${offenseSeason.season} season-to-date batting performance.`
              : "Season-to-date batting performance."}
          </p>
        </div>
        {offenseSeason ? (
          <DashboardGrid>
            <StatCard
              label="Plate Appearances"
              value={offenseSeason.plate_appearances ?? "--"}
            />
            <StatCard
              label="Batting Average"
              value={formatDecimal(offenseSeason.batting_average)}
            />
            <StatCard label="OBP" value={formatDecimal(offenseSeason.obp)} />
            <StatCard label="SLG" value={formatDecimal(offenseSeason.slg)} />
            <StatCard label="OPS" value={formatDecimal(offenseSeason.ops)} />
            <StatCard
              label="Home Runs"
              value={offenseSeason.home_runs ?? "--"}
            />
            <StatCard
              label="Avg Exit Velocity"
              value={formatDecimal(offenseSeason.avg_exit_velocity, 2)}
              helperText="mph"
            />
          </DashboardGrid>
        ) : (
          <EmptyState
            title="No offense data"
            description="No season offense aggregate is available for this player."
          />
        )}
      </section>

      <section className="mt-8" aria-labelledby="pitching-heading">
        <div className="mb-5">
          <h2 id="pitching-heading" className="text-xl font-semibold text-slate-900">
            YTD Pitching
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {pitchingSeason
              ? `${pitchingSeason.season} season-to-date pitching performance.`
              : "Season-to-date pitching performance."}
          </p>
        </div>
        {pitchingSeason ? (
          <DashboardGrid>
            <StatCard
              label="Batters Faced"
              value={pitchingSeason.batters_faced ?? "--"}
            />
            <StatCard
              label="Strikeouts"
              value={pitchingSeason.strikeouts ?? "--"}
            />
            <StatCard label="Walks" value={pitchingSeason.walks ?? "--"} />
            <StatCard
              label="Hits Allowed"
              value={pitchingSeason.hits_allowed ?? "--"}
            />
            <StatCard
              label="Home Runs Allowed"
              value={pitchingSeason.home_runs_allowed ?? "--"}
            />
            <StatCard
              label="Avg Pitch Speed"
              value={formatDecimal(pitchingSeason.avg_pitch_speed, 2)}
              helperText="mph"
            />
            <StatCard
              label="Avg Spin Rate"
              value={formatDecimal(pitchingSeason.avg_spin_rate, 0)}
              helperText="rpm"
            />
            <StatCard
              label="ERA"
              value={formatDecimal(pitchingSeason.era, 2)}
              helperText={pitchingSeason.era === null ? "Coming soon" : undefined}
            />
            <StatCard
              label="WHIP"
              value={formatDecimal(pitchingSeason.whip)}
              helperText={pitchingSeason.whip === null ? "Coming soon" : undefined}
            />
          </DashboardGrid>
        ) : (
          <EmptyState
            title="No pitching data"
            description="No season pitching aggregate is available for this player."
          />
        )}
      </section>

      <section className="mt-8" aria-labelledby="offense-trends-heading">
        <div className="mb-5">
          <h2
            id="offense-trends-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Weekly Offense Trends
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Weekly batting results and quality of contact.
          </p>
        </div>
        {offenseWeekly.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyMetricChart
              title="Batting Average"
              data={chartData(offenseWeekly, "batting_average")}
              color="#38bdf8"
              valueFormat="decimal3"
            />
            <WeeklyMetricChart
              title="OPS"
              data={chartData(offenseWeekly, "ops")}
              color="#34d399"
              valueFormat="decimal3"
            />
            <WeeklyMetricChart
              title="Home Runs"
              data={chartData(offenseWeekly, "home_runs")}
              color="#f59e0b"
              valueFormat="integer"
            />
            <WeeklyMetricChart
              title="Average Exit Velocity"
              data={chartData(offenseWeekly, "avg_exit_velocity")}
              color="#fb7185"
            />
          </div>
        ) : (
          <EmptyState
            title="No weekly offense trends"
            description="Weekly offense aggregates are not available for this player."
          />
        )}
      </section>

      <section className="mt-8" aria-labelledby="pitching-trends-heading">
        <div className="mb-5">
          <h2
            id="pitching-trends-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Weekly Pitching Trends
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Weekly outcomes, velocity, and pitch characteristics.
          </p>
        </div>
        {pitchingWeekly.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <WeeklyMetricChart
              title="Strikeouts"
              data={chartData(pitchingWeekly, "strikeouts")}
              color="#22d3ee"
              valueFormat="integer"
            />
            <WeeklyMetricChart
              title="Walks"
              data={chartData(pitchingWeekly, "walks")}
              color="#f59e0b"
              valueFormat="integer"
            />
            <WeeklyMetricChart
              title="Home Runs Allowed"
              data={chartData(pitchingWeekly, "home_runs_allowed")}
              color="#f87171"
              valueFormat="integer"
            />
            <WeeklyMetricChart
              title="Average Pitch Speed"
              data={chartData(pitchingWeekly, "avg_pitch_speed")}
              color="#a3e635"
            />
            <WeeklyMetricChart
              title="Average Spin Rate"
              data={chartData(pitchingWeekly, "avg_spin_rate")}
              color="#fb923c"
            />
          </div>
        ) : (
          <EmptyState
            title="No weekly pitching trends"
            description="Weekly pitching aggregates are not available for this player."
          />
        )}
      </section>
    </div>
  );
}
