import Link from "next/link";

import MatchupControls from "@/components/MatchupControls";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import SectionCard from "@/components/ui/SectionCard";
import {
  getPitcherMatchupContext,
  getMatchupPitcherTeams,
  listMatchupPitchers,
  listMatchupTeams,
  type MatchupBatterPerformance,
} from "@/lib/data/matchups";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata({
  title: "Matchups",
  description: "Analyze how MLB teams and hitters perform against pitcher archetypes using AXScout’s Statcast-powered matchup intelligence.",
  path: "/matchups",
});

type Search = { pitcherTeam?: string | string[]; pitcherId?: string | string[]; team?: string | string[]; season?: string | string[] };

const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;
const num = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);
const sampleClass = { low: "bg-amber-50 text-amber-700", medium: "bg-blue-50 text-blue-700", high: "bg-emerald-50 text-emerald-700" };
const normalizePitcherName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized.includes(",")) return normalized;
  const [last, given] = normalized.split(",").map((part) => part.trim());
  return `${given} ${last}`.trim();
};

function bestBy(rows: MatchupBatterPerformance[], value: (row: MatchupBatterPerformance) => number | null, direction: "highest" | "lowest" = "highest") {
  return rows.filter((row) => value(row) !== null).sort((a, b) => {
    const aValue = value(a) ?? 0;
    const bValue = value(b) ?? 0;
    return direction === "highest" ? bValue - aValue : aValue - bValue;
  })[0];
}

export default async function MatchupsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const query = await searchParams;
  const [pitcherResult, teamResult] = await Promise.all([listMatchupPitchers(), listMatchupTeams()]);
  const commonSeasons = [...new Set(pitcherResult.data.map((pitcher) => pitcher.season).filter((season) => teamResult.data.some((team) => team.season === season)))].sort((a, b) => b - a);
  const requestedSeason = Number(first(query.season));
  const selectedSeason = commonSeasons.includes(requestedSeason) ? requestedSeason : commonSeasons[0];
  const pitchers = pitcherResult.data.filter((pitcher) => pitcher.season === selectedSeason);
  const teams = teamResult.data.filter((team) => team.season === selectedSeason);
  const pitcherTeams = getMatchupPitcherTeams(pitchers);
  const requestedPitcherTeam = first(query.pitcherTeam)?.trim().toUpperCase();
  const selectedPitcherTeam = pitcherTeams.find((team) => team.teamAbbreviation === requestedPitcherTeam)
    ?? pitcherTeams.find((team) => team.teamAbbreviation === "PIT")
    ?? pitcherTeams[0];
  const teamPitchers = selectedPitcherTeam ? pitchers.filter((pitcher) => pitcher.teamAbbreviation === selectedPitcherTeam.teamAbbreviation) : pitchers;
  const requestedPitcherId = Number(first(query.pitcherId));
  const selectedPitcher = teamPitchers.find((pitcher) => pitcher.mlbPlayerId === requestedPitcherId)
    ?? [...teamPitchers].sort((a, b) => b.totalPitches - a.totalPitches).find((pitcher) => normalizePitcherName(pitcher.playerName) === "paul skenes")
    ?? teamPitchers[0]
    ?? pitchers[0];
  const requestedTeam = first(query.team)?.trim().toUpperCase();
  const selectedTeam = teams.find((team) => team.teamAbbreviation === requestedTeam)
    ?? teams.find((team) => team.teamAbbreviation === "CHC" || team.teamName.toLowerCase() === "chicago cubs")
    ?? teams[0];
  const contextResult = selectedPitcher && selectedTeam && selectedSeason
    ? await getPitcherMatchupContext(selectedPitcher.mlbPlayerId, selectedTeam.teamAbbreviation, selectedSeason)
    : null;
  const context = contextResult?.data;
  const loadError = pitcherResult.error ?? teamResult.error ?? contextResult?.error;

  const bestOps = context ? bestBy(context.batters, (row) => row.ops) : undefined;
  const highestXwoba = context ? bestBy(context.batters, (row) => row.xwoba) : undefined;
  const lowestStrikeout = context ? bestBy(context.batters, (row) => row.strikeoutRate, "lowest") : undefined;
  const mostPa = context ? bestBy(context.batters, (row) => row.plateAppearances) : undefined;
  const signals = [
    bestOps ? { label: "Best OPS Matchup", value: `${bestOps.fullName} — ${num(bestOps.ops, 3)} OPS over ${bestOps.plateAppearances} PA` } : null,
    highestXwoba ? { label: "Highest xwOBA", value: `${highestXwoba.fullName} — ${num(highestXwoba.xwoba, 3)} xwOBA over ${highestXwoba.plateAppearances} PA` } : null,
    lowestStrikeout ? { label: "Lowest K Rate", value: `${lowestStrikeout.fullName} — ${pct(lowestStrikeout.strikeoutRate)} over ${lowestStrikeout.plateAppearances} PA` } : null,
    mostPa ? { label: "Most PA", value: `${mostPa.fullName} — ${mostPa.plateAppearances} PA` } : null,
  ].filter((signal): signal is { label: string; value: string } => signal !== null);

  return <div className="space-y-8">
    <PageHeader label="Matchups" title="Archetype Matchups" description="Evaluate how an opposing lineup has performed against pitchers with similar arsenal and pitch-profile characteristics." />

    <aside className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-slate-700">This view summarizes performance against pitchers in the selected pitcher’s archetype. It does not guarantee performance against the individual pitcher.</aside>

    {pitchers.length && teams.length && selectedPitcher && selectedTeam && selectedSeason ? <MatchupControls key={`${selectedSeason}-${selectedPitcherTeam?.teamAbbreviation ?? "all"}-${selectedPitcher.mlbPlayerId}-${selectedTeam.teamAbbreviation}`} pitchers={pitcherResult.data} opponentTeams={teamResult.data} seasons={commonSeasons} initialPitcherTeam={selectedPitcherTeam?.teamAbbreviation ?? ""} initialPitcherId={selectedPitcher.mlbPlayerId} initialOpponentTeam={selectedTeam.teamAbbreviation} initialSeason={selectedSeason} /> : <EmptyState title="Archetype matchup data is not available yet" description="Run the archetype matchup pipeline to populate this view." />}

    {context?.pitcher ? <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div className="space-y-6">
        <SectionCard title="Pitcher Context" description={`${context.pitcher.playerName}’s latest eligible ${selectedSeason} archetype profile.`}>
          <div className="flex items-start justify-between gap-4"><div><p className="text-2xl font-bold text-slate-950">{context.pitcher.playerName}</p><p className="mt-1 text-sm text-slate-500">{context.pitcher.throws ? `Throws ${context.pitcher.throws}` : "Throwing hand unavailable"}</p></div>{context.pitcher.primaryArchetypeSlug ? <Link href={`/pitchers/archetypes/${context.pitcher.primaryArchetypeSlug}`} className="text-sm font-semibold text-blue-600 hover:text-blue-700">View archetype</Link> : null}</div>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {[["Primary Archetype", context.pitcher.primaryArchetypeName], ["Archetype Confidence", pct(context.pitcher.archetypeConfidence)], ["Primary Pitch", context.pitcher.primaryPitchType ?? "Unavailable"], ["Fastball Velocity", context.pitcher.fastballVelocity === null ? "—" : `${num(context.pitcher.fastballVelocity)} mph`], ["Total Pitches", context.pitcher.totalPitches.toLocaleString()], ["Model Version", context.pitcher.modelVersion], ["Feature Version", context.pitcher.featureVersion]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words font-semibold text-slate-900">{value}</dd></div>)}
          </dl>
        </SectionCard>

        <SectionCard title="Arsenal" description="Aggregated pitch characteristics for the selected profile window.">
          {context.arsenal.length ? <div className="overflow-x-auto"><table className="min-w-[650px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{["Pitch Type", "Usage", "Velocity", "Spin", "Whiff Rate", "CSW Rate"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{context.arsenal.map((pitch) => <tr key={pitch.pitchType}><td className="px-3 py-3 font-semibold">{pitch.pitchName ?? pitch.pitchType}<span className="ml-1 text-xs font-normal text-slate-400">{pitch.pitchType}</span></td><td className="px-3 py-3">{pct(pitch.usageRate)}</td><td className="px-3 py-3">{pitch.avgVelocity === null ? "—" : `${num(pitch.avgVelocity)} mph`}</td><td className="px-3 py-3">{pitch.avgSpinRate === null ? "—" : `${num(pitch.avgSpinRate, 0)} rpm`}</td><td className="px-3 py-3">{pct(pitch.whiffRate)}</td><td className="px-3 py-3">{pct(pitch.cswRate)}</td></tr>)}</tbody></table></div> : <EmptyState title="Pitch arsenal is unavailable" description="Run the pitcher archetype pipeline to populate arsenal rows." />}
        </SectionCard>
      </div>

      <div className="space-y-6">
        <SectionCard title="How Hitters Perform Against This Archetype" description={`${selectedTeam?.teamName ?? "The selected team"} results against all modeled pitchers in ${context.pitcher.primaryArchetypeName}.`}>
          {context.teamPerformance ? <><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-2xl font-bold text-slate-950">{context.teamPerformance.teamName}</p><p className="mt-1 text-sm text-slate-500">{context.teamPerformance.teamAbbreviation} · {context.teamPerformance.plateAppearances} PA</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${sampleClass[context.teamPerformance.sampleQuality]}`}>{context.teamPerformance.sampleQuality} sample</span></div><dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{[["OPS", num(context.teamPerformance.ops, 3)], ["xwOBA", num(context.teamPerformance.xwoba, 3)], ["Strikeout Rate", pct(context.teamPerformance.strikeoutRate)], ["Walk Rate", pct(context.teamPerformance.walkRate)], ["Hard-hit Rate", pct(context.teamPerformance.hardHitRate)], ["Plate Appearances", context.teamPerformance.plateAppearances.toString()]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-3"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-lg font-bold text-slate-950">{value}</dd></div>)}</dl></> : <EmptyState title="No team data for this archetype" description="Archetype matchup data is not available yet. Run the archetype matchup pipeline to populate this view." />}
        </SectionCard>

        {signals.length ? <section aria-labelledby="signals-heading"><h2 id="signals-heading" className="text-lg font-semibold text-slate-900">Matchup Indicators</h2><p className="mt-1 text-sm text-slate-600">Descriptive leaders within the available sample.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{signals.map((signal) => <article key={signal.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{signal.label}</p><p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{signal.value}</p></article>)}</div></section> : null}

        <SectionCard title="Selected Team Batters" description="Sorted by OPS descending. Results are descriptive and depend on the available sample.">
          {context.batters.length ? <div className="overflow-x-auto"><table className="min-w-[980px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{["Batter", "PA", "OPS", "xwOBA", "HR", "K%", "BB%", "Avg EV", "Hard-hit", "Sample"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{context.batters.map((batter) => <tr key={batter.mlbBatterId}><td className="px-3 py-3 font-semibold text-slate-900">{batter.fullName}</td><td className="px-3 py-3">{batter.plateAppearances}</td><td className="px-3 py-3 font-semibold">{num(batter.ops, 3)}</td><td className="px-3 py-3">{num(batter.xwoba, 3)}</td><td className="px-3 py-3">{batter.homeRuns}</td><td className="px-3 py-3">{pct(batter.strikeoutRate)}</td><td className="px-3 py-3">{pct(batter.walkRate)}</td><td className="px-3 py-3">{batter.avgExitVelocity === null ? "—" : `${num(batter.avgExitVelocity)} mph`}</td><td className="px-3 py-3">{pct(batter.hardHitRate)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${sampleClass[batter.sampleQuality]}`}>{batter.sampleQuality}</span></td></tr>)}</tbody></table></div> : <EmptyState title="No batter rows meet the available sample" description="Archetype matchup data is not available yet. Run the archetype matchup pipeline to populate this view." />}
        </SectionCard>
      </div>
    </div> : null}

    {context?.dataFreshness ? <p className="text-xs text-slate-500">Latest matchup data through {context.dataFreshness}.</p> : null}
    {loadError ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">Matchup data could not be loaded: {loadError}</p> : null}
  </div>;
}
