"use client";

import { useRouter } from "next/navigation";
import {
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { PitcherMapPoint } from "@/lib/data/pitchers";

const COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#dc2626", "#4f46e5", "#0f766e", "#9333ea", "#475569"];

type PitcherMapChartProps = { points: PitcherMapPoint[] };
type DotProps = { cx?: number; cy?: number; fill?: string; payload?: PitcherMapPoint };
const pct = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(1)}%`;

export default function PitcherMapChart({ points }: PitcherMapChartProps) {
  const router = useRouter();
  const groups = new Map<string, PitcherMapPoint[]>();
  for (const point of points) {
    const key = point.archetypeName ?? "Unassigned";
    groups.set(key, [...(groups.get(key) ?? []), point]);
  }

  function MapDot(props: DotProps) {
    if (props.cx === undefined || props.cy === undefined || !props.payload) return <g />;
    return <circle cx={props.cx} cy={props.cy} r={6} fill={props.fill} stroke="#fff" strokeWidth={2} className="cursor-pointer outline-none transition-opacity hover:opacity-75" tabIndex={0} role="link" aria-label={`View ${props.payload.fullName}`} onClick={() => router.push(`/pitchers/${props.payload?.mlbPlayerId}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push(`/pitchers/${props.payload?.mlbPlayerId}`); }} />;
  }

  return <div className="h-[560px] w-full" role="img" aria-label="Pitcher similarity map">
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 20, right: 24, bottom: 28, left: 4 }}>
        <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" />
        <XAxis type="number" dataKey="mapX" name="Similarity X" tick={{ fill: "#64748b", fontSize: 12 }} label={{ value: "Model similarity X", position: "insideBottom", offset: -18, fill: "#64748b" }} />
        <YAxis type="number" dataKey="mapY" name="Similarity Y" tick={{ fill: "#64748b", fontSize: 12 }} label={{ value: "Model similarity Y", angle: -90, position: "insideLeft", fill: "#64748b" }} />
        <ZAxis range={[70, 70]} />
        <Tooltip cursor={{ strokeDasharray: "4 4" }} content={({ active, payload }) => {
          const point = payload?.[0]?.payload as PitcherMapPoint | undefined;
          if (!active || !point) return null;
          return <div className="max-w-64 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg"><p className="font-semibold text-slate-950">{point.fullName}</p><dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-slate-600"><dt>Archetype</dt><dd className="text-right font-medium">{point.archetypeName ?? "Unassigned"}</dd><dt>Primary pitch</dt><dd className="text-right font-medium">{point.primaryPitchType ?? "—"}</dd><dt>Fastball</dt><dd className="text-right font-medium">{point.fastballVelocity === null ? "—" : `${point.fastballVelocity.toFixed(1)} mph`}</dd><dt>Whiff rate</dt><dd className="text-right font-medium">{pct(point.overallWhiffRate)}</dd><dt>Confidence</dt><dd className="text-right font-medium">{pct(point.archetypeProbability)}</dd></dl><p className="mt-2 font-medium text-blue-600">Click to view profile</p></div>;
        }} />
        <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: 12 }} />
        {[...groups.entries()].map(([name, data], index) => <Scatter key={name} name={name} data={data} fill={COLORS[index % COLORS.length]} shape={<MapDot />} />)}
      </ScatterChart>
    </ResponsiveContainer>
  </div>;
}
