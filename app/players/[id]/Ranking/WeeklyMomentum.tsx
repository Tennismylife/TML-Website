"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface MomentumEntry {
  iso: string;
  label: string;
  rank: number;
  points: number;
  weeklyMomentum: number;       // actual value
  displayMomentum: number;      // clamped for bar rendering
  isOutOfRange: boolean;        // exceeds current y-cap
}

interface Props {
  data: Entry[];
  selectedYear?: number | "all";
}

const PRESETS = [10, 20, 50, 100] as const;
type Cap = typeof PRESETS[number] | "full";

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as MomentumEntry;
  const color =
    d.weeklyMomentum > 0 ? "#4ade80" : d.weeklyMomentum < 0 ? "#f87171" : "#6b7280";

  return (
    <div className="bg-gray-800 border border-gray-600 rounded shadow-lg p-2 text-xs text-gray-100 space-y-0.5">
      <p className="font-semibold text-gray-300">{d.label}</p>
      <p>Rank: <span className="text-yellow-300 font-bold">#{d.rank}</span></p>
      <p>
        Momentum:{" "}
        <span className="font-bold" style={{ color }}>
          {d.weeklyMomentum > 0 ? `+${d.weeklyMomentum}` : d.weeklyMomentum}
        </span>
        {d.isOutOfRange && <span className="ml-1 text-orange-400">⚠ clipped</span>}
      </p>
      <p>Points: <span className="text-blue-300">{d.points.toLocaleString()}</span></p>
    </div>
  );
}

export default function WeeklyMomentum({ data, selectedYear = "all" }: Props) {
  const [cap, setCap] = useState<Cap>(20);

  const rawData = useMemo<Omit<MomentumEntry, "displayMomentum" | "isOutOfRange">[]>(() => {
    const filtered = data.filter((e) => {
      if (!e.date) return false;
      if (selectedYear === "all") return true;
      return new Date(e.date).getFullYear() === selectedYear;
    });
    return filtered.map((e, i) => {
      const prev = filtered[i - 1];
      const weeklyMomentum = prev ? prev.rank - e.rank : 0;
      return {
        iso: e.date ?? "",
        label: e.date
          ? new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : "",
        rank: e.rank,
        points: e.points,
        weeklyMomentum,
      };
    });
  }, [data, selectedYear]);

  const maxAbsFull = useMemo(
    () => Math.max(1, ...rawData.map((d) => Math.abs(d.weeklyMomentum))),
    [rawData]
  );

  const capValue = cap === "full" ? maxAbsFull : Math.min(cap, maxAbsFull);

  const chartData = useMemo<MomentumEntry[]>(() =>
    rawData.map((d) => {
      const abs = Math.abs(d.weeklyMomentum);
      const isOutOfRange = abs > capValue;
      const displayMomentum = isOutOfRange
        ? capValue * Math.sign(d.weeklyMomentum)
        : d.weeklyMomentum;
      return { ...d, displayMomentum, isOutOfRange };
    }),
    [rawData, capValue]
  );

  if (!chartData.length) return null;

  const domain: [number, number] = [-capValue, capValue];

  const yearTicks: string[] = [];
  const seen = new Set<number>();
  chartData.forEach((d) => {
    const y = new Date(d.iso).getFullYear();
    if (!seen.has(y)) { seen.add(y); yearTicks.push(d.iso); }
  });

  const outOfRangeCount = chartData.filter((d) => d.isOutOfRange).length;

  return (
    <div className="rounded-2xl border border-gray-600 bg-gray-800/90 p-4 h-[750px]">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
        <p className="text-base text-gray-400 font-semibold">
          Weekly Momentum&nbsp;▲ rank gained&nbsp;/&nbsp;▼ rank lost
          <span className="text-green-400 font-semibold">▲ rank gained</span>
          &ensp;/&ensp;
          <span className="text-red-400 font-semibold">▼ rank lost</span>
          {outOfRangeCount > 0 && (
            <span className="ml-2 text-orange-400">
              ⚠ {outOfRangeCount} spike{outOfRangeCount > 1 ? "s" : ""} clipped
            </span>
          )}
        </p>

        {/* Y-scale controls */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-500 mr-1">Y scale ±</span>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setCap(p)}
              className={`px-2 py-0.5 rounded border transition-colors ${
                cap === p
                  ? "bg-violet-600 border-violet-500 text-white font-bold"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:border-violet-500"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCap("full")}
            className={`px-2 py-0.5 rounded border transition-colors ${
              cap === "full"
                ? "bg-violet-600 border-violet-500 text-white font-bold"
                : "bg-gray-800 border-gray-600 text-gray-300 hover:border-violet-500"
            }`}
          >
            Full
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={700}>
        <BarChart data={chartData} margin={{ top: 8, right: 20, left: 10, bottom: 20 }}>
          <CartesianGrid stroke="#374151" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="iso"
            ticks={yearTicks}
            stroke="#94a3b8"
            tick={{ fill: "#e2e8f0", fontSize: 16 }}
            tickLine={false}
            axisLine={{ stroke: "#475569" }}
            interval={0}
            angle={-40}
            textAnchor="end"
            height={50}
            tickFormatter={(v: string) => {
              try { return String(new Date(v).getFullYear()); } catch { return v; }
            }}
          />
          <YAxis
            domain={domain}
            stroke="#94a3b8"
            tick={{ fill: "#e2e8f0", fontSize: 16 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))}
            label={{ value: "Momentum", angle: -90, position: "insideLeft", style: { fill: "#94a3b8", fontSize: 16 } }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
          {/* Dashed cap lines when not in full mode */}
          {cap !== "full" && (
            <>
              <ReferenceLine y={capValue} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1} />
              <ReferenceLine y={-capValue} stroke="#f97316" strokeDasharray="4 3" strokeWidth={1} />
            </>
          )}
          <Bar dataKey="displayMomentum" radius={[3, 3, 0, 0]} maxBarSize={32}>
            {chartData.map((d, i) => (
              <Cell
                key={i}
                fill={
                  d.weeklyMomentum > 0
                    ? d.isOutOfRange ? "#f97316" : "#4ade80"
                    : d.weeklyMomentum < 0
                    ? d.isOutOfRange ? "#fb923c" : "#f87171"
                    : "#6b7280"
                }
                fillOpacity={d.isOutOfRange ? 1 : 0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
