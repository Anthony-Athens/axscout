"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import type { PitcherProfileVisualizationData } from "@/lib/data/pitchers";

const COLORS = ["#2563eb", "#0891b2", "#7c3aed", "#059669", "#d97706", "#dc2626", "#4f46e5", "#0f766e"];

export default function PitcherArsenalCharts({ data }: { data: PitcherProfileVisualizationData }) {
  return <div className="grid gap-6 xl:grid-cols-2">
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Pitch usage</h2>
      <p className="mt-1 text-sm text-slate-600">Share of observed pitches by pitch type.</p>
      {data.usage.length ? <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.usage} layout="vertical" margin={{ left: 12, right: 44 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" horizontal={false} /><XAxis type="number" domain={[0, "dataMax"]} tickFormatter={(value: number) => `${Math.round(value * 100)}%`} tick={{ fontSize: 12, fill: "#64748b" }} /><YAxis type="category" dataKey="pitchType" width={42} tick={{ fontSize: 12, fill: "#475569" }} /><Tooltip formatter={(value) => [`${(Number(value) * 100).toFixed(1)}%`, "Usage"]} labelFormatter={(_label, payload) => { const point = payload[0]?.payload as PitcherProfileVisualizationData["usage"][number] | undefined; return point ? `${point.pitchName} · ${point.pitchCount} pitches` : "Pitch usage"; }} /><Bar dataKey="usageRate" radius={[0, 6, 6, 0]}>{data.usage.map((pitch, index) => <Cell key={pitch.pitchType} fill={COLORS[index % COLORS.length]} />)}<LabelList dataKey="pitchCount" position="right" formatter={(value) => String(value ?? "")} fill="#64748b" fontSize={11} /></Bar></BarChart></ResponsiveContainer></div> : <p className="mt-8 text-sm text-slate-500">Pitch usage data is not available.</p>}
    </div>
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900">Pitch movement</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Movement values are aggregated by pitch type and may use Statcast pfx_x/pfx_z-derived features.</p>
      {data.movement.length ? <div className="mt-5 h-80"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 26, left: 4 }}><CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" /><XAxis type="number" dataKey="horizontal" name="Horizontal movement" unit=" ft" tick={{ fontSize: 12, fill: "#64748b" }} label={{ value: "Horizontal movement", position: "insideBottom", offset: -16, fill: "#64748b" }} /><YAxis type="number" dataKey="vertical" name="Vertical movement" unit=" ft" tick={{ fontSize: 12, fill: "#64748b" }} /><ZAxis type="number" dataKey="usageRate" range={[80, 500]} /><Tooltip cursor={{ strokeDasharray: "4 4" }} formatter={(value, name) => [Number(value).toFixed(2), name]} content={({ active, payload }) => { const point = payload?.[0]?.payload as PitcherProfileVisualizationData["movement"][number] | undefined; if (!active || !point) return null; return <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg"><p className="font-semibold text-slate-950">{point.pitchName}</p><p className="mt-1 text-slate-600">Horizontal: {point.horizontal.toFixed(2)} ft</p><p className="text-slate-600">Vertical: {point.vertical.toFixed(2)} ft</p><p className="text-slate-600">Usage: {(point.usageRate * 100).toFixed(1)}%</p></div>; }} /><Scatter data={data.movement} fill="#2563eb">{data.movement.map((pitch, index) => <Cell key={pitch.pitchType} fill={COLORS[index % COLORS.length]} />)}</Scatter></ScatterChart></ResponsiveContainer></div> : <p className="mt-8 text-sm text-slate-500">Movement coordinates are not available for this arsenal.</p>}
    </div>
  </div>;
}
