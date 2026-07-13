import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { getPitcherArchetype, listPitchers } from "@/lib/data/pitchers";

const featureName = (value: string) => value.replace(/^missingindicator_/, "Missing: ").replaceAll("_", " ");
export default async function PitcherArchetypePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [archetypeResult, pitchersResult] = await Promise.all([getPitcherArchetype(slug), listPitchers()]);
  const archetype = archetypeResult.data;
  if (!archetype && !archetypeResult.error) notFound();
  if (!archetype) return <EmptyState title="Archetype data is not available yet" description="Apply the Phase 1A schema and run the pitcher archetype pipeline." />;
  const pitchers = pitchersResult.data.filter((pitcher) => pitcher.archetypeId === archetype.archetypeId);
  return <div className="space-y-8">
    <PageHeader label={`${archetype.season} · ${archetype.modelVersion}`} title={archetype.name} description={archetype.shortDescription ?? "A baseline data-driven pitcher cluster."} />
    <div className="grid gap-4 md:grid-cols-3"><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Pitchers</p><p className="mt-1 text-2xl font-bold">{archetype.pitcherCount}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Representative</p><p className="mt-1 text-xl font-bold">{archetype.representativeName ?? "Unavailable"}</p></div><div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">Model silhouette</p><p className="mt-1 text-xl font-bold">{archetype.silhouetteScore?.toFixed(3) ?? "—"}</p></div></div>
    <SectionCard title="Defining features" description="Cluster-center values are standardized model values, not raw baseball units."><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-slate-600"><tr><th className="px-3 py-3">Feature</th><th className="px-3 py-3">Cluster mean</th><th className="px-3 py-3">Cluster std. dev.</th><th className="px-3 py-3">League percentile</th></tr></thead><tbody className="divide-y divide-slate-100">{archetype.features.map((feature) => <tr key={feature.name}><td className="px-3 py-3 font-medium capitalize">{featureName(feature.name)}</td><td className="px-3 py-3">{feature.mean?.toFixed(2) ?? "—"}</td><td className="px-3 py-3">{feature.stddev?.toFixed(2) ?? "—"}</td><td className="px-3 py-3">{feature.leaguePercentile === null ? "—" : `${(feature.leaguePercentile * 100).toFixed(0)}%`}</td></tr>)}</tbody></table></div></SectionCard>
    <SectionCard title="Pitchers in this archetype">{pitchers.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{pitchers.map((pitcher) => <Link key={`${pitcher.mlbPlayerId}-${pitcher.periodEnd}`} href={`/pitchers/${pitcher.mlbPlayerId}`} className="rounded-lg border border-slate-200 p-4 font-semibold text-blue-600 hover:border-blue-300">{pitcher.fullName}<span className="mt-1 block text-xs font-normal text-slate-500">{pitcher.totalPitches} pitches · {(pitcher.archetypeProbability ?? 0).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 1 })} confidence</span></Link>)}</div> : <EmptyState title="No memberships available" description="Membership rows appear after the model pipeline completes." />}</SectionCard>
  </div>;
}
