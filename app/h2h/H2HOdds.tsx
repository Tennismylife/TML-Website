"use client";

import React, { useState } from "react";

interface Player {
  id: string;
  atpname: string | null;
}

interface OddsMatch {
  date: string;
  tournament: string;
  surface: string;
  p1Odd: number;
  p2Odd: number;
  winner: 1 | 2;
}

interface Props {
  player1: Player;
  player2: Player;
  /** Real match list (dates + tournament) — odds will be populated from DB in future */
  matches?: { tourney_date?: Date | string | null; tourney_name?: string | null; surface?: string | null; winner_name?: string | null }[];
}

// ─── Mock data generator ────────────────────────────────────────────────────
function buildMockData(
  matches: Props["matches"],
  name1: string,
  name2: string
): OddsMatch[] {
  if (!matches || matches.length === 0) {
    // Fully synthetic dataset when no matches provided
    return [
      { date: "2018-06-10", tournament: "Roland Garros", surface: "Clay",  p1Odd: 1.45, p2Odd: 2.75, winner: 1 },
      { date: "2019-01-20", tournament: "Australian Open", surface: "Hard", p1Odd: 2.10, p2Odd: 1.70, winner: 2 },
      { date: "2019-07-07", tournament: "Wimbledon",       surface: "Grass",p1Odd: 1.80, p2Odd: 2.00, winner: 1 },
      { date: "2020-09-13", tournament: "Roland Garros",   surface: "Clay", p1Odd: 1.30, p2Odd: 3.40, winner: 1 },
      { date: "2021-02-21", tournament: "Australian Open", surface: "Hard", p1Odd: 2.40, p2Odd: 1.55, winner: 2 },
      { date: "2021-06-11", tournament: "Roland Garros",   surface: "Clay", p1Odd: 1.50, p2Odd: 2.60, winner: 1 },
      { date: "2022-07-03", tournament: "Wimbledon",       surface: "Grass",p1Odd: 1.65, p2Odd: 2.20, winner: 1 },
      { date: "2023-06-11", tournament: "Roland Garros",   surface: "Clay", p1Odd: 1.25, p2Odd: 4.00, winner: 2 },
    ];
  }

  // Generate quasi-realistic odds based on actual matches
  const sorted = [...matches]
    .filter((m) => m.tourney_date)
    .sort((a, b) => {
      const da = new Date(a.tourney_date as string).getTime();
      const db = new Date(b.tourney_date as string).getTime();
      return da - db;
    });

  return sorted.map((m, i) => {
    const seed = i * 7 + 3;
    const base = 1.3 + (seed % 14) * 0.1; // 1.30 → 2.70
    const p1Odd = +base.toFixed(2);
    const p2Odd = +(((base * (base - 1)) / (base - base / (base + 0.3))) || 2.0 - (base - 1.3) * 0.5 + 1.1).toFixed(2);
    const isP1Win = m.winner_name === name1;
    const date = m.tourney_date
      ? new Date(m.tourney_date as string).toISOString().slice(0, 10)
      : "—";
    return {
      date,
      tournament: m.tourney_name ?? "—",
      surface: m.surface ?? "—",
      p1Odd: isP1Win ? Math.min(p1Odd, p2Odd) : Math.max(p1Odd, p2Odd),
      p2Odd: isP1Win ? Math.max(p1Odd, p2Odd) : Math.min(p1Odd, p2Odd),
      winner: isP1Win ? 1 : 2,
    };
  });
}

// ─── Surface colour dot ──────────────────────────────────────────────────────
const surfaceColor: Record<string, string> = {
  Clay:  "#d97706",
  Hard:  "#3b82f6",
  Grass: "#22c55e",
  Carpet:"#a78bfa",
};

// ─── SVG Line chart ──────────────────────────────────────────────────────────
const W = 760, H = 280;
const PL = 50, PR = 20, PT = 24, PB = 50;
const CW = W - PL - PR;
const CH = H - PT - PB;

function oddsToY(odd: number, minO: number, maxO: number): number {
  return PT + CH - ((odd - minO) / (maxO - minO)) * CH;
}

interface ChartProps {
  data: OddsMatch[];
  name1: string;
  name2: string;
}

function OddsLineChart({ data, name1, name2 }: ChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const allOdds = data.flatMap((d) => [d.p1Odd, d.p2Odd]);
  const minO = Math.max(1, Math.floor((Math.min(...allOdds) - 0.2) * 10) / 10);
  const maxO = Math.ceil((Math.max(...allOdds) + 0.3) * 10) / 10;

  const xs = data.map((_, i) => PL + (i / Math.max(data.length - 1, 1)) * CW);

  const poly1 = data.map((d, i) => `${xs[i]},${oddsToY(d.p1Odd, minO, maxO)}`).join(" ");
  const poly2 = data.map((d, i) => `${xs[i]},${oddsToY(d.p2Odd, minO, maxO)}`).join(" ");

  const yTicks = 5;
  const yStep = (maxO - minO) / yTicks;

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ fontFamily: "inherit" }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Grid */}
        {Array.from({ length: yTicks + 1 }, (_, k) => {
          const val = minO + k * yStep;
          const y   = oddsToY(val, minO, maxO);
          return (
            <g key={k}>
              <line x1={PL} y1={y} x2={W - PR} y2={y} stroke="#374151" strokeWidth={0.5} strokeDasharray="4 3" />
              <text x={PL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PL} y1={PT} x2={PL} y2={PT + CH} stroke="#4b5563" strokeWidth={1} />
        <line x1={PL} y1={PT + CH} x2={W - PR} y2={PT + CH} stroke="#4b5563" strokeWidth={1} />

        {/* Lines */}
        <polyline points={poly1} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
        <polyline points={poly2} fill="none" stroke="#f87171" strokeWidth={2} strokeLinejoin="round" />

        {/* Dots + hover areas */}
        {data.map((d, i) => {
          const x  = xs[i];
          const y1 = oddsToY(d.p1Odd, minO, maxO);
          const y2 = oddsToY(d.p2Odd, minO, maxO);
          const isHov = hoverIdx === i;
          const sc = surfaceColor[d.surface] ?? "#6b7280";
          return (
            <g key={i}>
              {/* Vertical hover line */}
              {isHov && (
                <line x1={x} y1={PT} x2={x} y2={PT + CH} stroke="#6b7280" strokeWidth={1} strokeDasharray="3 2" />
              )}

              {/* Surface tick below x-axis */}
              <circle cx={x} cy={PT + CH + 10} r={4} fill={sc} opacity={0.8} />

              {/* P1 dot */}
              <circle
                cx={x} cy={y1} r={isHov ? 6 : 4}
                fill={d.winner === 1 ? "#60a5fa" : "#1e3a5f"}
                stroke={isHov ? "#93c5fd" : "#1e40af"}
                strokeWidth={1.5}
              />
              {/* P2 dot */}
              <circle
                cx={x} cy={y2} r={isHov ? 6 : 4}
                fill={d.winner === 2 ? "#f87171" : "#5a1a1a"}
                stroke={isHov ? "#fca5a5" : "#991b1b"}
                strokeWidth={1.5}
              />

              {/* Invisible hover target */}
              <rect
                x={x - 14} y={PT} width={28} height={CH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
                style={{ cursor: "default" }}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const x = xs[i];
          const year = d.date.slice(0, 4);
          return (
            <text key={i} x={x} y={PT + CH + 30} textAnchor="middle" fontSize={9} fill="#9ca3af">
              {year}
            </text>
          );
        })}

        {/* Hover tooltip */}
        {hoverIdx !== null && (() => {
          const d   = data[hoverIdx];
          const x   = xs[hoverIdx];
          const bx  = x + 10 > W - 160 ? x - 160 : x + 10;
          const by  = PT + 10;
          const sc  = surfaceColor[d.surface] ?? "#6b7280";
          return (
            <g pointerEvents="none">
              <rect x={bx} y={by} width={150} height={88} rx={6} fill="#1f2937" stroke="#374151" strokeWidth={1} />
              <text x={bx + 8} y={by + 16} fontSize={9} fill="#9ca3af">{d.date}</text>
              <text x={bx + 8} y={by + 29} fontSize={9} fontWeight={600} fill="#f3f4f6">{d.tournament}</text>
              <circle cx={bx + 8} cy={by + 41} r={4} fill={sc} />
              <text x={bx + 16} y={by + 45} fontSize={9} fill="#9ca3af">{d.surface}</text>
              {/* P1 */}
              <rect x={bx + 8} y={by + 52} width={8} height={8} rx={2} fill="#60a5fa" />
              <text x={bx + 20} y={by + 60} fontSize={9} fill="#93c5fd">
                {name1.split(" ").slice(-1)[0]}: {d.p1Odd.toFixed(2)}
                {d.winner === 1 ? " ✓" : ""}
              </text>
              {/* P2 */}
              <rect x={bx + 8} y={by + 65} width={8} height={8} rx={2} fill="#f87171" />
              <text x={bx + 20} y={by + 73} fontSize={9} fill="#fca5a5">
                {name2.split(" ").slice(-1)[0]}: {d.p2Odd.toFixed(2)}
                {d.winner === 2 ? " ✓" : ""}
              </text>
            </g>
          );
        })()}

        {/* Y-axis label */}
        <text
          x={14} y={PT + CH / 2} fontSize={10} fill="#6b7280"
          textAnchor="middle" dominantBaseline="middle"
          transform={`rotate(-90,14,${PT + CH / 2})`}
        >
          Odds
        </text>
      </svg>

      {/* Surface legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-1 text-xs text-gray-400">
        {Object.entries(surfaceColor).map(([s, c]) => (
          <span key={s} className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Table ───────────────────────────────────────────────────────────────────
function OddsTable({ data, name1, name2 }: ChartProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-gray-400 text-xs border-b border-gray-700">
            <th className="py-2 px-3 text-left font-medium">Date</th>
            <th className="py-2 px-3 text-left font-medium">Tournament</th>
            <th className="py-2 px-3 text-left font-medium">Surface</th>
            <th className="py-2 px-3 text-right font-medium text-blue-400">{name1.split(" ").slice(-1)[0]}</th>
            <th className="py-2 px-3 text-right font-medium text-red-400">{name2.split(" ").slice(-1)[0]}</th>
            <th className="py-2 px-3 text-left font-medium">Winner</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => {
            const sc = surfaceColor[d.surface] ?? "#6b7280";
            return (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                <td className="py-2 px-3 text-gray-400 text-xs">{d.date}</td>
                <td className="py-2 px-3 text-gray-200 text-xs">{d.tournament}</td>
                <td className="py-2 px-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: sc }} />
                    {d.surface}
                  </span>
                </td>
                <td className={`py-2 px-3 text-right font-mono ${d.winner === 1 ? "text-blue-300 font-semibold" : "text-gray-500"}`}>
                  {d.p1Odd.toFixed(2)} {d.winner === 1 && "✓"}
                </td>
                <td className={`py-2 px-3 text-right font-mono ${d.winner === 2 ? "text-red-300 font-semibold" : "text-gray-500"}`}>
                  {d.p2Odd.toFixed(2)} {d.winner === 2 && "✓"}
                </td>
                <td className="py-2 px-3 text-xs text-gray-300">
                  {d.winner === 1 ? name1.split(" ").slice(-1)[0] : name2.split(" ").slice(-1)[0]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function H2HOdds({ player1, player2, matches }: Props) {
  const [view, setView] = useState<"chart" | "table">("chart");

  const name1 = player1.atpname ?? "";
  const name2 = player2.atpname ?? "";
  const data   = buildMockData(matches, name1, name2);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-amber-400 tracking-tight">Betting Odds</h2>
        {/* View toggle */}
        <div className="flex gap-2">
          {(["chart", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={
                view === v
                  ? "bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full"
                  : "text-gray-400 hover:text-blue-400 text-xs px-3 py-1 rounded-full border border-gray-700"
              }
            >
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>
      </div>

      {/* Mock data notice */}
      <div className="flex items-center gap-2 text-xs text-amber-500/80 bg-amber-950/30 border border-amber-800/40 rounded-lg px-4 py-2">
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
        </svg>
        Dati illustrativi (mock) — i dati reali sulle quote verranno integrati in una fase successiva.
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-blue-400" />
          <span className="text-blue-300">{name1}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-6 h-0.5 bg-red-400" />
          <span className="text-red-300">{name2}</span>
        </span>
        <span className="text-gray-500">Solid dot = winner · hollow = loser</span>
      </div>

      {data.length === 0 ? (
        <p className="text-center text-gray-500 py-12 text-sm">Nessun match disponibile.</p>
      ) : view === "chart" ? (
        <OddsLineChart data={data} name1={name1} name2={name2} />
      ) : (
        <OddsTable data={data} name1={name1} name2={name2} />
      )}
    </div>
  );
}
