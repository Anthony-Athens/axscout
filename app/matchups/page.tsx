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
    bestOps ? { label: "Best OPS", name: bestOps.fullName, metric: `${num(bestOps.ops, 3)} OPS`, sample: `${bestOps.plateAppearances} PA` } : null,
    highestXwoba ? { label: "Highest xwOBA", name: highestXwoba.fullName, metric: num(highestXwoba.xwoba, 3), sample: `${highestXwoba.plateAppearances} PA` } : null,
    lowestStrikeout ? { label: "Lowest K Rate", name: lowestStrikeout.fullName, metric: pct(lowestStrikeout.strikeoutRate), sample: `${lowestStrikeout.plateAppearances} PA` } : null,
    mostPa ? { label: "Most PA", name: mostPa.fullName, metric: `${mostPa.plateAppearances} PA`, sample: "Largest available sample" } : null,
  ].filter((signal): signal is { label: string; name: string; metric: string; sample: string } => signal !== null);

  return <div className="min-w-0 space-y-5 sm:space-y-8">
    <PageHeader responsive label="Matchups" title="Archetype Matchups" description="Evaluate how an opposing lineup has performed against pitchers with similar arsenal and pitch-profile characteristics." />

    <aside className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-slate-700 sm:text-sm sm:leading-6">This view summarizes performance against pitchers in the selected pitcher’s archetype. It does not guarantee performance against the individual pitcher.</aside>

    {pitchers.length && teams.length && selectedPitcher && selectedTeam && selectedSeason ? <MatchupControls key={`${selectedSeason}-${selectedPitcherTeam?.teamAbbreviation ?? "all"}-${selectedPitcher.mlbPlayerId}-${selectedTeam.teamAbbreviation}`} pitchers={pitcherResult.data} opponentTeams={teamResult.data} seasons={commonSeasons} initialPitcherTeam={selectedPitcherTeam?.teamAbbreviation ?? ""} initialPitcherId={selectedPitcher.mlbPlayerId} initialOpponentTeam={selectedTeam.teamAbbreviation} initialSeason={selectedSeason} /> : <EmptyState responsive title="Archetype matchup data is not available yet" description="Run the archetype matchup pipeline to populate this view." />}

    {context?.pitcher && selectedTeam ? <section aria-label="Selected matchup" className="flex min-w-0 flex-col gap-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Selected Matchup</p><p className="mt-1 break-words text-lg font-bold text-slate-950 sm:text-xl">{context.pitcher.playerName} vs {selectedTeam.teamAbbreviation}</p></div>
      <p className="break-words text-sm text-slate-600 sm:max-w-md sm:text-right">{context.pitcher.primaryArchetypeName} · {selectedSeason}</p>
    </section> : null}

    {context?.pitcher ? <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-6">
      <div className="contents xl:block xl:space-y-6">
        <div className="order-1 min-w-0">
          <SectionCard responsive title="Pitcher Context" description={`${context.pitcher.playerName}’s latest eligible ${selectedSeason} archetype profile.`}>
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xl font-bold text-slate-950 sm:text-2xl">{context.pitcher.playerName}</p><p className="mt-1 text-sm text-slate-500">{context.pitcher.throws ? `Throws ${context.pitcher.throws}` : "Throwing hand unavailable"}</p></div>{context.pitcher.primaryArchetypeSlug ? <Link href={`/pitchers/archetypes/${context.pitcher.primaryArchetypeSlug}`} className="shrink-0 rounded-sm text-sm font-semibold text-blue-600 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">View archetype</Link> : null}</div>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
              {[["Primary Archetype", context.pitcher.primaryArchetypeName], ["Confidence", pct(context.pitcher.archetypeConfidence)], ["Primary Pitch", context.pitcher.primaryPitchType ?? "Unavailable"], ["Fastball Velo", context.pitcher.fastballVelocity === null ? "—" : `${num(context.pitcher.fastballVelocity)} mph`], ["Total Pitches", context.pitcher.totalPitches.toLocaleString()], ["Model", context.pitcher.modelVersion], ["Features", context.pitcher.featureVersion]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-slate-50 p-2.5 sm:p-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</dt><dd className="mt-1 break-words text-sm font-semibold tabular-nums text-slate-900 sm:text-base">{value}</dd></div>)}
            </dl>
          </SectionCard>
        </div>

        <div className="order-4 min-w-0">
          <SectionCard responsive title="Arsenal" description="Aggregated pitch characteristics for the selected profile window.">
            {context.arsenal.length ? <>
              <div className="space-y-3 sm:hidden">{context.arsenal.map((pitch) => <article key={pitch.pitchType} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><p className="min-w-0 truncate font-semibold text-slate-900">{pitch.pitchName ?? pitch.pitchType}</p><span className="shrink-0 text-xs text-slate-400">{pitch.pitchType}</span></div><dl className="mt-3 grid grid-cols-3 gap-2 text-sm">{[["Usage", pct(pitch.usageRate)], ["Velo", pitch.avgVelocity === null ? "—" : `${num(pitch.avgVelocity)} mph`], ["Spin", pitch.avgSpinRate === null ? "—" : `${num(pitch.avgSpinRate, 0)} rpm`], ["Whiff", pct(pitch.whiffRate)], ["CSW", pct(pitch.cswRate)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 truncate font-semibold tabular-nums text-slate-900">{value}</dd></div>)}</dl></article>)}</div>
              <div className="hidden overflow-x-auto sm:block"><table className="w-full text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{["Pitch Type", "Usage", "Velocity", "Spin", "Whiff Rate", "CSW Rate"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{context.arsenal.map((pitch) => <tr key={pitch.pitchType}><td className="px-3 py-3 font-semibold">{pitch.pitchName ?? pitch.pitchType}<span className="ml-1 text-xs font-normal text-slate-400">{pitch.pitchType}</span></td><td className="px-3 py-3 tabular-nums">{pct(pitch.usageRate)}</td><td className="px-3 py-3 tabular-nums">{pitch.avgVelocity === null ? "—" : `${num(pitch.avgVelocity)} mph`}</td><td className="px-3 py-3 tabular-nums">{pitch.avgSpinRate === null ? "—" : `${num(pitch.avgSpinRate, 0)} rpm`}</td><td className="px-3 py-3 tabular-nums">{pct(pitch.whiffRate)}</td><td className="px-3 py-3 tabular-nums">{pct(pitch.cswRate)}</td></tr>)}</tbody></table></div>
            </> : <EmptyState responsive title="Pitch arsenal is unavailable" description="Run the pitcher archetype pipeline to populate arsenal rows." />}
          </SectionCard>
        </div>
      </div>

      <div className="contents xl:block xl:space-y-6">
        <div className="order-2 min-w-0">
          <SectionCard responsive title="Team vs This Archetype" description={`${selectedTeam?.teamName ?? "The selected team"} against all modeled pitchers in ${context.pitcher.primaryArchetypeName}.`}>
            {context.teamPerformance ? <><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-xl font-bold text-slate-950 sm:text-2xl">{context.teamPerformance.teamName}</p><p className="mt-1 text-sm text-slate-500">{context.teamPerformance.teamAbbreviation}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${sampleClass[context.teamPerformance.sampleQuality]}`}>{context.teamPerformance.sampleQuality} sample</span></div><dl className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:grid-cols-3 sm:gap-3">{[["PA", context.teamPerformance.plateAppearances.toString()], ["OPS", num(context.teamPerformance.ops, 3)], ["xwOBA", num(context.teamPerformance.xwoba, 3)], ["K%", pct(context.teamPerformance.strikeoutRate)], ["BB%", pct(context.teamPerformance.walkRate)], ["Hard-hit", pct(context.teamPerformance.hardHitRate)]].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2.5 sm:p-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums text-slate-950 sm:text-xl">{value}</dd></div>)}</dl></> : <EmptyState responsive title="No team data for this archetype" description="Archetype matchup data is not available yet. Run the archetype matchup pipeline to populate this view." />}
          </SectionCard>
        </div>

        {signals.length ? <section className="order-3 min-w-0" aria-labelledby="signals-heading"><h2 id="signals-heading" className="text-lg font-semibold text-slate-900 sm:text-xl">Matchup Indicators</h2><p className="mt-1 text-sm text-slate-600">Descriptive leaders within the available sample.</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-2">{signals.map((signal) => <article key={signal.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 sm:text-xs">{signal.label}</p><p className="mt-1 truncate text-sm font-semibold text-slate-900">{signal.name}</p><div className="mt-2 flex items-baseline justify-between gap-2"><p className="font-bold tabular-nums text-slate-950">{signal.metric}</p><p className="text-xs text-slate-500">{signal.sample}</p></div></article>)}</div></section> : null}

        <div className="order-5 min-w-0">
          <SectionCard responsive title="Selected Team Batters" description="Sorted by OPS descending. Results are descriptive and depend on the available sample.">
            {context.batters.length ? <>
              <div className="space-y-3 lg:hidden">{context.batters.map((batter) => <article key={batter.mlbBatterId} className="rounded-lg border border-slate-200 p-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-words font-semibold text-slate-950">{batter.fullName}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${sampleClass[batter.sampleQuality]}`}>{batter.sampleQuality}</span></div><dl className="mt-3 grid grid-cols-3 gap-x-2 gap-y-3">{[["OPS", num(batter.ops, 3)], ["xwOBA", num(batter.xwoba, 3)], ["PA", batter.plateAppearances.toString()], ["HR", batter.homeRuns.toString()], ["K%", pct(batter.strikeoutRate)], ["BB%", pct(batter.walkRate)], ["Avg EV", batter.avgExitVelocity === null ? "—" : `${num(batter.avgExitVelocity)} mph`], ["Hard-hit", pct(batter.hardHitRate)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900">{value}</dd></div>)}</dl></article>)}</div>
              <div className="hidden overflow-x-auto lg:block"><table className="min-w-[920px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr>{["Batter", "PA", "OPS", "xwOBA", "HR", "K%", "BB%", "Avg EV", "Hard-hit", "Sample"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{context.batters.map((batter) => <tr key={batter.mlbBatterId}><td className="px-3 py-3 font-semibold text-slate-900">{batter.fullName}</td><td className="px-3 py-3 tabular-nums">{batter.plateAppearances}</td><td className="px-3 py-3 font-semibold tabular-nums">{num(batter.ops, 3)}</td><td className="px-3 py-3 tabular-nums">{num(batter.xwoba, 3)}</td><td className="px-3 py-3 tabular-nums">{batter.homeRuns}</td><td className="px-3 py-3 tabular-nums">{pct(batter.strikeoutRate)}</td><td className="px-3 py-3 tabular-nums">{pct(batter.walkRate)}</td><td className="px-3 py-3 tabular-nums">{batter.avgExitVelocity === null ? "—" : `${num(batter.avgExitVelocity)} mph`}</td><td className="px-3 py-3 tabular-nums">{pct(batter.hardHitRate)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${sampleClass[batter.sampleQuality]}`}>{batter.sampleQuality}</span></td></tr>)}</tbody></table></div>
            </> : <EmptyState responsive title="No batter rows meet the available sample" description="Archetype matchup data is not available yet. Run the archetype matchup pipeline to populate this view." />}
          </SectionCard>
        </div>
      </div>
    </div> : null}

    {context?.dataFreshness ? <p className="text-xs text-slate-500">Latest matchup data through {context.dataFreshness}.</p> : null}
    {loadError ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-700">Matchup data could not be loaded: {loadError}</p> : null}
  </div>;
}
