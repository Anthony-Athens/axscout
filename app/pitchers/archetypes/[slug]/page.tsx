import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { getPitcherArchetype, listPitchers } from "@/lib/data/pitchers";
import {
  getBattersVsArchetype,
  getTeamVsArchetype,
  type MatchupSort,
} from "@/lib/data/archetype-matchups";
import { createPageMetadata } from "@/lib/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ teamSort?: string; batterSort?: string }>;
};
const featureName = (value: string) => value.replace(/^missingindicator_/, "Missing: ").replaceAll("_", " ");
const reviewedDescription = (value: string | null) => value && !value.startsWith("A data-driven arsenal cluster") ? value : "Description pending review.";
const matchupSort = (value: string | undefined): MatchupSort =>
  value === "worst_ops" || value === "highest_xwoba" || value === "lowest_strikeout"
    ? value
    : "best_ops";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const archetype = (await getPitcherArchetype(slug)).data;
  const name = archetype?.name ?? "Pitcher Archetype";
  return createPageMetadata({ title: `${name} Pitcher Archetype`, description: `${name} cluster features, representative pitchers, and Statcast arsenal similarity analysis on AXScout.`, path: `/pitchers/archetypes/${slug}` });
}

export default async function PitcherArchetypePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const filters = searchParams ? await searchParams : {};
  const archetypeResult = await getPitcherArchetype(slug);
  const archetype = archetypeResult.data;
  if (!archetype && !archetypeResult.error) notFound();
  if (!archetype) return <EmptyState title="Archetype data is not available yet" description="Apply the pitcher archetype schema and run the pipeline." />;
  const teamSort = matchupSort(filters.teamSort);
  const batterSort = matchupSort(filters.batterSort);
  const [pitchersResult, teamMatchups, batterMatchups] = await Promise.all([
    listPitchers(),
    getTeamVsArchetype(archetype.archetypeId, teamSort),
    getBattersVsArchetype(archetype.archetypeId, batterSort),
  ]);
  const pitchers = pitchersResult.data.filter((pitcher) => pitcher.archetypeId === archetype.archetypeId);
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader label={`${archetype.season} · ${archetype.modelVersion}`} title={archetype.name} description={reviewedDescription(archetype.shortDescription)} /><nav className="flex gap-2 text-sm font-semibold"><Link href="/pitchers/archetypes" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">All archetypes</Link><Link href="/pitchers/map" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">Map</Link></nav></div>
    <aside className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-slate-700">This archetype name is a model-generated placeholder unless manually reviewed. Cluster membership describes similarity in the current feature space, not a permanent scouting label.</aside>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[["Pitchers", archetype.pitcherCount.toString()], ["Representative", archetype.representativeName ?? "Unavailable"], ["Silhouette", archetype.silhouetteScore?.toFixed(3) ?? "—"], ["Model", archetype.modelVersion], ["Features", archetype.featureVersion]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-bold text-slate-950">{value}</p></div>)}</div>
    <SectionCard title="Defining features" description="Cluster-center values are standardized model values, not raw baseball units."><div className="overflow-x-auto"><table className="min-w-[680px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">Feature</th><th className="px-3 py-3">Importance</th><th className="px-3 py-3">Cluster mean</th><th className="px-3 py-3">Cluster std. dev.</th><th className="px-3 py-3">League percentile</th></tr></thead><tbody className="divide-y divide-slate-100">{archetype.features.map((feature) => <tr key={feature.name}><td className="px-3 py-3 font-medium capitalize">{featureName(feature.name)}</td><td className="px-3 py-3">{feature.importanceRank ?? "—"}</td><td className="px-3 py-3">{feature.mean?.toFixed(2) ?? "—"}</td><td className="px-3 py-3">{feature.stddev?.toFixed(2) ?? "—"}</td><td className="px-3 py-3">{feature.leaguePercentile === null ? "—" : `${(feature.leaguePercentile * 100).toFixed(0)}%`}</td></tr>)}</tbody></table></div></SectionCard>
    <SectionCard title="Pitchers in this archetype" description="Membership confidence is a distance-based model proxy, not a scouting certainty.">{pitchers.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pitchers.map((pitcher) => <Link key={`${pitcher.mlbPlayerId}-${pitcher.periodEnd}`} href={`/pitchers/${pitcher.mlbPlayerId}`} className="rounded-lg border border-slate-200 p-4 font-semibold text-blue-600 hover:border-blue-300">{pitcher.fullName}<span className="mt-1 block text-xs font-normal text-slate-500">{pitcher.totalPitches} pitches · {pitcher.archetypeProbability === null ? "confidence unavailable" : `${(pitcher.archetypeProbability * 100).toFixed(1)}% confidence`}</span></Link>)}</div> : <EmptyState title="No memberships available" description="Membership rows appear after the model pipeline completes." />}</SectionCard>
    <div id="matchup-intelligence"><ArchetypeMatchupTables teams={teamMatchups.data} batters={batterMatchups.data} teamSort={teamSort} batterSort={batterSort} /></div>
  </div>;
}
import ArchetypeMatchupTables from "@/components/ArchetypeMatchupTables";
