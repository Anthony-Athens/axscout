import UpgradeCta from "@/components/access/UpgradeCta";
import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";
import { getCurrentUserAccess } from "@/lib/access/entitlements";
import { createPageMetadata } from "@/lib/metadata";
import { createClient } from "@/lib/supabase/server";

export const metadata = createPageMetadata({
  title: "Predictions",
  description:
    "View experimental MLB game predictions, market lines, expected starters, injury context, confidence levels, and model performance tracking.",
  path: "/predictions",
});

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
  home_starter_archetype_name: string | null;
  away_starter_archetype_name: string | null;
  home_offense_matchup_ops: NumericValue;
  home_offense_matchup_xwoba: NumericValue;
  home_offense_matchup_sample_quality: "low" | "medium" | "high" | null;
  away_offense_matchup_ops: NumericValue;
  away_offense_matchup_xwoba: NumericValue;
  away_offense_matchup_sample_quality: "low" | "medium" | "high" | null;
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

type PredictionResultRow = {
  mlb_game_pk: number;
  game_date: string;
  home_team: string;
  away_team: string;
  actual_winner: string | null;
  predicted_winner: string | null;
  prediction_correct: boolean | null;
  confidence: "Low" | "Medium" | "High" | null;
  model_name: string;
  model_version: string;
  scored_at: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

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
      "Completed forecasts are scored by model version with confidence-level accuracy.",
    status: "Tracking live",
  },
  {
    title: "Pitcher Archetype Matchups",
    description:
      "Team results against starter archetypes provide a small, sample-aware adjustment when available.",
    status: "Rules v1 live",
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
  "Team offense by pitcher archetype",
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

function formatDecimal(value: NumericValue, digits = 3) {
  const number = asNumber(value);
  return number === null ? "--" : number.toFixed(digits).replace(/^0/, "");
}

function matchupSummary(prediction: PredictionRow) {
  const matchups = [
    {
      team: prediction.away_team,
      archetype: prediction.home_starter_archetype_name,
      ops: prediction.away_offense_matchup_ops,
      xwoba: prediction.away_offense_matchup_xwoba,
      quality: prediction.away_offense_matchup_sample_quality,
    },
    {
      team: prediction.home_team,
      archetype: prediction.away_starter_archetype_name,
      ops: prediction.home_offense_matchup_ops,
      xwoba: prediction.home_offense_matchup_xwoba,
      quality: prediction.home_offense_matchup_sample_quality,
    },
  ];

  if (matchups.every((matchup) => !matchup.archetype)) {
    return <p className="text-slate-500">Context unavailable</p>;
  }

  return (
    <div className="space-y-2">
      {matchups.map((matchup) => (
        <div key={matchup.team}>
          <p className="font-medium text-slate-800">
            {matchup.team} vs {matchup.archetype ?? "unclassified starter"}
          </p>
          <p className="text-xs text-slate-500">
            OPS {formatDecimal(matchup.ops)} · xwOBA{" "}
            {formatDecimal(matchup.xwoba)} · {matchup.quality ?? "no"} sample
          </p>
        </div>
      ))}
      <p className="text-xs leading-4 text-slate-500">
        Descriptive aggregate; low samples are neutral.
      </p>
    </div>
  );
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

const confidenceRank = { High: 3, Medium: 2, Low: 1 } as const;

function formatAccuracy(rows: PredictionResultRow[]) {
  if (!rows.length) {
    return "--";
  }
  const correct = rows.filter((row) => row.prediction_correct).length;
  return `${Math.round((correct / rows.length) * 100)}%`;
}

function formatGameDate(value: string | undefined) {
  if (!value) {
    return "--";
  }
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
      }).format(date);
}

async function getPredictionResults(supabase: Supabase) {
  const rows: PredictionResultRow[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("prediction_results")
      .select(
        "mlb_game_pk, game_date, home_team, away_team, actual_winner, predicted_winner, prediction_correct, confidence, model_name, model_version, scored_at"
      )
      .order("scored_at", { ascending: false })
      .order("mlb_game_pk", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error || !data) {
      return rows;
    }
    rows.push(...(data as PredictionResultRow[]));
    if (data.length < pageSize) {
      return rows;
    }
    offset += pageSize;
  }
}

export default async function PredictionsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [{ data: predictionData }, predictionResults, access] = await Promise.all([
    supabase
      .from("game_predictions")
      .select(
        "mlb_game_pk, game_date, home_team, away_team, predicted_winner, home_win_probability, away_win_probability, confidence, axscout_lean, market_sportsbook, market_home_moneyline, market_away_moneyline, edge_summary, explanation, home_starter_archetype_name, away_starter_archetype_name, home_offense_matchup_ops, home_offense_matchup_xwoba, home_offense_matchup_sample_quality, away_offense_matchup_ops, away_offense_matchup_xwoba, away_offense_matchup_sample_quality, model_version, prediction_status"
      )
      .gte("game_date", today)
      .eq("model_name", "rules_based_v1")
      .eq("model_version", "0.2.0")
      .order("game_date")
      .order("mlb_game_pk")
      .limit(100),
    getPredictionResults(supabase),
    getCurrentUserAccess(),
  ]);

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
  const highConfidenceResults = predictionResults.filter(
    (result) => result.confidence === "High"
  );
  const rulesV1Results = predictionResults.filter(
    (result) => result.model_name === "rules_based_v1"
  );
  const confidenceGroups = (["Low", "Medium", "High"] as const).map(
    (confidence) => {
      const rows = predictionResults.filter(
        (result) => result.confidence === confidence
      );
      return { confidence, rows };
    }
  );
  const recentResults = predictionResults.slice(0, 10);
  const featuredPrediction = predictions.reduce<PredictionRow | undefined>(
    (featured, prediction) => {
      if (!featured) return prediction;
      const featuredRank = featured.confidence ? confidenceRank[featured.confidence] : 0;
      const predictionRank = prediction.confidence ? confidenceRank[prediction.confidence] : 0;
      return predictionRank > featuredRank ? prediction : featured;
    },
    undefined
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

      <section aria-labelledby="performance-summary-heading">
        <div className="mb-5">
          <h2 id="performance-summary-heading" className="text-xl font-semibold text-slate-900">
            Prediction Performance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Model tracking is still early. Accuracy metrics become more meaningful as more games are scored.
          </p>
        </div>
        <DashboardGrid>
          <StatCard label="Predictions Scored" value={predictionResults.length} helperText="All tracked model versions" />
          <StatCard label="Overall Accuracy" value={formatAccuracy(predictionResults)} helperText={`Rules v1: ${formatAccuracy(rulesV1Results)}`} />
          <StatCard label="High Confidence Accuracy" value={formatAccuracy(highConfidenceResults)} helperText={`${highConfidenceResults.length} scored games`} />
          <StatCard label="Last Scored Game" value={predictionResults.length ? formatGameDate(predictionResults[0]?.game_date) : "--"} helperText="Latest completed prediction" />
        </DashboardGrid>
      </section>

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
              <table className="min-w-[1750px] border-collapse text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    {[
                      "Game",
                      "Date / Time",
                      "Expected Starters",
                      "Archetype Matchup",
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
                  {predictions.map((prediction) => {
                    const isLocked = !access.features.predictionsFull && prediction.mlb_game_pk !== featuredPrediction?.mlb_game_pk;
                    return (
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
                      <td className="min-w-72 px-4 py-4 text-slate-700">
                        {isLocked ? <span className="font-medium text-slate-400">Premium</span> : matchupSummary(prediction)}
                      </td>
                      <td className="min-w-64 px-4 py-4">
                        {isLocked ? <p className="font-semibold text-blue-700">Unlock all predictions with AXScout Premium.</p> : <><p className="font-semibold text-blue-700">
                          {prediction.axscout_lean ?? "--"}
                        </p>
                        {prediction.explanation ? (
                          <details className="mt-2 text-xs leading-5 text-slate-600">
                            <summary className="cursor-pointer font-medium text-slate-700">
                              Why this lean
                            </summary>
                            <p className="mt-1">{prediction.explanation}</p>
                          </details>
                        ) : null}</>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-950">
                        {isLocked ? "Locked" : formatProbability(predictedProbability(prediction))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {isLocked ? "Locked" : prediction.confidence ?? "--"}
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
                        {isLocked ? "Unlock this with AXScout Premium." : prediction.edge_summary ?? "--"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium capitalize text-blue-700">
                        {prediction.prediction_status}
                        <span className="mt-1 block text-xs font-normal text-slate-500">
                          v{prediction.model_version}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!access.features.predictionsFull && predictions.length > 1 ? (
              <div className="border-t border-blue-200 bg-blue-50 p-5">
                <p className="font-semibold text-slate-950">Unlock this with AXScout Premium.</p>
                <UpgradeCta className="mt-2" />
              </div>
            ) : null}
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

      <section aria-labelledby="performance-heading">
        <div className="mb-5">
          <h2
            id="performance-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Prediction Performance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Completed games scored against the forecast stored for each model
            version.
          </p>
        </div>

        {predictionResults.length ? (
          <div className="space-y-5">
            <SectionCard
              title="Accuracy by Confidence"
              description="Performance grouped by the confidence assigned before the game."
            >
              <div className="grid gap-4 sm:grid-cols-3">
                {confidenceGroups.map(({ confidence, rows }) => (
                  <div
                    key={confidence}
                    className="border-b border-slate-200 py-3 sm:border-b-0 sm:border-r sm:pr-4 last:border-0"
                  >
                    <p className="text-sm font-medium text-slate-500">
                      {confidence}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatAccuracy(rows)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {rows.length} scored games
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-900">
                  Recent Prediction Results
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[850px] border-collapse text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      {[
                        "Date",
                        "Game",
                        "Predicted Winner",
                        "Actual Winner",
                        "Result",
                        "Confidence",
                        "Model",
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
                    {recentResults.map((result) => (
                      <tr
                        key={`${result.mlb_game_pk}-${result.model_name}-${result.model_version}`}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatGameDate(result.game_date)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-950">
                          {result.away_team} at {result.home_team}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {result.predicted_winner ?? "--"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {result.actual_winner ?? "--"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              result.prediction_correct
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                            }`}
                          >
                            {result.prediction_correct
                              ? "Correct"
                              : "Incorrect"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {result.confidence ?? "--"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {result.model_name} v{result.model_version}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <h3 className="font-semibold text-slate-900">
              Prediction tracking will populate after games with
              AXScout-generated predictions are completed.
            </h3>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Completed historical games are intentionally not scored unless a
              prediction existed before first pitch, to avoid look-ahead bias.
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
