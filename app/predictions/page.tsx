import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Predictions",
  description:
    "MLB game predictions, model-driven forecasts, matchup signals, and market-aware baseball intelligence from AXScout.",
  alternates: { canonical: "/predictions" },
};

type OddsValue = number | string | null;

type OddsSnapshotRow = {
  mlb_game_pk: number | null;
  commence_time: string;
  home_team: string;
  away_team: string;
  sportsbook: string;
  market_key: "h2h" | "spreads" | "totals";
  market_last_update: string | null;
  home_price: OddsValue;
  away_price: OddsValue;
  home_point: OddsValue;
  away_point: OddsValue;
  total_point: OddsValue;
  over_price: OddsValue;
  under_price: OddsValue;
  odds_format: string;
  raw_event_id: string;
  snapshot_at: string;
};

type FactGameRow = {
  mlb_game_pk: number;
  home_probable_pitcher_name: string | null;
  away_probable_pitcher_name: string | null;
};

type MarketBundle = {
  key: string;
  mlbGamePk: number | null;
  commenceTime: string;
  homeTeam: string;
  awayTeam: string;
  sportsbook: string;
  oddsFormat: string;
  lastUpdated: string;
  markets: Partial<Record<OddsSnapshotRow["market_key"], OddsSnapshotRow>>;
};

const roadmap = [
  {
    title: "Game Win Probability",
    description:
      "Calibrated team win probabilities built from validated pregame features.",
  },
  {
    title: "Projected Score",
    description:
      "Expected run production for both clubs with transparent uncertainty ranges.",
  },
  {
    title: "Expected Starters Impact",
    description:
      "Starter quality, handedness, workload, and matchup effects in the forecast.",
  },
  {
    title: "Injury-Adjusted Context",
    description:
      "Active player availability reflected in each team's pregame outlook.",
  },
  {
    title: "Market Line Comparison",
    description:
      "Model estimates compared with available market lines when that data is ready.",
  },
  {
    title: "Model Confidence",
    description:
      "A clear signal of forecast strength, data completeness, and uncertainty.",
  },
  {
    title: "Prediction History",
    description:
      "Auditable forecasts with accuracy, calibration, and performance tracking.",
  },
];

const dataFoundation = [
  "Team season metrics",
  "Rolling 7-day team metrics",
  "Rolling 14-day team form",
  "Probable starting pitchers",
  "Pitcher ERA and WHIP",
  "Active injury reports",
  "Append-only market odds snapshots",
];

function asNumber(value: OddsValue) {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: OddsValue, oddsFormat: string) {
  const price = asNumber(value);
  if (price === null) {
    return "--";
  }
  if (oddsFormat === "american") {
    return price > 0 ? `+${Math.round(price)}` : `${Math.round(price)}`;
  }
  return price.toFixed(2);
}

function formatPoint(value: OddsValue) {
  const point = asNumber(value);
  if (point === null) {
    return "--";
  }
  const formatted = Number.isInteger(point) ? point.toFixed(1) : `${point}`;
  return point > 0 ? `+${formatted}` : formatted;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function latestMarketBundles(rows: OddsSnapshotRow[]): MarketBundle[] {
  const newestMarkets = new Map<string, OddsSnapshotRow>();
  const ordered = [...rows].sort(
    (left, right) =>
      new Date(right.snapshot_at).getTime() -
      new Date(left.snapshot_at).getTime()
  );

  for (const row of ordered) {
    const key = `${row.raw_event_id}|${row.sportsbook}|${row.market_key}`;
    if (!newestMarkets.has(key)) {
      newestMarkets.set(key, row);
    }
  }

  const bundles = new Map<string, MarketBundle>();
  for (const row of newestMarkets.values()) {
    const key = `${row.raw_event_id}|${row.sportsbook}`;
    const current = bundles.get(key) ?? {
      key,
      mlbGamePk: row.mlb_game_pk,
      commenceTime: row.commence_time,
      homeTeam: row.home_team,
      awayTeam: row.away_team,
      sportsbook: row.sportsbook,
      oddsFormat: row.odds_format,
      lastUpdated: row.market_last_update ?? row.snapshot_at,
      markets: {},
    };
    current.markets[row.market_key] = row;
    const rowUpdated = row.market_last_update ?? row.snapshot_at;
    if (new Date(rowUpdated) > new Date(current.lastUpdated)) {
      current.lastUpdated = rowUpdated;
    }
    bundles.set(key, current);
  }

  return [...bundles.values()].sort((left, right) => {
    const dateDifference =
      new Date(left.commenceTime).getTime() -
      new Date(right.commenceTime).getTime();
    return dateDifference || left.sportsbook.localeCompare(right.sportsbook);
  });
}

function moneyline(bundle: MarketBundle) {
  const market = bundle.markets.h2h;
  if (!market) {
    return "--";
  }
  return `${bundle.awayTeam} ${formatPrice(market.away_price, bundle.oddsFormat)} / ${bundle.homeTeam} ${formatPrice(market.home_price, bundle.oddsFormat)}`;
}

function spread(bundle: MarketBundle) {
  const market = bundle.markets.spreads;
  if (!market) {
    return "--";
  }
  return `${bundle.awayTeam} ${formatPoint(market.away_point)} (${formatPrice(market.away_price, bundle.oddsFormat)}) / ${bundle.homeTeam} ${formatPoint(market.home_point)} (${formatPrice(market.home_price, bundle.oddsFormat)})`;
}

function total(bundle: MarketBundle) {
  const market = bundle.markets.totals;
  if (!market) {
    return "--";
  }
  const point = formatPoint(market.total_point).replace(/^\+/, "");
  return `O ${point} (${formatPrice(market.over_price, bundle.oddsFormat)}) / U ${point} (${formatPrice(market.under_price, bundle.oddsFormat)})`;
}

function expectedStarters(game: FactGameRow | undefined) {
  if (!game) {
    return "--";
  }
  const away = game.away_probable_pitcher_name ?? "Not announced";
  const home = game.home_probable_pitcher_name ?? "Not announced";
  return `${away} / ${home}`;
}

export default async function PredictionsPage() {
  const supabase = await createClient();
  const { data: oddsData } = await supabase
    .from("odds_snapshots")
    .select(
      "mlb_game_pk, commence_time, home_team, away_team, sportsbook, market_key, market_last_update, home_price, away_price, home_point, away_point, total_point, over_price, under_price, odds_format, raw_event_id, snapshot_at"
    )
    .gte("commence_time", new Date().toISOString())
    .order("snapshot_at", { ascending: false })
    .limit(3000);

  const bundles = latestMarketBundles((oddsData ?? []) as OddsSnapshotRow[]);
  const gameIds = [
    ...new Set(
      bundles
        .map((bundle) => bundle.mlbGamePk)
        .filter((gameId): gameId is number => gameId !== null)
    ),
  ];
  const { data: factGameData } = gameIds.length
    ? await supabase
        .from("fact_games")
        .select(
          "mlb_game_pk, home_probable_pitcher_name, away_probable_pitcher_name"
        )
        .in("mlb_game_pk", gameIds)
    : { data: [] as FactGameRow[] };
  const gamesByPk = new Map(
    ((factGameData ?? []) as FactGameRow[]).map((game) => [
      game.mlb_game_pk,
      game,
    ])
  );

  return (
    <div className="space-y-8">
      <div>
        <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700 ring-1 ring-inset ring-blue-200">
          Beta
        </span>
        <div className="mt-4">
          <PageHeader
            label="Prediction Intelligence"
            title="Predictions"
            description="Model-driven MLB game forecasts, matchup signals, expected starters, injury context, and market-aware insights."
          />
        </div>
      </div>

      <aside className="rounded-lg border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-semibold text-slate-950">Important Disclaimer</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-700">
          AXScout predictions are experimental and provided for informational
          and entertainment purposes only. They are not financial, gambling,
          or betting advice.
        </p>
      </aside>

      <section aria-labelledby="market-lines-heading">
        <div className="mb-5">
          <h2
            id="market-lines-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Upcoming Games and Market Lines
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest available sportsbook snapshots with model fields reserved
            for future validated forecasts.
          </p>
        </div>

        {bundles.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1600px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Game",
                      "Date",
                      "Expected Starters",
                      "Moneyline",
                      "Spread",
                      "Total",
                      "Sportsbook",
                      "Last Updated",
                      "AXScout Lean",
                      "Win Probability",
                      "Confidence",
                      "Status",
                    ].map((column) => (
                      <th
                        key={column}
                        scope="col"
                        className="whitespace-nowrap px-4 py-3 font-semibold"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundles.map((bundle) => (
                    <tr key={bundle.key} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">
                        {bundle.awayTeam} at {bundle.homeTeam}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDateTime(bundle.commenceTime)}
                      </td>
                      <td className="min-w-56 px-4 py-3 text-slate-700">
                        {expectedStarters(
                          bundle.mlbGamePk
                            ? gamesByPk.get(bundle.mlbGamePk)
                            : undefined
                        )}
                      </td>
                      <td className="min-w-52 px-4 py-3 text-slate-700">
                        {moneyline(bundle)}
                      </td>
                      <td className="min-w-64 px-4 py-3 text-slate-700">
                        {spread(bundle)}
                      </td>
                      <td className="min-w-52 px-4 py-3 text-slate-700">
                        {total(bundle)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {bundle.sportsbook}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatDateTime(bundle.lastUpdated)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        Coming soon
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        Coming soon
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        Coming soon
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-blue-700">
                        Data foundation active
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="font-semibold text-slate-900">
              Market lines are not available yet.
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Odds ingestion is ready once ODDS_API_KEY is configured.
            </p>
          </div>
        )}
      </section>

      <SectionCard
        title="Prediction Roadmap"
        description="The forecast outputs planned for the AXScout prediction system."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roadmap.map((item) => (
            <article
              key={item.title}
              className="border-l-2 border-blue-200 py-2 pl-4"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-950">
                  {item.title}
                </h3>
                <span className="shrink-0 text-xs font-semibold text-blue-600">
                  Planned
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Data Foundation"
        description="Forecasts will build on the same warehouse-backed context used throughout AXScout."
      >
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {dataFoundation.map((source) => (
            <li
              key={source}
              className="border-b border-slate-200 py-3 text-sm font-medium text-slate-700"
            >
              {source}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
