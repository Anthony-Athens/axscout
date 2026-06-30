import type { Metadata } from "next";

import PageHeader from "@/components/layout/PageHeader";
import SectionCard from "@/components/ui/SectionCard";

export const metadata: Metadata = {
  title: "Predictions",
  description:
    "MLB game predictions, model-driven forecasts, matchup signals, and market-aware baseball intelligence from AXScout.",
  alternates: { canonical: "/predictions" },
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
  "Market lines when available",
];

const predictionColumns = [
  "Game",
  "Date",
  "Expected Starters",
  "AXScout Lean",
  "Win Probability",
  "Market Line",
  "Confidence",
  "Status",
];

export default function PredictionsPage() {
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

      <section aria-labelledby="upcoming-predictions-heading">
        <div className="mb-5">
          <h2
            id="upcoming-predictions-heading"
            className="text-xl font-semibold text-slate-900"
          >
            Upcoming Game Predictions
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Future model output will appear here with its supporting context.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] border-collapse text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  {predictionColumns.map((column) => (
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
              <tbody>
                <tr>
                  <td
                    colSpan={predictionColumns.length}
                    className="px-6 py-12 text-center"
                  >
                    <p className="font-semibold text-slate-900">
                      Predictions are being prepared.
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      Check back soon as the model pipeline comes online.
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
