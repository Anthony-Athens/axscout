import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import DashboardGrid from "@/components/ui/DashboardGrid";
import SectionCard from "@/components/ui/SectionCard";
import StatCard from "@/components/ui/StatCard";

const capabilities = [
  {
    title: "Team Trends",
    description:
      "Track season performance, rolling 14-game form, weekly offense, pitching, and Statcast indicators.",
  },
  {
    title: "Player Trends",
    description:
      "Explore player-level season snapshots and weekly Statcast trends for hitters and pitchers.",
  },
  {
    title: "Scouting Reports",
    description:
      "Compare two clubs across team form, recent production, pitching quality, and player leaders.",
  },
  {
    title: "Exportable Matchup Reports",
    description:
      "Generate deterministic scouting reports that can be copied as Markdown, HTML, or plain text.",
  },
  {
    title: "Favorite Team Dashboard",
    description:
      "Signed-in users can save teams and personalize their dashboard around the clubs they follow.",
  },
];

const dataSources = [
  "MLB schedule and game-result data",
  "Statcast data through pybaseball",
  "Supabase analytics warehouse tables",
  "Scheduled production data refreshes",
];

const betaFeatures = [
  "Public dashboard with season records and today's games",
  "Team trend pages with weekly offensive and pitching charts",
  "Individual player trend pages powered by player aggregates",
  "Side-by-side scouting report comparisons",
  "Copy-ready scouting report exports",
  "Authenticated favorite team personalization",
];

const comingSoon = [
  "Expected starters",
  "Injury and player status data",
  "Betting lines",
  "Rules-based predictions",
  "Machine learning prediction model",
];

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </article>
  );
}

function PillList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-slate-200 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-center">
          <div>
            <PageHeader
              label="AXScout"
              title="Baseball intelligence for teams, players, and matchups."
              description="AXScout turns MLB game results, Statcast signals, and warehouse aggregates into practical baseball analytics for dashboards, trend analysis, scouting, and exportable matchup reports."
            />

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
              >
                View Dashboard
              </Link>
              <Link
                href="/trends/team"
                className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
              >
                Explore Team Trends
              </Link>
              <Link
                href="/scouting-report"
                className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
              >
                Build Scouting Report
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <StatCard
              label="Platform Focus"
              value="MLB"
              helperText="Team, player, and matchup intelligence"
            />
            <StatCard
              label="Data Refresh"
              value="Daily"
              helperText="Scheduled ETL pipeline"
            />
            <StatCard
              label="Product Stage"
              value="Beta"
              helperText="Core analytics are live"
            />
          </div>
        </div>
      </section>

      <SectionCard
        title="What AXScout Does"
        description="A public baseball analytics workspace for understanding how teams and players are performing right now."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="Team Intelligence"
            description="Compare season records, recent form, run production, pitching trends, and weekly Statcast movement."
          />
          <FeatureCard
            title="Player Intelligence"
            description="Surface player season production and weekly trend lines from hitter and pitcher aggregates."
          />
          <FeatureCard
            title="Matchup Scouting"
            description="Turn team and player data into structured matchup reports with clear advantages and notes."
          />
        </div>
      </SectionCard>

      <section aria-labelledby="capabilities-heading" className="space-y-5">
        <div>
          <h2 id="capabilities-heading" className="text-xl font-semibold text-slate-900">
            Core Capabilities
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            The main workflows available across the AXScout beta.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <FeatureCard key={capability.title} {...capability} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Data Sources"
          description="AXScout is built around repeatable data ingestion and warehouse-backed analytics."
        >
          <PillList items={dataSources} />
        </SectionCard>

        <SectionCard
          title="Current Beta Features"
          description="Useful public and authenticated workflows that are already available."
        >
          <PillList items={betaFeatures} />
        </SectionCard>
      </div>

      <SectionCard
        title="Coming Soon"
        description="Next priorities for deeper pregame context and prediction intelligence."
      >
        <DashboardGrid>
          {comingSoon.map((item) => (
            <StatCard key={item} label="Planned" value={item} />
          ))}
        </DashboardGrid>
      </SectionCard>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Start exploring AXScout.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              Open the public dashboard, inspect team trends, or build a matchup
              scouting report from the current analytics warehouse.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-blue-700"
            >
              View Dashboard
            </Link>
            <Link
              href="/scouting-report"
              className="rounded-lg border border-blue-300 px-5 py-3 text-center font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              Build Scouting Report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
