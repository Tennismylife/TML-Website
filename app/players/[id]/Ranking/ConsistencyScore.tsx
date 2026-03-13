"use client";

import React, { useMemo } from 'react';

interface Entry {
  date: string | null;
  rank: number;
  points: number;
}

interface Props {
  data: Entry[];
  className?: string;
}

/* ─── helpers ─────────────────────────────────────────────── */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/* ─── tier config ─────────────────────────────────────────── */
const TIERS = [
  { min: 0.80, icon: '🧊', label: 'ELITE STABILITY', badge: 'bg-cyan-500/20   border-cyan-400/60   text-cyan-200'   },
  { min: 0.40, icon: '🔒', label: 'SOLID',           badge: 'bg-slate-400/20  border-slate-300/60  text-slate-200'  },
  { min: 0.20, icon: '🌊', label: 'SWINGING',        badge: 'bg-orange-500/20 border-orange-400/60 text-orange-300' },
  { min: 0,    icon: '🎢', label: 'HIGHLY VOLATILE', badge: 'bg-red-500/20    border-red-400/60    text-red-300'    },
] as const;

/* ─── BoxPlot SVG ─────────────────────────────────────────── */
function BoxPlot({
  min, q1, median, q3, max,
}: {
  min: number; q1: number; median: number; q3: number; max: number;
}) {
  const W = 500, H = 80;
  const padL = 56, padR = 56;
  const plotW = W - padL - padR;
  const cy = H / 2;

  const sc = (v: number) =>
    min === max ? padL + plotW / 2 : padL + ((v - min) / (max - min)) * plotW;

  const xMin = sc(min);
  const xQ1  = sc(q1);
  const xMed = sc(median);
  const xQ3  = sc(q3);
  const xMax = sc(max);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 80 }}>
      {/* dashed grid lines */}
      {[xMin, xQ1, xMed, xQ3, xMax].map((x, i) => (
        <line key={i} x1={x} y1={8} x2={x} y2={H - 8}
          stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
      ))}

      {/* whisker lines */}
      <line x1={xMin} y1={cy} x2={xQ1} y2={cy} stroke="#64748b" strokeWidth="2" />
      <line x1={xQ3}  y1={cy} x2={xMax} y2={cy} stroke="#64748b" strokeWidth="2" />

      {/* whisker end caps */}
      <line x1={xMin} y1={cy - 10} x2={xMin} y2={cy + 10} stroke="#94a3b8" strokeWidth="2" />
      <line x1={xMax} y1={cy - 10} x2={xMax} y2={cy + 10} stroke="#94a3b8" strokeWidth="2" />

      {/* IQR box */}
      <rect
        x={xQ1} y={cy - 16} width={Math.max(xQ3 - xQ1, 4)} height={32}
        fill="#1d4ed8" stroke="#3b82f6" strokeWidth="1.5" rx="3" opacity={0.85}
      />

      {/* median line */}
      <line x1={xMed} y1={cy - 16} x2={xMed} y2={cy + 16}
        stroke="#93c5fd" strokeWidth="2.5" />

      {/* rank labels */}
      <text x={xMin} y={cy - 22} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="600">
        #{Math.round(min)}
      </text>
      <text x={xMax} y={cy - 22} textAnchor="middle" fill="#cbd5e1" fontSize="12" fontWeight="600">
        #{Math.round(max)}
      </text>
    </svg>
  );
}

/* ─── main component ──────────────────────────────────────── */
export default function ConsistencyScore({ data, className = '' }: Props) {
  const stats = useMemo(() => {
    if (!data || data.length < 10) return null;

    const ranks  = data.map(e => e.rank).filter(r => r > 0);
    if (ranks.length < 5) return null;

    const sorted  = [...ranks].sort((a, b) => a - b);
    const minRank  = sorted[0];
    const maxRank  = sorted[sorted.length - 1];
    const q1       = percentile(sorted, 25);
    const median   = percentile(sorted, 50);
    const q3       = percentile(sorted, 75);

    const mean   = ranks.reduce((s, r) => s + r, 0) / ranks.length;
    const stdDev = Math.sqrt(ranks.reduce((s, r) => s + (r - mean) ** 2, 0) / ranks.length);

    const pctTop10  = ranks.filter(r => r <= 10).length / ranks.length;
    const pctTop50  = ranks.filter(r => r <= 50).length / ranks.length;

    // composite: top-10 presence (45%), normalised inverse-std (35%), top-50 presence (20%)
    const normStd = Math.max(0, 1 - stdDev / 30);
    const raw     = pctTop10 * 0.45 + normStd * 0.35 + pctTop50 * 0.20;
    const score   = Math.round(Math.min(1, Math.max(0, raw)) * 100) / 100;

    const tier = TIERS.find(t => score >= t.min) ?? TIERS[TIERS.length - 1];

    // contextual insight labels
    const labels: string[] = [];
    const range = maxRank - minRank;
    if      (range <= 20) labels.push('Stable Ranking Range');
    else if (range <= 50) labels.push('Moderate Ranking Range');
    else                  labels.push('Wide Ranking Range');

    if      (pctTop10 >= 0.5) labels.push('Rarely Outside Top 10');
    else if (pctTop10 >= 0.2) labels.push('Frequently in Top 10');
    else if (pctTop50 >= 0.5) labels.push('Frequently in Top 50');
    else                      labels.push('Mostly Outside Top 50');

    if      (score >= 0.75) labels.push('Reliable Performer');
    else if (score >= 0.50) labels.push('Solid Performer');
    else                    labels.push('Unpredictable Results');

    return {
      score, pctTop10, minRank, maxRank, q1, median, q3,
      tier, labels, weekCount: ranks.length,
    };
  }, [data]);

  if (!stats) return null;

  const { score, pctTop10, minRank, maxRank, q1, median, q3, tier, labels, weekCount } = stats;

  return (
    <div className={`rounded-xl border border-blue-800/40 bg-gradient-to-r from-[#0d1b2e] via-[#0f2540] to-[#162136] px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${className}`}>

      {/* icon */}
      <span className="text-2xl select-none leading-none" aria-hidden>{tier.icon}</span>

      {/* label + score */}
      <span className="text-gray-400 text-xs font-semibold tracking-wide whitespace-nowrap">Consistency Score:</span>
      <span className="text-white text-2xl font-black tabular-nums leading-none">{score.toFixed(2)}</span>

      {/* tier badge */}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold tracking-widest whitespace-nowrap ${tier.badge}`}>
        {tier.icon} {tier.label}
      </span>

      {/* divider */}
      <span className="hidden sm:block w-px self-stretch bg-blue-800/40" />

      {/* top-10 % */}
      <span className="text-yellow-300 text-xs font-semibold whitespace-nowrap">
        ⭐ {Math.round(pctTop10 * 100)}% Top 10
      </span>

      {/* range */}
      <span className="text-green-400 text-xs font-semibold whitespace-nowrap">
        ✔ Range: #{minRank}&thinsp;—&thinsp;#{maxRank}
      </span>

      {/* divider */}
      <span className="hidden sm:block w-px self-stretch bg-blue-800/40" />

      {/* box plot – fixed narrow width */}
      <div className="bg-[#0d1f38]/70 rounded border border-blue-900/30 px-2 py-1 w-96 shrink-0">
        <BoxPlot min={minRank} q1={q1} median={median} q3={q3} max={maxRank} />
      </div>

      {/* divider */}
      <span className="hidden sm:block w-px self-stretch bg-blue-800/40" />

      {/* insight labels */}
      {labels.map((label, i) => (
        <span key={i} className="flex items-center gap-1 text-xs text-gray-300 whitespace-nowrap">
          <span className="text-green-400 font-bold">✔</span>
          {label}
        </span>
      ))}
    </div>
  );
}
