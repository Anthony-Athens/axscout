import Link from "next/link";

import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { getPitcherArchetypeRefreshStatus, listPitcherArchetypes, listPitchers } from "@/lib/data/pitchers";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({ title: "Pitcher Explorer | Baseball Intelligence Platform", description: "Explore Statcast pitcher arsenals, pitcher archetypes, and pitcher similarity analysis with AXScout.", path: "/pitchers" });
type Search = { q?: string; season?: string; archetype?: string; throws?: string; minPitches?: string; sort?: string };
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const num = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);

export default async function PitchersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = await searchParams;
  const [pitcherResult, archetypeResult, refreshResult] = await Promise.all([listPitchers(), listPitcherArchetypes(), getPitcherArchetypeRefreshStatus()]);
  const seasons = [...new Set(pitcherResult.data.map((row) => row.season))].sort((a, b) => b - a);
  const minimum = Number(filters.minPitches ?? 0) || 0;
  let pitchers = pitcherResult.data.filter((row) =>
    (!filters.q || row.fullName.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!filters.season || row.season === Number(filters.season)) &&
    (!filters.archetype || row.archetypeId === filters.archetype) &&
    (!filters.throws || row.throws === filters.throws) && row.totalPitches >= minimum
  );
  const sort = filters.sort ?? "name";
  pitchers = [...pitchers].sort((a, b) => sort === "velocity" ? (b.fastballVelocity ?? -1) - (a.fastballVelocity ?? -1) : sort === "whiff" ? (b.overallWhiffRate ?? -1) - (a.overallWhiffRate ?? -1) : sort === "confidence" ? (b.archetypeProbability ?? -1) - (a.archetypeProbability ?? -1) : sort === "outlier" ? (b.outlierScore ?? -1) - (a.outlierScore ?? -1) : a.fullName.localeCompare(b.fullName));
  const unavailable = pitcherResult.error !== null;
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <PageHeader label="Pitcher Intelligence" title="Pitcher Explorer" description="Compare aggregated arsenals and baseline data-driven pitcher archetypes." />
      <nav className="flex flex-wrap gap-2"><Link href="/pitchers/archetypes" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">View archetypes</Link><Link href="/pitchers/map" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700">Open Pitcher Map</Link></nav>
    </div>
    <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3 xl:grid-cols-6">
      <input name="q" defaultValue={filters.q} placeholder="Search pitcher" aria-label="Search pitcher" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <select name="season" defaultValue={filters.season ?? ""} aria-label="Season" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All seasons</option>{seasons.map((season) => <option key={season}>{season}</option>)}</select>
      <select name="archetype" defaultValue={filters.archetype ?? ""} aria-label="Archetype" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All archetypes</option>{archetypeResult.data.map((item) => <option key={item.archetypeId} value={item.archetypeId}>{item.name}</option>)}</select>
      <select name="throws" defaultValue={filters.throws ?? ""} aria-label="Throws" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All hands</option><option value="R">Right</option><option value="L">Left</option></select>
      <input name="minPitches" type="number" min="0" defaultValue={filters.minPitches ?? "300"} aria-label="Minimum pitches" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <select name="sort" defaultValue={sort} aria-label="Sort pitchers" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="name">Name</option><option value="velocity">Fastball velocity</option><option value="whiff">Whiff rate</option><option value="confidence">Archetype confidence</option><option value="outlier">Outlier score</option></select>
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white md:col-span-3 xl:col-span-1">Apply filters</button>
    </form>
    <p className="text-sm text-slate-500">{refreshResult.data ? `Last refreshed ${new Date(refreshResult.data.finishedAt).toLocaleString()} · ${refreshResult.data.recordsLoaded} output rows` : "No completed pitcher archetype refresh is recorded yet."}</p>
    {pitchers.length ? <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm"><table className="min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["Pitcher", "Throws", "Archetype", "Primary pitch", "Fastball", "Whiff", "xwOBA", "Confidence", ""].map((heading) => <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{pitchers.map((pitcher) => <tr key={`${pitcher.mlbPlayerId}-${pitcher.season}-${pitcher.periodEnd}`}><td className="px-4 py-3 font-semibold text-slate-950">{pitcher.fullName}<span className="block text-xs font-normal text-slate-500">{pitcher.season} · {pitcher.totalPitches} pitches</span></td><td className="px-4 py-3">{pitcher.throws ?? "—"}</td><td className="px-4 py-3">{pitcher.archetypeName ?? "Unassigned"}</td><td className="px-4 py-3">{pitcher.primaryPitchType ?? "—"}</td><td className="px-4 py-3">{num(pitcher.fastballVelocity)} mph</td><td className="px-4 py-3">{pct(pitcher.overallWhiffRate)}</td><td className="px-4 py-3">{num(pitcher.overallXwobaAllowed, 3)}</td><td className="px-4 py-3">{pct(pitcher.archetypeProbability)}</td><td className="px-4 py-3"><Link href={`/pitchers/${pitcher.mlbPlayerId}`} className="font-semibold text-blue-600 hover:text-blue-700">Profile</Link></td></tr>)}</tbody></table></div> : <EmptyState title={unavailable ? "Pitcher archetype tables are not available yet" : "No pitcher profiles match these filters"} description={unavailable ? "Apply the Phase 1A schema, then run the pitcher archetype pipeline. No production data has been fabricated." : "Adjust the filters, or run the pitcher archetype pipeline to populate profiles."} />}
  </div>;
}
