"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Match } from "@/types";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import PerformanceFilter from "./StatisticsFilters";
import { calculateStats } from "./StatisticsCalculator";

// --- Tipi ---
interface StatisticsProps {
  playerId: string;
}

// --- Utility per formattare valori ---
function safeFormat(label: string, value?: number) {
  if (value == null || !Number.isFinite(value)) return "-";
  const isPercentage = label.includes("%");
  return isPercentage ? `${value.toFixed(1)}%` : Math.round(value).toString();
}

// --- STAT ROW ---
function StatRow({ label, value }: { label: string; value: number | string }) {
  let bgColor = "bg-gray-200"; // sfondo default
  let numericValue: number | null = null;
  let isPercentage = false;

  if (typeof value === "string" && value.endsWith("%")) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      numericValue = parsed;
      isPercentage = true;
    }
  } else if (typeof value === "number") {
    numericValue = value;
  }

  if (numericValue !== null) {
    if (isPercentage) {
      if (numericValue >= 70) bgColor = "bg-green-200";
      else if (numericValue >= 50) bgColor = "bg-yellow-200";
      else bgColor = "bg-red-200";
    } else {
      if (numericValue >= 10) bgColor = "bg-green-200";
      else if (numericValue >= 5) bgColor = "bg-yellow-200";
      else bgColor = "bg-red-200";
    }
  }

  return (
    <li className="flex justify-between items-center py-1">
      <span className="text-gray-700">{label}</span>
      <span
        className={`px-2 py-1 rounded-full font-semibold text-sm ${bgColor} badge-text-black`}
      >
        {value}
      </span>
    </li>
  );
}

// --- STATS BLOCK (card uniforme come Performance) ---
interface StatsBlockProps {
  title: string;
  stats: { label: string; value: number | string }[];
}
function StatsBlock({ title, stats }: StatsBlockProps) {
  return (
    <div className="border rounded p-4">
      <h3 className="font-bold text-lg mb-3 text-center">{title}</h3>
      <ul className="space-y-1">
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

// --- COMPONENTE PRINCIPALE ---
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

  // --- Filtri per i grafici ---
  const serveAcesDF = stats.serve.filter(s => ["Aces", "Double Faults"].includes(s.label));
  const servePercentages = stats.serve.filter(s =>
    ["1st Serve %", "1st Serve Won %", "Break Points Saved %", "Service Games Won %"].includes(s.label)
  );
  const retAcesDF = stats.ret.filter(s => ["Aces against", "DF against"].includes(s.label));
  const retPercentages = stats.ret.filter(s =>
    ["1st Srv. Return Won %", "2nd Srv. Return Won %", "Break Points Won %", "Return Games Won %"].includes(s.label)
  );

  // --- Funzione per stampare valori dentro la barra ---
const renderBarLabel = (props: any) => {
  const { x, y, width, height, value } = props;
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="white"
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={18} // ← aumentato da 12 a 18
      fontWeight="bold" // opzionale: numeri più evidenti
    >
      {typeof value === "number" ? value : value}
    </text>
  );
};

  return (
    <section className="p-4">
      <PerformanceFilter
        allMatches={matches}
        loading={loading}
        error={error}
        onFilteredChange={setFiltered}
      />

      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="text-center text-gray-500 mt-6">No matches found.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SERVE */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-center">Serve Stats</h3>
            <div className="mb-6 border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={serveAcesDF}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1D4ED8" label={renderBarLabel} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Aces and Double Faults" stats={serveAcesDF} />
            </div>

            <div className="border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={servePercentages}>
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="value" fill="#60A5FA" label={renderBarLabel} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Key Percentages" stats={servePercentages} />
            </div>
          </div>

          {/* RETURN */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-center">Return Stats</h3>
            <div className="mb-6 border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={retAcesDF}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#B91C1C" label={renderBarLabel} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Aces and Double Faults" stats={retAcesDF} />
            </div>

            <div className="border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={retPercentages}>
                  <XAxis dataKey="label" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                  <Bar dataKey="value" fill="#FCA5A5" label={renderBarLabel} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Key Percentages" stats={retPercentages} />
            </div>
          </div>

          {/* POINTS / GAMES / SETS */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsBlock title="Points" stats={stats.points} />
            <StatsBlock title="Games" stats={stats.games} />
            <StatsBlock title="Sets" stats={stats.sets} />
          </div>
        </div>
      )}
    </section>
  );
}
