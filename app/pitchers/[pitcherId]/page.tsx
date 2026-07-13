import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import PitcherArsenalCharts from "@/components/charts/PitcherArsenalCharts";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import {
  getPitcherProfile,
  getPitcherProfileVisualizationData,
  getSimilarPitchers,
} from "@/lib/data/pitchers";
import { createPageMetadata } from "@/lib/metadata";

type Props = { params: Promise<{ pitcherId: string }> };
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const num = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pitcherId } = await params;
  const id = Number(pitcherId);
  const profile = Number.isInteger(id) ? (await getPitcherProfile(id)).data : null;
  const name = profile?.fullName ?? "Pitcher Profile";
  return createPageMetadata({
    title: `${name} Pitcher Profile`,
    description: `${name} Statcast arsenal analysis, pitcher archetype, pitch movement, and similar pitcher comparisons on AXScout.`,
    path: `/pitchers/${pitcherId}`,
  });
}

export default async function PitcherProfilePage({ params }: Props) {
  const { pitcherId } = await params;
  const id = Number(pitcherId);
  if (!Number.isInteger(id)) notFound();
  const [profileResult, visualizationResult, similarResult] = await Promise.all([
    getPitcherProfile(id),
    getPitcherProfileVisualizationData(id),
    getSimilarPitchers(id),
  ]);
  const profile = profileResult.data;
  if (!profile && !profileResult.error) notFound();
  if (!profile) return <EmptyState title="Pitcher profile data is not available yet" description="Apply the pitcher archetype schema and run the pipeline to populate this page." />;
  const arsenal = visualizationResult.data.arsenal;
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader label="Pitcher Profile" title={profile.fullName} description={`${profile.throws ? `Throws ${profile.throws} · ` : ""}${profile.periodStart} through ${profile.periodEnd}`} /><nav className="flex gap-2 text-sm font-semibold"><Link href="/pitchers" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">Explorer</Link><Link href="/pitchers/map" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700">Map</Link></nav></div>
    <div className="grid gap-4 md:grid-cols-4">{[["Primary archetype", profile.archetypeName ?? "Unassigned"], ["Confidence", pct(profile.archetypeProbability)], ["Outlier score", num(profile.outlierScore, 2)], ["Total pitches", profile.totalPitches.toLocaleString()]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>)}</div>
    <PitcherArsenalCharts data={visualizationResult.data} />
    <SectionCard title="Velocity and movement arsenal" description="Observed pitch-type aggregates; unavailable Statcast fields remain blank rather than imputed.">
      {arsenal.length ? <div className="-mx-2 overflow-x-auto px-2"><table className="min-w-[920px] text-left text-sm"><thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{["Pitch", "Usage", "Count", "Velocity", "Spin", "Vertical", "Horizontal", "Whiff", "CSW", "xwOBA"].map((heading) => <th key={heading} className="whitespace-nowrap px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{arsenal.map((pitch) => <tr key={pitch.pitchType} className="hover:bg-slate-50"><td className="whitespace-nowrap px-3 py-3 font-semibold">{pitch.pitchName ?? pitch.pitchType}<span className="ml-2 text-xs font-normal text-slate-400">{pitch.pitchType}</span></td><td className="px-3 py-3">{pct(pitch.usageRate)}</td><td className="px-3 py-3">{pitch.pitchCount}</td><td className="whitespace-nowrap px-3 py-3">{num(pitch.avgVelocity)} mph</td><td className="whitespace-nowrap px-3 py-3">{num(pitch.avgSpinRate, 0)} rpm</td><td className="px-3 py-3">{num(pitch.avgIvb)}</td><td className="px-3 py-3">{num(pitch.avgHorizontalBreak)}</td><td className="px-3 py-3">{pct(pitch.whiffRate)}</td><td className="px-3 py-3">{pct(pitch.cswRate)}</td><td className="px-3 py-3">{num(pitch.xwobaAllowed, 3)}</td></tr>)}</tbody></table></div> : <EmptyState title="No arsenal rows available" description="Arsenal data appears after a successful pitcher archetype pipeline run." />}
    </SectionCard>
    <SectionCard title="Similar pitchers" description="The five nearest neighbors from the same season and standardized feature model.">
      {similarResult.data.length ? <ol className="grid gap-4 md:grid-cols-2">{similarResult.data.slice(0, 5).map((similar, index) => <li key={similar.mlbPlayerId} className="rounded-lg border border-slate-200 p-5"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">#{index + 1} similar</p><Link href={`/pitchers/${similar.mlbPlayerId}`} className="mt-1 inline-flex font-semibold text-blue-600 hover:text-blue-700">{similar.fullName}</Link></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">{pct(similar.similarityScore)}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{similar.archetypeName ?? "Archetype unavailable"}</span>{similar.sameArchetype ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">Same archetype</span> : null}</div><p className="mt-3 text-sm leading-6 text-slate-600">{similar.explanation ?? "Similarity is based on the standardized pitcher feature matrix."}</p></li>)}</ol> : <EmptyState title="No similar pitchers available" description="Similarity results appear after at least two eligible pitchers are modeled." />}
    </SectionCard>
    <p className="text-xs text-slate-500">Model {profile.modelVersion ?? "not assigned"} · features {profile.featureVersion} · refreshed {new Date(profile.refreshedAt).toLocaleString()}</p>
  </div>;
}
