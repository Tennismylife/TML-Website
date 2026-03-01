"use client";

import React, { useState } from "react";

interface Match {
  winner_id: string | null;
  loser_id: string | null;
  w_svpt?: number | null;
  w_1stIn?: number | null;
  w_1stWon?: number | null;
  w_2ndWon?: number | null;
  w_bpSaved?: number | null;
  w_bpFaced?: number | null;
  w_SvGms?: number | null;
  w_ace?: number | null;
  w_df?: number | null;
  l_svpt?: number | null;
  l_1stIn?: number | null;
  l_1stWon?: number | null;
  l_2ndWon?: number | null;
  l_bpSaved?: number | null;
  l_bpFaced?: number | null;
  l_SvGms?: number | null;
  l_ace?: number | null;
  l_df?: number | null;
}

interface Props {
  matches: Match[];
  playerId: string;
  playerName: string;
}

type StatKey = "1stIn" | "1stWon" | "2ndWon" | "svcWon" | "bpSaved" | "svcGmsWon" | "ace" | "df";

interface StatDef {
  key: StatKey;
  label: string;
  spiderMax?: number;
}

const STATS: StatDef[] = [
  { key: "1stIn",     label: "1st Serve %" },
  { key: "1stWon",    label: "1st Srv Won %" },
  { key: "2ndWon",    label: "2nd Srv Won %" },
  { key: "svcWon",    label: "Svc Pts Won %" },
  { key: "bpSaved",   label: "BP Saved %" },
  { key: "svcGmsWon", label: "Svc Gms Won %" },
  { key: "ace",       label: "Ace %",          spiderMax: 20 },
  { key: "df",        label: "Double Fault %", spiderMax: 8  },
];

function computeStat(matches: Match[], playerId: string, key: StatKey): number {
  let svpt = 0, firstIn = 0, firstWon = 0, secondWon = 0;
  let bpSaved = 0, bpFaced = 0, svGms = 0, ace = 0, df = 0;

  matches.forEach((m) => {
    const isWinner = m.winner_id != null && String(m.winner_id) === playerId;
    const isLoser  = m.loser_id  != null && String(m.loser_id)  === playerId;
    if (!isWinner && !isLoser) return;

    if (isWinner) {
      svpt      += m.w_svpt    ?? 0;
      firstIn   += m.w_1stIn   ?? 0;
      firstWon  += m.w_1stWon  ?? 0;
      secondWon += m.w_2ndWon  ?? 0;
      bpSaved   += m.w_bpSaved ?? 0;
      bpFaced   += m.w_bpFaced ?? 0;
      svGms     += m.w_SvGms   ?? 0;
      ace       += m.w_ace     ?? 0;
      df        += m.w_df      ?? 0;
    } else {
      svpt      += m.l_svpt    ?? 0;
      firstIn   += m.l_1stIn   ?? 0;
      firstWon  += m.l_1stWon  ?? 0;
      secondWon += m.l_2ndWon  ?? 0;
      bpSaved   += m.l_bpSaved ?? 0;
      bpFaced   += m.l_bpFaced ?? 0;
      svGms     += m.l_SvGms   ?? 0;
      ace       += m.l_ace     ?? 0;
      df        += m.l_df      ?? 0;
    }
  });

  if (svpt === 0) return 0;
  const secondSvpt = svpt - firstIn;

  switch (key) {
    case "1stIn":     return +((firstIn / svpt) * 100).toFixed(2);
    case "1stWon":    return firstIn    > 0 ? +((firstWon  / firstIn)    * 100).toFixed(2) : 0;
    case "2ndWon":    return secondSvpt > 0 ? +((secondWon / secondSvpt) * 100).toFixed(2) : 0;
    case "svcWon":    return +(((firstWon + secondWon) / svpt) * 100).toFixed(2);
    case "bpSaved":   return bpFaced > 0 ? +((bpSaved / bpFaced) * 100).toFixed(2) : 0;
    case "svcGmsWon": return svGms > 0 ? +(((svGms - (bpFaced - bpSaved)) / svGms) * 100).toFixed(2) : 0;
    case "ace":       return +((ace / svpt) * 100).toFixed(2);
    case "df":        return +((df  / svpt) * 100).toFixed(2);
  }
}

const BAR_COLOR = "#60a5fa";

export default function PlayerServiceSpider({ matches, playerId, playerName }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; label: string; val: number;
  } | null>(null);
  const [barTooltip, setBarTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);

  const SIZE  = 800;
  const cx    = SIZE / 2;
  const cy    = SIZE / 2;
  const MAX_R = SIZE / 2 - 90;
  const RINGS = [25, 50, 75, 100];
  const N     = STATS.length;

  const statVals = STATS.map(({ key }) => computeStat(matches, playerId, key));

  // no data guard
  const hasData = statVals.some((v) => v > 0);

  function angle(i: number) {
    return (i / N) * 2 * Math.PI - Math.PI / 2;
  }

  function point(r: number, i: number) {
    const a = angle(i);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  }

  function polygon(vals: number[]) {
    return vals
      .map((v, i) => {
        const max = STATS[i].spiderMax ?? 100;
        const r = (v / max) * MAX_R;
        const p = point(r, i);
        return `${p.x},${p.y}`;
      })
      .join(" ");
  }

  const polyPoints = polygon(statVals);

  if (!hasData) {
    return (
      <div style={{ width: "100%" }}>
        <h2 className="text-center text-3xl font-bold text-amber-400 mb-5 tracking-tight">Service Statistics</h2>
        <p className="text-center text-gray-400 text-sm">No service stats available for this season.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <h2 className="text-center text-3xl font-bold text-amber-400 mb-5 tracking-tight">Service Statistics</h2>
      <div className="flex flex-wrap gap-6 items-start justify-center">

        {/* ── Spider chart ── */}
        <div className="relative select-none" style={{ flex: 1, minWidth: 0 }}>
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            width="100%"
            style={{ display: "block" }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* grid rings */}
            {RINGS.map((pct) => {
              const r = (pct / 100) * MAX_R;
              const pts = Array.from({ length: N }, (_, i) => {
                const p = point(r, i);
                return `${p.x},${p.y}`;
              }).join(" ");
              return (
                <polygon
                  key={pct}
                  points={pts}
                  fill="none"
                  stroke="#374151"
                  strokeWidth={0.8}
                />
              );
            })}

            {/* ring % labels */}
            {RINGS.map((pct) => {
              const r = (pct / 100) * MAX_R;
              return (
                <text
                  key={pct}
                  x={cx + 3}
                  y={cy - r + 1}
                  fill="#6b7280"
                  fontSize={11}
                  dominantBaseline="text-after-edge"
                >{pct}%</text>
              );
            })}

            {/* spokes */}
            {STATS.map((_, i) => {
              const outer = point(MAX_R, i);
              return (
                <line
                  key={i}
                  x1={cx} y1={cy}
                  x2={outer.x} y2={outer.y}
                  stroke="#374151"
                  strokeWidth={0.8}
                />
              );
            })}

            {/* filled polygon */}
            <polygon
              points={polyPoints}
              fill={BAR_COLOR}
              fillOpacity={0.25}
              stroke={BAR_COLOR}
              strokeWidth={1.5}
            />

            {/* dots + axis labels */}
            {statVals.map((val, i) => {
              const max = STATS[i].spiderMax ?? 100;
              const r   = (val / max) * MAX_R;
              const pt  = point(r, i);
              const { label } = STATS[i];

              const handleEnter = (e: React.MouseEvent<SVGCircleElement>) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label, val });
              };

              const lblR  = MAX_R + 36;
              const lbl   = point(lblR, i);
              const parts = label.split(" ");
              const line1 = parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
              const line2 = parts.slice(Math.ceil(parts.length / 2)).join(" ");

              return (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r={4} fill={BAR_COLOR}
                    onMouseEnter={handleEnter} onMouseMove={handleEnter} style={{ cursor: "default" }} />
                  <text x={lbl.x} y={line2 ? lbl.y - 16 : lbl.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#d1d5db" fontSize={24} fontWeight={600}>{line1}</text>
                  {line2 && (
                    <text x={lbl.x} y={lbl.y + 16}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#d1d5db" fontSize={24} fontWeight={600}>{line2}</text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* spider tooltip */}
          {tooltip && (
            <div style={{
              position: "absolute",
              left: tooltip.x + 12, top: tooltip.y - 10,
              pointerEvents: "none",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: 8, padding: "8px 12px",
              fontSize: 13, zIndex: 10,
            }}>
              <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4 }}>{tooltip.label}</p>
              <p style={{ color: BAR_COLOR, margin: "2px 0" }}>
                {playerName}: <strong>{tooltip.val}%</strong>
              </p>
            </div>
          )}


        </div>

        {/* ── Bar chart ── */}
        <div data-barchart style={{ flex: 1, minWidth: 0, position: "relative" }}
          onMouseLeave={() => setBarTooltip(null)}
        >
          {STATS.map(({ label, spiderMax }, i) => {
            const val = statVals[i];
            const max = spiderMax ?? 100;
            const BAR_H = 22;
            const MAX_W = 480;
            return (
              <div key={i} style={{ marginBottom: 14, cursor: "default" }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.closest("[data-barchart]") as HTMLElement).getBoundingClientRect();
                  setBarTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
              >
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <div className="flex items-center gap-2">
                  <div style={{
                    width: Math.round(Math.min(val / max, 1) * MAX_W),
                    height: BAR_H,
                    backgroundColor: BAR_COLOR,
                    borderRadius: 3,
                    minWidth: 2,
                  }} />
                  <span style={{ fontSize: 13, color: BAR_COLOR, fontWeight: 600 }}>{val}%</span>
                </div>
              </div>
            );
          })}

          {barTooltip && (() => {
            const { label } = STATS[barTooltip.idx];
            const val = statVals[barTooltip.idx];
            return (
              <div style={{
                position: "absolute",
                left: barTooltip.x + 14, top: barTooltip.y - 10,
                pointerEvents: "none",
                backgroundColor: "#111827",
                border: "1px solid #374151",
                borderRadius: 8, padding: "8px 12px",
                fontSize: 13, zIndex: 20, minWidth: 180,
              }}>
                <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4 }}>{label}</p>
                <p style={{ color: BAR_COLOR, margin: "2px 0" }}>
                  {playerName}: <strong>{val}%</strong>
                </p>
              </div>
            );
          })()}


        </div>

      </div>{/* end flex */}
    </div>
  );
}
