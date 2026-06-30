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

type NumericValue = number | string | null;

type PredictionRow = {
  mlb_game_pk: number;
  game_date: string;
  home_team: string;
  away_team: string;
  predicted_winner: string | null;
  home_win_probability: NumericValue;
  away_win_probability: NumericValue;
  confidence: "Low" | "Medium" | "High" | null;
  axscout_lean: string | null;
  market_sportsbook: string | null;
  market_home_moneyline: NumericValue;
  market_away_moneyline: NumericValue;
  edge_summary: string | null;
  explanation: string | null;
  model_version: string;
  prediction_status: string;
};

type FactGameRow = {
  mlb_game_pk: number;
  home_probable_pitcher_name: string | null;
  away_probable_pitcher_name: string | null;
};

type OddsTimeRow = {
  mlb_game_pk: number | null;
  commence_time: string;
  snapshot_at: string;
};

const roadmap = [
  {
    title: "Game Win Probability",
    description:
      "Conservative probabilities from transparent team, starter, and availability rules.",
    status: "Rules v1 live",
  },
  {
    title: "Projected Score",
    description:
      "Expected run production for both clubs with transparent uncertainty ranges.",
    status: "Planned",
  },
  {
    title: "Expected Starters Impact",
    description:
      "Probable starter ERA and WHIP contribute when both starters are available.",
    status: "Rules v1 live",
  },
  {
    title: "Injury-Adjusted Context",
    description:
      "Active injury counts provide a small, capped availability adjustment.",
    status: "Rules v1 live",
  },
  {
    title: "Market Line Comparison",
    description:
      "AXScout probabilities are compared with the latest available moneyline.",
    status: "Rules v1 live",
  },
  {
    title: "Prediction History",
    description:
      "Auditable forecasts with accuracy, calibration, and performance tracking.",
    status: "Planned",
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

function asNumber(value: NumericValue) {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatPrice(value: NumericValue) {
  const price = asNumber(value);
  if (price === null) {
    return "--";
  }
  return price > 0 ? `+${Math.round(price)}` : `${Math.round(price)}`;
}

function formatProbability(value: NumericValue) {
  const probability = asNumber(value);
  return probability === null ? "--" : `${Math.round(probability * 100)}%`;
}

function formatDateTime(value: string | undefined, fallbackDate: string) {
  const date = new Date(value ?? `${fallbackDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return fallbackDate;
  }
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    ...(value ? { timeStyle: "short" as const } : {}),
    timeZone: "America/New_York",
  }).format(date);
}

function expectedStarters(game: FactGameRow | undefined) {
  if (!game) {
    return "Not announced / Not announced";
  }
  return `${game.away_probable_pitcher_name ?? "Not announced"} / ${game.home_probable_pitcher_name ?? "Not announced"}`;
}

function marketLine(prediction: PredictionRow) {
  const away = formatPrice(prediction.market_away_moneyline);
  const home = formatPrice(prediction.market_home_moneyline);
  if (away === "--" && home === "--") {
    return "--";
  }
  return `${prediction.away_team} ${away} / ${prediction.home_team} ${home}`;
}

function predictedProbability(prediction: PredictionRow) {
  return prediction.predicted_winner === prediction.home_team
    ? prediction.home_win_probability
    : prediction.away_win_probability;
}

export default async function PredictionsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: predictionData } = await supabase
    .from("game_predictions")
    .select(
      "mlb_game_pk, game_date, home_team, away_team, predicted_winner, home_win_probability, away_win_probability, confidence, axscout_lean, market_sportsbook, market_home_moneyline, market_away_moneyline, edge_summary, explanation, model_version, prediction_status"
    )
    .gte("game_date", today)
    .eq("model_name", "rules_based_v1")
    .order("game_date")
    .order("mlb_game_pk")
    .limit(100);

  const predictions = (predictionData ?? []) as PredictionRow[];
  const gameIds = predictions.map((prediction) => prediction.mlb_game_pk);
  const [{ data: factGameData }, { data: oddsTimeData }] = gameIds.length
    ? await Promise.all([
        supabase
          .from("fact_games")
          .select(
            "mlb_game_pk, home_probable_pitcher_name, away_probable_pitcher_name"
          )
          .in("mlb_game_pk", gameIds),
        supabase
          .from("odds_snapshots")
          .select("mlb_game_pk, commence_time, snapshot_at")
          .in("mlb_game_pk", gameIds)
          .eq("market_key", "h2h")
          .order("snapshot_at", { ascending: false })
          .limit(1000),
      ])
    : [
        { data: [] as FactGameRow[] },
        { data: [] as OddsTimeRow[] },
      ];

  const gamesByPk = new Map(
    ((factGameData ?? []) as FactGameRow[]).map((game) => [
      game.mlb_game_pk,
      game,
    ])
  );
  const timesByPk = new Map<number, string>();
  for (const row of (oddsTimeData ?? []) as OddsTimeRow[]) {
    if (row.mlb_game_pk !== null && !timesByPk.has(row.mlb_game_pk)) {
      timesByPk.set(row.mlb_game_pk, row.commence_time);
    }
  }

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
            description="Explainable MLB game forecasts using team form, expected starters, injury context, and market-aware comparisons."
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

      <section aria-labelledby="predictions-heading">
        <div className="mb-5">
          <h2
            id="predictions-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Upcoming Game Predictions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Rules-based v1 forecasts with deliberately conservative
            probabilities and concise, deterministic reasoning.
          </p>
        </div>

        {predictions.length ? (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1450px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Game",
                      "Date / Time",
                      "Expected Starters",
                      "AXScout Lean",
                      "Win Probability",
                      "Confidence",
                      "Market Line",
                      "Edge Summary",
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
                  {predictions.map((prediction) => (
                    <tr key={prediction.mlb_game_pk} className="align-top">
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
                        {prediction.away_team} at {prediction.home_team}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatDateTime(
                          timesByPk.get(prediction.mlb_game_pk),
                          prediction.game_date
                        )}
                      </td>
                      <td className="min-w-60 px-4 py-4 text-slate-700">
                        {expectedStarters(
                          gamesByPk.get(prediction.mlb_game_pk)
                        )}
                      </td>
                      <td className="min-w-64 px-4 py-4">
                        <p className="font-semibold text-blue-700">
                          {prediction.axscout_lean ?? "--"}
                        </p>
                        {prediction.explanation ? (
                          <details className="mt-2 text-xs leading-5 text-slate-600">
                            <summary className="cursor-pointer font-medium text-slate-700">
                              Why this lean
                            </summary>
                            <p className="mt-1">{prediction.explanation}</p>
                          </details>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
                        {formatProbability(predictedProbability(prediction))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {prediction.confidence ?? "--"}
                      </td>
                      <td className="min-w-52 px-4 py-4 text-slate-700">
                        {marketLine(prediction)}
                        {prediction.market_sportsbook ? (
                          <span className="mt-1 block text-xs text-slate-500">
                            {prediction.market_sportsbook}
                          </span>
                        ) : null}
                      </td>
                      <td className="min-w-56 px-4 py-4 text-slate-700">
                        {prediction.edge_summary ?? "--"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium capitalize text-blue-700">
                        {prediction.prediction_status}
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          v{prediction.model_version}
                        </span>
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
              Predictions are being prepared.
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Check back soon as the rules-based prediction pipeline processes
              the next slate of MLB games.
            </p>
          </div>
        )}
      </section>

      <SectionCard
        title="Prediction Roadmap"
        description="What is active in rules-based v1 and what remains on the model roadmap."
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
                  {item.status}
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
        description="The warehouse-backed context used by the current prediction rules."
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
