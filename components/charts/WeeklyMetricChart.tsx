"use client";

import { useState } from "react";

export type WeeklyMetricPoint = {
  week_start_date: string;
  value: number | null;
};

type ValueFormat = "decimal2" | "decimal3" | "integer";

type WeeklyMetricChartProps = {
  title: string;
  data: WeeklyMetricPoint[];
  color: string;
  valueFormat?: ValueFormat;
  emptyLabel?: string;
};

const WIDTH = 640;
const HEIGHT = 240;
const PADDING = { top: 24, right: 18, bottom: 42, left: 54 };

function formatValue(value: number, format: ValueFormat) {
  if (format === "integer") {
    return Math.round(value).toString();
  }

  return value.toFixed(format === "decimal3" ? 3 : 2);
}

function formatWeek(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function WeeklyMetricChart({
  title,
  data,
  color,
  valueFormat = "decimal2",
  emptyLabel = "No weekly data",
}: WeeklyMetricChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const points = data
    .map((point, index) => ({ ...point, index }))
    .filter((point): point is WeeklyMetricPoint & { index: number; value: number } =>
      point.value !== null
    );

  if (!points.length) {
    return (
      <div className="flex min-h-72 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-600">
          {emptyLabel}
        </div>
      </div>
    );
  }

  const values = points.map((point) => point.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const domainPadding = Math.max((rawMax - rawMin) * 0.12, Math.abs(rawMax) * 0.04, 0.01);
  const minimum = rawMin - domainPadding;
  const maximum = rawMax + domainPadding;
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const xFor = (index: number) =>
    PADDING.left +
    (data.length === 1 ? chartWidth / 2 : (index / (data.length - 1)) * chartWidth);
  const yFor = (value: number) =>
    PADDING.top + ((maximum - value) / (maximum - minimum)) * chartHeight;
  const linePoints = points
    .map((point) => `${xFor(point.index)},${yFor(point.value)}`)
    .join(" ");
  const latest = points[points.length - 1];
  const active = activeIndex === null ? latest : points[activeIndex] ?? latest;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex min-h-12 items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Week of {formatWeek(active.week_start_date)}
          </p>
        </div>
        <p className="text-xl font-bold text-slate-950">
          {formatValue(active.value, valueFormat)}
        </p>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title} by week`}
        className="mt-3 aspect-[8/3] w-full overflow-visible"
      >
        {[0, 0.5, 1].map((position) => {
          const y = PADDING.top + position * chartHeight;

          return (
            <line
              key={position}
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={y}
              y2={y}
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="4 6"
            />
          );
        })}

        <text x="0" y={PADDING.top + 4} fill="#94a3b8" fontSize="12">
          {formatValue(rawMax, valueFormat)}
        </text>
        <text x="0" y={HEIGHT - PADDING.bottom + 4} fill="#94a3b8" fontSize="12">
          {formatValue(rawMin, valueFormat)}
        </text>

        {points.length > 1 && (
          <polyline
            points={linePoints}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {points.map((point, pointIndex) => (
          <circle
            key={`${point.week_start_date}-${pointIndex}`}
            cx={xFor(point.index)}
            cy={yFor(point.value)}
            r={active.index === point.index ? 7 : 5}
            fill={color}
            stroke="#0f172a"
            strokeWidth="3"
            tabIndex={0}
            onMouseEnter={() => setActiveIndex(pointIndex)}
            onMouseLeave={() => setActiveIndex(null)}
            onFocus={() => setActiveIndex(pointIndex)}
            onBlur={() => setActiveIndex(null)}
            aria-label={`${formatWeek(point.week_start_date)}: ${formatValue(point.value, valueFormat)}`}
          />
        ))}

        <text
          x={PADDING.left}
          y={HEIGHT - 10}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="start"
        >
          {formatWeek(data[0].week_start_date)}
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={HEIGHT - 10}
          fill="#94a3b8"
          fontSize="12"
          textAnchor="end"
        >
          {formatWeek(data[data.length - 1].week_start_date)}
        </text>
      </svg>
    </div>
  );
}
