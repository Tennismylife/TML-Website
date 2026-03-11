"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Match } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import PerformanceFilter from "./StatisticsFilters";
import { calculateStats } from "./StatisticsCalculator";

// --- Tipi ---
interface StatisticsProps {
  playerId: string;
}

// --- Utility ---
function safeFormat(label: string, value?: number) {
  if (value == null || !Number.isFinite(value)) return "-";
  const isPercentage = label.includes("%");
  return isPercentage ? `${value.toFixed(1)}%` : Math.round(value).toString();
}

function pctColor(v: number): { bar: string; glow: string; text: string } {
  if (v >= 65) return { bar: "#22c55e", glow: "#22c55e40", text: "#86efac" };
  if (v >= 45) return { bar: "#eab308", glow: "#eab30840", text: "#fde047" };
  return { bar: "#ef4444", glow: "#ef444440", text: "#fca5a5" };
}

function getContrastColor(hex: string) {
  try {
    let h = hex.replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#000" : "#fff";
  } catch {
    return "#fff";
  }
}

// --- STAT ROW ---
function StatRow({ label, value }: { label: string; value: number | string }) {
  const isPercentage = typeof value === "string" && value.endsWith("%");
  const numericValue = isPercentage ? parseFloat(value as string) : null;

  if (isPercentage && numericValue !== null && !isNaN(numericValue)) {
    const { bar, glow, text } = pctColor(numericValue);
    return (
      <li className="py-2">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-lg font-semibold text-gray-300">{label}</span>
          <span className="text-lg font-extrabold tabular-nums" style={{ color: text }}>{value}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(numericValue, 100)}%`, background: bar, boxShadow: `0 0 6px ${glow}` }}
          />
        </div>
      </li>
    );
  }

  return (
    <li className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
      <span className="text-lg font-semibold text-gray-300">{label}</span>
      <span className="px-2.5 py-0.5 rounded-full text-lg font-extrabold tabular-nums bg-white/10 text-white border border-white/10">
        {value}
      </span>
    </li>
  );
}

// --- STATS BLOCK ---
interface StatsBlockProps {
  title: string;
  stats: { label: string; value: number | string }[];
  accent?: string;
}
function StatsBlock({ title, stats, accent = "#60a5fa" }: StatsBlockProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "rgba(15,20,35,0.7)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="px-4 py-2.5"
        style={{ background: `linear-gradient(90deg, ${accent}22 0%, transparent 100%)`, borderBottom: `1px solid ${accent}33` }}
      >
        <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: accent }}>
          {title}
        </h3>
      </div>
      <ul className="px-4 py-1">
        {stats.map((s) => (
          <StatRow
            key={s.label}
            label={s.label}
            value={typeof s.value === "number" ? safeFormat(s.label, s.value) : s.value}
          />
        ))}
      </ul>
    </div>
  );
}

// --- SECTION HEADER ---
function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: color }} />
      <h3 className="text-base font-extrabold tracking-wider uppercase" style={{ color }}>{title}</h3>
    </div>
  );
}

// --- CHART CARD ---
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "rgba(15,20,35,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">{title}</p>
      {children}
    </div>
  );
}

// --- BAR LABELS ---
const renderBarLabel = (props: any) => {
  const { x, y, width, height, value, fill } = props;
  if (!value || height < 18) return null;
  const display = typeof value === "number" ? Math.round(value).toString() : String(value);
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff"
      textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold">
      {display}
    </text>
  );
};

const renderBarLabelPct = (props: any) => {
  const { x, y, width, height, value } = props;
  if (!value || height < 18) return null;
  const display = typeof value === "number" ? `${value.toFixed(1)}%` : String(value);
  return (
    <text x={x + width / 2} y={y + height / 2} fill="#fff"
      textAnchor="middle" dominantBaseline="middle" fontSize={13} fontWeight="bold">
      {display}
    </text>
  );
};

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "rgba(9,14,27,0.97)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 10,
    color: "#fff",
  },
  itemStyle: { color: "#93c5fd" },
  labelStyle: { color: "#e2e8f0", fontWeight: 700 },
  cursor: { fill: "rgba(255,255,255,0.03)" },
};

const axisTick = { fontSize: 13, fontWeight: 700, fill: "#94a3b8" } as const;

// --- MAIN ---
export default function Statistics({ playerId }: StatisticsProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [filtered, setFiltered] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players/statistics?id=${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (!abort) setMatches(data);
      } catch (err) {
        if (!abort) setError("Errore nel caricamento delle statistiche.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [playerId]);

  const stats = useMemo(() => calculateStats(filtered, playerId), [filtered, playerId]);

  const serveAcesDF = stats.serve.filter((s) => ["Aces", "Double Faults"].includes(s.label));
  const servePercentages = stats.serve.filter((s) =>
    ["1st Serve %", "1st Serve Won %", "Break Points Saved %", "Service Games Won %"].includes(s.label)
  );
  const retAcesDF = stats.ret.filter((s) => ["Aces against", "DF against"].includes(s.label));
  const retPercentages = stats.ret.filter((s) =>
    ["1st Srv. Return Won %", "2nd Srv. Return Won %", "Break Points Won %", "Return Games Won %"].includes(s.label)
  );

  const serveAcesDFColors = ["#3b82f6", "#ef4444"];
  const retAcesDFColors = ["#ef4444", "#f59e0b"];

  return (
    <section className="p-4 space-y-8">
      <PerformanceFilter allMatches={matches} loading={loading} error={error} onFilteredChange={setFiltered} />

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-400 border-t-transparent" />
        </div>
      )}
      {error && <div className="text-red-400 text-center py-6">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center text-gray-500 py-12">No matches found.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-10">

          {/* SERVE + RETURN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

            {/* SERVE */}
            <div className="space-y-4">
              <SectionHeader title="Serve Stats" color="#60a5fa" />

              <ChartCard title="Aces & Double Faults">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={serveAcesDF} barCategoryGap="40%">
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} label={renderBarLabel}>
                      {serveAcesDF.map((_, i) => <Cell key={i} fill={serveAcesDFColors[i % 2]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex gap-4">
                  {serveAcesDF.map((s, i) => (
                    <div key={s.label} className="flex-1 rounded-lg px-3 py-2 text-center"
                      style={{ background: `${serveAcesDFColors[i % 2]}18`, border: `1px solid ${serveAcesDFColors[i % 2]}30` }}>
                      <div className="text-3xl font-black" style={{ color: serveAcesDFColors[i % 2] }}>
                        {typeof s.value === "number" ? Math.round(s.value) : s.value}
                      </div>
                      <div className="text-base font-bold text-gray-300 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Key Percentages">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={servePercentages} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} label={renderBarLabelPct}>
                      {servePercentages.map((s) => {
                        const v = typeof s.value === "number" ? s.value : parseFloat(s.value as string);
                        return <Cell key={s.label} fill={pctColor(v).bar} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ul className="mt-2">
                  {servePercentages.map((s) => (
                    <StatRow key={s.label} label={s.label}
                      value={typeof s.value === "number" ? safeFormat(s.label, s.value) : s.value} />
                  ))}
                </ul>
              </ChartCard>
            </div>

            {/* RETURN */}
            <div className="space-y-4">
              <SectionHeader title="Return Stats" color="#f87171" />

              <ChartCard title="Aces & Double Faults Against">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={retAcesDF} barCategoryGap="40%">
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} label={renderBarLabel}>
                      {retAcesDF.map((_, i) => <Cell key={i} fill={retAcesDFColors[i % 2]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 flex gap-4">
                  {retAcesDF.map((s, i) => (
                    <div key={s.label} className="flex-1 rounded-lg px-3 py-2 text-center"
                      style={{ background: `${retAcesDFColors[i % 2]}18`, border: `1px solid ${retAcesDFColors[i % 2]}30` }}>
                      <div className="text-3xl font-black" style={{ color: retAcesDFColors[i % 2] }}>
                        {typeof s.value === "number" ? Math.round(s.value) : s.value}
                      </div>
                      <div className="text-base font-bold text-gray-300 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              <ChartCard title="Key Percentages">
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={retPercentages} barCategoryGap="30%">
                    <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={axisTick} axisLine={false} tickLine={false} />
                    <Tooltip {...tooltipStyle} formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} label={renderBarLabelPct}>
                      {retPercentages.map((s) => {
                        const v = typeof s.value === "number" ? s.value : parseFloat(s.value as string);
                        return <Cell key={s.label} fill={pctColor(v).bar} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <ul className="mt-2">
                  {retPercentages.map((s) => (
                    <StatRow key={s.label} label={s.label}
                      value={typeof s.value === "number" ? safeFormat(s.label, s.value) : s.value} />
                  ))}
                </ul>
              </ChartCard>
            </div>
          </div>

          {/* MATCH TOTALS */}
          <div>
            <SectionHeader title="Match Totals" color="#a78bfa" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsBlock title="Points" stats={stats.points} accent="#818cf8" />
              <StatsBlock title="Games" stats={stats.games} accent="#34d399" />
              <StatsBlock title="Sets" stats={stats.sets} accent="#f472b6" />
            </div>
          </div>

        </div>
      )}
    </section>
  );
}

