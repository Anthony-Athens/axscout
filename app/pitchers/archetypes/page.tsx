import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { listPitcherArchetypes } from "@/lib/data/pitchers";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({ title: "Pitcher Archetypes", description: "Browse AXScout's baseline data-driven MLB pitcher arsenal clusters.", path: "/pitchers/archetypes" });
const featureName = (value: string) => value.replace(/^missingindicator_/, "Missing: ").replaceAll("_", " ");
export default async function PitcherArchetypesPage() {
  const result = await listPitcherArchetypes();
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader label="Pitcher Intelligence" title="Pitcher Archetypes" description="Baseline K-Means clusters built from standardized arsenal, movement, velocity, and outcome features." /><Link href="/pitchers" className="font-semibold text-blue-600 hover:text-blue-700">Back to explorer</Link></div>
    {result.data.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{result.data.map((item) => <article key={item.archetypeId} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><h2 className="text-xl font-bold text-slate-950">{item.name}</h2><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{item.pitcherCount} pitchers</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{item.shortDescription}</p><p className="mt-4 text-sm text-slate-500">Representative: <span className="font-medium text-slate-700">{item.representativeName ?? "Unavailable"}</span></p><div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Defining standardized features</p><ul className="mt-2 space-y-1 text-sm text-slate-700">{item.features.slice(0, 3).map((feature) => <li key={feature.name} className="capitalize">{featureName(feature.name)}</li>)}</ul></div><Link href={`/pitchers/archetypes/${item.slug}`} className="mt-5 inline-flex font-semibold text-blue-600 hover:text-blue-700">View archetype</Link></article>)}</div> : <EmptyState title={result.error ? "Pitcher archetype tables are not available yet" : "No pitcher archetypes have been generated"} description="Apply the Phase 1A schema and run the pitcher archetype pipeline. Archetypes will appear here without demo or fabricated production data." />}
  </div>;
}
