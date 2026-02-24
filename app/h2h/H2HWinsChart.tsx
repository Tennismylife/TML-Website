"use client";

import React from "react";

interface Player {
  id: string;
  atpname: string | null;
  ioc?: string | null;
}

interface Match {
  id: number;
  tourney_level?: string | null;
  surface?: string | null;
  winner_name?: string | null;
  loser_name?: string | null;
  score?: string | null;
  status?: boolean | null;
  [key: string]: any;
}

interface H2HWinsChartProps {
  matches: Match[];
  player1: Player;
  player2: Player;
}

const CATEGORIES = [
  { label: "All",           filter: () => true },
  { label: "Grand Slam",    filter: (m: Match) => m.tourney_level === "G" },
  { label: "Masters 1000",  filter: (m: Match) => m.tourney_level === "M" },
  { label: "ATP 500",       filter: (m: Match) => m.tourney_level === "500" },
  { label: "ATP 250",       filter: (m: Match) => m.tourney_level === "250" },
  { label: "Others",        filter: (m: Match) => m.tourney_level === "A" },
  { label: "Tour Finals",   filter: (m: Match) => m.tourney_level === "F" },
  { label: "Olympics",      filter: (m: Match) => m.tourney_level === "O" },
  { label: "Davis Cup",     filter: (m: Match) => m.tourney_level === "D" },
  { label: "Hard",          filter: (m: Match) => m.surface === "Hard" },
  { label: "Clay",          filter: (m: Match) => m.surface === "Clay" },
  { label: "Grass",         filter: (m: Match) => m.surface === "Grass" },
  { label: "Indoor Hard",   filter: (m: Match) => m.surface === "Carpet" },
];

const LABEL_COLORS: Record<string, string> = {
  "Hard":         "#93c5fd",
  "Clay":         "#fcd34d",
  "Grass":        "#86efac",
  "Indoor Hard":  "#c7d2fe",
  "Grand Slam":   "#fca5a5",
  "Masters 1000": "#c4b5fd",
  "ATP 500":      "#67e8f9",
  "ATP 250":      "#a5b4fc",
  "Others":       "#6b7280",
  "Tour Finals":  "#f9a8d4",
  "Olympics":     "#fde68a",
  "Davis Cup":    "#6ee7b7",
  "All":          "#e5e7eb",
};

/** SVG donut pie: r=outer radius, stroke width = r-inner */
function DonutPie({
  pct1,
  pct2,
  size = 80,
  thickness = 14,
  color1 = "#2563eb",
  color2 = "#dc2626",
  label,
  w1,
  w2,
}: {
  pct1: number;
  pct2: number;
  size?: number;
  thickness?: number;
  color1?: string;
  color2?: string;
  label?: string;
  w1: number;
  w2: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const dash1 = (pct1 / 100) * circ;
  const dash2 = (pct2 / 100) * circ;
  // start at top (-90deg)
  const offset1 = circ * 0.25; // rotate so arc starts at top
  const offset2 = circ * 0.25 - dash1;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#374151" strokeWidth={thickness} />
        {/* player 1 arc */}
        {pct1 > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color1}
            strokeWidth={thickness}
            strokeDasharray={`${dash1} ${circ - dash1}`}
            strokeDashoffset={offset1}
            strokeLinecap="butt"
          />
        )}
        {/* player 2 arc */}
        {pct2 > 0 && (
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color2}
            strokeWidth={thickness}
            strokeDasharray={`${dash2} ${circ - dash2}`}
            strokeDashoffset={offset2}
            strokeLinecap="butt"
          />
        )}
        {/* center: w1 – w2 side by side, each in player color */}
        <text x={cx - size * 0.08} y={cy + size * 0.08} textAnchor="end"   fill={w1 >= w2 ? color1 : "#6b7280"} fontSize={size * 0.22} fontWeight="bold">{w1}</text>
        <text x={cx}               y={cy + size * 0.08} textAnchor="middle" fill="#6b7280"                         fontSize={size * 0.16}>{"–"}</text>
        <text x={cx + size * 0.08} y={cy + size * 0.08} textAnchor="start"  fill={w2 >= w1 ? color2 : "#6b7280"} fontSize={size * 0.22} fontWeight="bold">{w2}</text>
      </svg>
      {label && (
        <span className="text-xs font-semibold text-center leading-tight" style={{ color: LABEL_COLORS[label] ?? "#9ca3af" }}>
          {label}
        </span>
      )}
    </div>
  );
}

export default function H2HWinsChart({ matches, player1, player2 }: H2HWinsChartProps) {
  const data = CATEGORIES.map(({ label, filter }) => {
    const sub = matches.filter(filter);
    const w1 = sub.filter((m) => m.winner_name === player1.atpname).length;
    const w2 = sub.filter((m) => m.winner_name === player2.atpname).length;
    return { label, w1, w2, total: w1 + w2 };
  }).filter((d) => d.total > 0);

  if (data.length === 0) return null;

  const overall = data.find((d) => d.label === "All") ?? data[0];
  const pct1Overall = overall.total > 0 ? (overall.w1 / overall.total) * 100 : 50;
  const pct2Overall = 100 - pct1Overall;
  const p1Leads = overall.w1 > overall.w2;
  const p2Leads = overall.w2 > overall.w1;

  const LEVEL_LABELS = new Set(["Grand Slam", "Masters 1000", "ATP 500", "ATP 250", "Others", "Tour Finals", "Olympics", "Davis Cup"]);
  const SURFACE_LABELS = new Set(["Hard", "Clay", "Grass", "Indoor Hard"]);

  const levelCats   = data.filter((d) => LEVEL_LABELS.has(d.label));
  const surfaceCats = data.filter((d) => SURFACE_LABELS.has(d.label));

  const renderDonut = (d: { label: string; w1: number; w2: number; total: number }, size = 115, thickness = 16) => {
    const p1 = d.total > 0 ? (d.w1 / d.total) * 100 : 50;
    const p2 = 100 - p1;
    return (
      <DonutPie key={d.label} pct1={p1} pct2={p2} size={size} thickness={thickness} w1={d.w1} w2={d.w2} label={d.label} />
    );
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* ── Legend ── */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
          <span className={`font-semibold ${p1Leads ? "text-blue-300" : "text-gray-400"}`}>{player1.atpname}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-red-600" />
          <span className={`font-semibold ${p2Leads ? "text-red-300" : "text-gray-400"}`}>{player2.atpname}</span>
        </div>
      </div>

      {/* ── Row 1: Overall + tournament levels ── */}
      <div className="w-full overflow-x-auto">
        <div className="flex items-end justify-center gap-4 px-2 min-w-max mx-auto">
          <DonutPie
            pct1={pct1Overall}
            pct2={pct2Overall}
            size={150}
            thickness={20}
            w1={overall.w1}
            w2={overall.w2}
            label="Overall"
          />
          {levelCats.length > 0 && <div className="self-stretch w-px bg-gray-700 mx-1" />}
          {levelCats.map((d) => renderDonut(d))}
        </div>
      </div>

      {/* ── Row 2: Surfaces ── */}
      {surfaceCats.length > 0 && (
        <div className="w-full overflow-x-auto">
          <div className="flex items-end justify-center gap-4 px-2 min-w-max mx-auto">
            {surfaceCats.map((d) => renderDonut(d))}
          </div>
        </div>
      )}
    </div>
  );
}
