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

  // Add explicit flag to force white text inside certain percent bars (reliable source)
  // Include both 'serve' and 'ret' percent labels to ensure consistent appearance
  const whiteLabelSet = new Set([
    // serve percent labels
    '1st Serve %',
    '1st Serve Won %',
    'Break Points Saved %',
    'Service Games Won %',
    // ret percent labels
    '1st Srv. Return Won %',
    '2nd Srv. Return Won %',
    'Break Points Won %',
    'Return Games Won %'
  ]);

  // Attach explicit textColor to ensure renderer receives a reliable override
  const servePercentagesData = servePercentages.map(s => ({
    ...s,
    forceWhiteText: whiteLabelSet.has(s.label),
    textColor: whiteLabelSet.has(s.label) ? '#FFFFFF' : undefined,
  }));
  const retPercentagesData = retPercentages.map(s => ({
    ...s,
    forceWhiteText: whiteLabelSet.has(s.label),
    textColor: whiteLabelSet.has(s.label) ? '#FFFFFF' : undefined,
  }));

  // Axis tick style for chart labels (more prominent)
  const axisTick = { fontSize: 12, fontWeight: 700, fill: '#FFFFFF' } as const;

  // --- Helper: contrast color from hex ---
function getContrastColor(hex: string) {
  try {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    // threshold tuned for good contrast on site palette
    return luminance > 160 ? '#000000' : '#FFFFFF';
  } catch (e) {
    return '#FFFFFF';
  }
}

// --- Funzione per stampare valori dentro la barra (factory con colore) ---
const renderBarLabelForColor = (barFill: string) => (props: any) => {
  const { x, y, width, height, value } = props;

  // Estrai la label dai vari possibili punti di Recharts (payload, payload.payload, array payload)
  let labelStr = '';
  const p = props.payload;
  if (p) {
    if (typeof p.label === 'string') labelStr = p.label;
    else if (p.payload && typeof p.payload.label === 'string') labelStr = p.payload.label;
    else if (Array.isArray(p) && p[0] && p[0].payload && typeof p[0].payload.label === 'string') labelStr = p[0].payload.label;
  }

  const showPercent = typeof labelStr === 'string' && labelStr.includes('%');

  let display: string;
  if (typeof value === 'number') {
    display = showPercent ? `${value.toFixed(1)}%` : Math.round(value).toString();
  } else {
    display = String(value ?? '');
    if (showPercent && display !== '' && !display.trim().endsWith('%')) display = `${display}%`;
  }

  const fillColor = getContrastColor(barFill);

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill={fillColor}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={18}
      fontWeight="bold"
    >
      {display}
    </text>
  );
};

// --- Percent-specific label: forza il % sempre (usato nelle chart con dominio 0-100) ---
const renderBarLabelPercentForColor = (barFill: string) => (props: any) => {
  const { x, y, width, height, value } = props;

  // Estrai la label per decidere se forzare il colore bianco
  let labelStr = '';
  const p = props.payload;
  if (p) {
    if (typeof p.label === 'string') labelStr = p.label;
    else if (p.payload && typeof p.payload.label === 'string') labelStr = p.payload.label;
    else if (Array.isArray(p) && p[0] && p[0].payload && typeof p[0].payload.label === 'string') labelStr = p[0].payload.label;
  }

  let display: string;
  if (typeof value === 'number') {
    display = `${value.toFixed(1)}%`;
  } else {
    display = String(value ?? '');
    // assicurati ci sia il %
    if (!display.trim().endsWith('%')) display = `${display}%`;
  }

  // Etichette che vogliono testo bianco dentro la barra: usa normalizzazione per match preciso
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const whiteLabels = [
    '1st serve%', '1st serve won%', 'break points saved%', 'service games won%',
    '1st srv return won%', '2nd srv return won%', 'break points won%', 'return games won%'
  ].map(normalize);

  const labelNorm = normalize(labelStr || '');
  const wantsWhitePattern = whiteLabels.includes(labelNorm);

  // Prefer explicit flag if present (more reliable), fallback to pattern match
  let wantsWhiteFinal = wantsWhitePattern;
  if (p) {
    if (p.forceWhiteText === true) wantsWhiteFinal = true;
    else if (Array.isArray(p) && p[0] && p[0].payload && p[0].payload.forceWhiteText === true) wantsWhiteFinal = true;
  }

  // Also read explicit textColor if provided on the data point
  let explicitTextColor: string | undefined = undefined;
  try {
    if (p && typeof p.textColor === 'string') explicitTextColor = p.textColor;
    else if (p && p.payload && typeof p.payload.textColor === 'string') explicitTextColor = p.payload.textColor;
    else if (Array.isArray(p) && p[0] && p[0].payload && typeof p[0].payload.textColor === 'string') explicitTextColor = p[0].payload.textColor;
  } catch (err) {
    explicitTextColor = undefined;
  }

  // Force white for all percent bars to make serve and return identical
  const fillColor = explicitTextColor ? explicitTextColor : '#FFFFFF';

  // Debug temporaneo: logga condizioni per le label sospette
  try {
    if (labelNorm.includes('return') || wantsWhiteFinal || explicitTextColor) {
      // eslint-disable-next-line no-console
      console.debug('[BAR-LABEL-DEBUG]', { labelStr, labelNorm, wantsWhitePattern, wantsWhiteFinal, explicitTextColor, p, barFill, value, fillColor });
    }
  } catch (err) {
    // ignore
  }

  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill={fillColor}
      style={{ fill: fillColor }}
      className={'bar-label bar-label--white'}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize={18}
      fontWeight="bold"
    >
      {display}
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
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#1D4ED8" label={renderBarLabelForColor("#1D4ED8")} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Aces and Double Faults" stats={serveAcesDF} />
            </div>

            <div className="border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={servePercentagesData}>
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#60A5FA" label={renderBarLabelPercentForColor("#60A5FA")} />
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
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#B91C1C" label={renderBarLabelForColor("#B91C1C")} />
                </BarChart>
              </ResponsiveContainer>
              <StatsBlock title="Aces and Double Faults" stats={retAcesDF} />
            </div>

            <div className="border rounded p-4">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={retPercentagesData}>
                  <XAxis dataKey="label" tick={axisTick} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(v: number) => `${v.toFixed(1)}%`}
                    contentStyle={{ backgroundColor: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)', color: '#FFFFFF' }}
                    itemStyle={{ color: '#FFFFFF' }}
                    labelStyle={{ color: '#FFFFFF' }}
                    cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  />
                  <Bar dataKey="value" fill="#FCA5A5" label={renderBarLabelPercentForColor("#FCA5A5")} />
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
