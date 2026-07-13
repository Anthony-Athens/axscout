import Link from "next/link";

import PitcherMapChart from "@/components/charts/PitcherMapChart";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { getPitcherMapFilters, getPitcherMapPoints } from "@/lib/data/pitchers";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({ title: "Pitcher Similarity Map", description: "Explore MLB pitcher similarity space using Statcast arsenal analysis and AXScout pitcher archetypes.", path: "/pitchers/map" });
type Search = { q?: string; season?: string; archetype?: string; role?: string };

export default async function PitcherMapPage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = await searchParams;
  const result = await getPitcherMapPoints();
  const options = getPitcherMapFilters(result.data);
  const selectedSeason = filters.season ?? options.seasons[0]?.toString();
  const points = result.data.filter((point) =>
    (!filters.q || point.fullName.toLowerCase().includes(filters.q.toLowerCase())) &&
    (!selectedSeason || point.season === Number(selectedSeason)) &&
    (!filters.archetype || point.archetypeId === filters.archetype) &&
    (!filters.role || point.starterShare === null || (filters.role === "starter" ? point.starterShare >= 0.5 : point.starterShare < 0.5))
  );
  return <div className="space-y-8">
    <div className="flex flex-wrap items-start justify-between gap-4"><PageHeader label="Pitcher Intelligence" title="Pitcher Map" description="Explore pitchers in a two-dimensional model similarity space." /><nav className="flex gap-2 text-sm font-semibold"><Link href="/pitchers" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:border-blue-300">Explorer</Link><Link href="/pitchers/archetypes" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 hover:border-blue-300">Archetypes</Link></nav></div>
    <aside className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-slate-700">Nearby pitchers have more similar arsenal and pitch-profile characteristics. The X and Y axes represent model similarity space and should not be interpreted as direct baseball metrics.</aside>
    <form className={`grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${options.hasRoleData ? "md:grid-cols-5" : "md:grid-cols-4"}`}>
      <input name="q" defaultValue={filters.q} placeholder="Search pitcher" aria-label="Search pitcher" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <select name="season" defaultValue={selectedSeason ?? ""} aria-label="Season" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">{options.seasons.length ? null : <option value="">No seasons</option>}{options.seasons.map((season) => <option key={season} value={season}>{season}</option>)}</select>
      <select name="archetype" defaultValue={filters.archetype ?? ""} aria-label="Archetype" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All archetypes</option>{options.archetypes.map((archetype) => <option key={archetype.id} value={archetype.id}>{archetype.name}</option>)}</select>
      {options.hasRoleData ? <select name="role" defaultValue={filters.role ?? ""} aria-label="Pitcher role" className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All roles</option><option value="starter">Starter leaning</option><option value="reliever">Reliever leaning</option></select> : null}
      <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
    </form>
    {points.length ? <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">Similarity space</h2><p className="mt-1 text-sm text-slate-500">{points.length} pitchers with stored map coordinates</p></div><p className="text-xs text-slate-500">Hover for details · click a point for its profile</p></div><PitcherMapChart points={points} /></section> : <EmptyState title={result.data.length ? "No pitchers match these map filters" : "Pitcher Map coordinates are not available yet"} description={result.data.length ? "Adjust the season, archetype, role, or search filters." : "The map will appear after pitcher_profiles contains non-null map_x and map_y values. No coordinates are inferred in the browser."} />}
    {result.error ? <p className="text-sm text-rose-700">Pitcher Map data could not be loaded: {result.error}</p> : null}
  </div>;
}
