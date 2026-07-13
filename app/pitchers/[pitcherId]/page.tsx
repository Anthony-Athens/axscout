import Link from "next/link";
import { notFound } from "next/navigation";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import { getPitcherArsenal, getPitcherProfile, getSimilarPitchers } from "@/lib/data/pitchers";

const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const num = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);
export default async function PitcherProfilePage({ params }: { params: Promise<{ pitcherId: string }> }) {
  const { pitcherId } = await params;
  const id = Number(pitcherId);
  if (!Number.isInteger(id)) notFound();
  const [profileResult, arsenalResult, similarResult] = await Promise.all([getPitcherProfile(id), getPitcherArsenal(id), getSimilarPitchers(id)]);
  const profile = profileResult.data;
  if (!profile && !profileResult.error) notFound();
  if (!profile) return <EmptyState title="Pitcher profile data is not available yet" description="Apply the Phase 1A schema and run the pitcher archetype pipeline to populate this page." />;
  return <div className="space-y-8">
    <PageHeader label="Pitcher Profile" title={profile.fullName} description={`${profile.throws ? `Throws ${profile.throws} · ` : ""}${profile.periodStart} through ${profile.periodEnd}`} />
    <div className="grid gap-4 md:grid-cols-4">{[["Primary archetype", profile.archetypeName ?? "Unassigned"], ["Confidence", pct(profile.archetypeProbability)], ["Outlier score", num(profile.outlierScore, 2)], ["Total pitches", profile.totalPitches.toLocaleString()]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-slate-950">{value}</p></div>)}</div>
    <SectionCard title="Arsenal" description="Observed pitch-type aggregates; unavailable Statcast fields remain blank rather than imputed.">{arsenalResult.data.length ? <div className="overflow-x-auto"><table className="min-w-[900px] text-left text-sm"><thead className="border-b border-slate-200 text-slate-600"><tr>{["Pitch", "Usage", "Velocity", "Spin", "Vertical", "Horizontal", "Whiff", "CSW", "xwOBA"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{arsenalResult.data.map((pitch) => <tr key={pitch.pitchType}><td className="px-3 py-3 font-semibold">{pitch.pitchName ?? pitch.pitchType}</td><td className="px-3 py-3">{pct(pitch.usageRate)}</td><td className="px-3 py-3">{num(pitch.avgVelocity)} mph</td><td className="px-3 py-3">{num(pitch.avgSpinRate, 0)} rpm</td><td className="px-3 py-3">{num(pitch.avgIvb)}</td><td className="px-3 py-3">{num(pitch.avgHorizontalBreak)}</td><td className="px-3 py-3">{pct(pitch.whiffRate)}</td><td className="px-3 py-3">{pct(pitch.cswRate)}</td><td className="px-3 py-3">{num(pitch.xwobaAllowed, 3)}</td></tr>)}</tbody></table></div> : <EmptyState title="No arsenal rows available" description="Arsenal data appears after a successful pitcher archetype pipeline run." />}</SectionCard>
    <SectionCard title="Similar pitchers" description="Nearest neighbors from the same season and standardized feature model.">{similarResult.data.length ? <div className="grid gap-4 md:grid-cols-2">{similarResult.data.slice(0, 5).map((similar) => <article key={similar.mlbPlayerId} className="rounded-lg border border-slate-200 p-4"><div className="flex justify-between gap-4"><Link href={`/pitchers/${similar.mlbPlayerId}`} className="font-semibold text-blue-600">{similar.fullName}</Link><span className="text-sm font-semibold">{pct(similar.similarityScore)}</span></div><p className="mt-1 text-xs text-slate-500">{similar.archetypeName ?? "Archetype unavailable"}</p><p className="mt-3 text-sm leading-6 text-slate-600">{similar.explanation}</p></article>)}</div> : <EmptyState title="No similar pitchers available" description="Similarity results appear after at least two eligible pitchers are modeled." />}</SectionCard>
    <p className="text-xs text-slate-500">Model {profile.modelVersion ?? "not assigned"} · refreshed {new Date(profile.refreshedAt).toLocaleString()}</p>
  </div>;
}
