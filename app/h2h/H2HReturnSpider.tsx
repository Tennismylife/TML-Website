"use client";

import React, { useState } from "react";

interface Player {
  id: string;
  atpname: string | null;
}

interface Match {
  winner_id: string | null;
  loser_id: string | null;
  winner_name: string | null;
  loser_name: string | null;
  surface: string | null;
  tourney_level: string | null;
  w_svpt?: number | null;
  l_svpt?: number | null;
  w_1stIn?: number | null;
  l_1stIn?: number | null;
  w_1stWon?: number | null;
  l_1stWon?: number | null;
  w_2ndWon?: number | null;
  l_2ndWon?: number | null;
  w_bpSaved?: number | null;
  l_bpSaved?: number | null;
  w_bpFaced?: number | null;
  l_bpFaced?: number | null;
  w_SvGms?: number | null;
  l_SvGms?: number | null;
  w_ace?: number | null;
  l_ace?: number | null;
  w_df?: number | null;
  l_df?: number | null;
}

interface Props {
  matches: Match[];
  player1: Player;
  player2: Player;
}

type StatKey = "1stRetWon" | "2ndRetWon" | "retPtsWon" | "bpWon" | "retGmsWon" | "aceAgainst" | "dfAgainst";

interface StatDef {
  key: StatKey;
  label: string;
  /** Max value for spider polygon normalization (default 100) */
  spiderMax?: number;
}

const STATS: StatDef[] = [
  { key: "1stRetWon",  label: "1st Ret Won %" },
  { key: "2ndRetWon",  label: "2nd Ret Won %" },
  { key: "retPtsWon",  label: "Ret Pts Won %" },
  { key: "bpWon",      label: "BP Won %" },
  { key: "retGmsWon",  label: "Ret Gms Won %" },
  { key: "aceAgainst", label: "Ace Against %",        spiderMax: 20 },
  { key: "dfAgainst",  label: "Double Fault Against %", spiderMax: 8  },
];

function computeReturnStat(matches: Match[], player: Player, key: StatKey): number {
  const name = player.atpname;
  if (!name) return 0;

  // Accumulate the OPPONENT's serve stats (that's what the returner faces)
  let oSvpt = 0, oFirstIn = 0, oFirstWon = 0, oSecondWon = 0;
  let oBpSaved = 0, oBpFaced = 0, oSvGms = 0, oAce = 0, oDf = 0;

  matches.forEach((m) => {
    const isWinner = m.winner_name === name;
    const isLoser  = m.loser_name  === name;
    if (!isWinner && !isLoser) return;

    if (isWinner) {
      // player won → opponent is the loser, use l_* fields
      oSvpt      += m.l_svpt    ?? 0;
      oFirstIn   += m.l_1stIn   ?? 0;
      oFirstWon  += m.l_1stWon  ?? 0;
      oSecondWon += m.l_2ndWon  ?? 0;
      oBpSaved   += m.l_bpSaved ?? 0;
      oBpFaced   += m.l_bpFaced ?? 0;
      oSvGms     += m.l_SvGms   ?? 0;
      oAce       += m.l_ace     ?? 0;
      oDf        += m.l_df      ?? 0;
    } else {
      // player lost → opponent is the winner, use w_* fields
      oSvpt      += m.w_svpt    ?? 0;
      oFirstIn   += m.w_1stIn   ?? 0;
      oFirstWon  += m.w_1stWon  ?? 0;
      oSecondWon += m.w_2ndWon  ?? 0;
      oBpSaved   += m.w_bpSaved ?? 0;
      oBpFaced   += m.w_bpFaced ?? 0;
      oSvGms     += m.w_SvGms   ?? 0;
      oAce       += m.w_ace     ?? 0;
      oDf        += m.w_df      ?? 0;
    }
  });

  if (oSvpt === 0) return 0;
  const oSecondSvpt = oSvpt - oFirstIn;

  switch (key) {
    case "1stRetWon":
      return oFirstIn > 0
        ? +(((oFirstIn - oFirstWon) / oFirstIn) * 100).toFixed(2)
        : 0;
    case "2ndRetWon":
      return oSecondSvpt > 0
        ? +(((oSecondSvpt - oSecondWon) / oSecondSvpt) * 100).toFixed(2)
        : 0;
    case "retPtsWon":
      return +((( oSvpt - oFirstWon - oSecondWon) / oSvpt) * 100).toFixed(2);
    case "bpWon":
      return oBpFaced > 0
        ? +(((oBpFaced - oBpSaved) / oBpFaced) * 100).toFixed(2)
        : 0;
    case "retGmsWon":
      return oSvGms > 0
        ? +(((oBpFaced - oBpSaved) / oSvGms) * 100).toFixed(2)
        : 0;
    case "aceAgainst":
      return +((oAce / oSvpt) * 100).toFixed(2);
    case "dfAgainst":
      return +((oDf  / oSvpt) * 100).toFixed(2);
  }
}

export default function H2HReturnSpider({ matches, player1, player2 }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    label: string; p1: number; p2: number;
  } | null>(null);
  const [barTooltip, setBarTooltip] = useState<{
    idx: number; x: number; y: number;
  } | null>(null);

  const SIZE   = 560;
  const cx     = SIZE / 2;
  const cy     = SIZE / 2;
  const MAX_R  = SIZE / 2 - 90;
  const RINGS  = [25, 50, 75, 100];
  const N      = STATS.length;

  const statVals = STATS.map(({ key }) => ({
    p1: computeReturnStat(matches, player1, key),
    p2: computeReturnStat(matches, player2, key),
  }));

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

  const p1Points = polygon(statVals.map((s) => s.p1));
  const p2Points = polygon(statVals.map((s) => s.p2));

  return (
    <div style={{ width: "100%" }}>
      <h2 className="text-center text-3xl font-bold text-amber-400 mb-5 tracking-tight">Return comparison</h2>
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

            {/* ring % labels — along top axis */}
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

            {/* filled polygons */}
            <polygon
              points={p2Points}
              fill="#f87171"
              fillOpacity={0.25}
              stroke="#f87171"
              strokeWidth={1.5}
            />
            <polygon
              points={p1Points}
              fill="#60a5fa"
              fillOpacity={0.25}
              stroke="#60a5fa"
              strokeWidth={1.5}
            />

            {/* dots + hover areas */}
            {statVals.map(({ p1, p2 }, i) => {
              const r1 = (p1 / 100) * MAX_R;
              const r2 = (p2 / 100) * MAX_R;
              const pt1 = point(r1, i);
              const pt2 = point(r2, i);
              const { label } = STATS[i];

              const handleEnter = (e: React.MouseEvent<SVGCircleElement>) => {
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, label, p1, p2 });
              };

              const lblR = MAX_R + 36;
              const lbl = point(lblR, i);
              const parts = label.split(" ");
              const line1 = parts.slice(0, Math.ceil(parts.length / 2)).join(" ");
              const line2 = parts.slice(Math.ceil(parts.length / 2)).join(" ");

              return (
                <g key={i}>
                  <circle cx={pt1.x} cy={pt1.y} r={4} fill="#60a5fa"
                    onMouseEnter={handleEnter} onMouseMove={handleEnter} style={{ cursor: "default" }} />
                  <circle cx={pt2.x} cy={pt2.y} r={4} fill="#f87171"
                    onMouseEnter={handleEnter} onMouseMove={handleEnter} style={{ cursor: "default" }} />
                  <text x={lbl.x} y={line2 ? lbl.y - 9 : lbl.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#d1d5db" fontSize={12} fontWeight={600}>{line1}</text>
                  {line2 && (
                    <text x={lbl.x} y={lbl.y + 9}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#d1d5db" fontSize={12} fontWeight={600}>{line2}</text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* tooltip */}
          {tooltip && (
            <div style={{
              position: "absolute",
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              pointerEvents: "none",
              backgroundColor: "#111827",
              border: "1px solid #374151",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13,
              zIndex: 10,
            }}>
              <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4 }}>{tooltip.label}</p>
              <p style={{ color: "#60a5fa", margin: "2px 0" }}>
                {player1.atpname}: <strong>{tooltip.p1}%</strong>
              </p>
              <p style={{ color: "#f87171", margin: "2px 0" }}>
                {player2.atpname}: <strong>{tooltip.p2}%</strong>
              </p>
            </div>
          )}

          {/* legend */}
          <div className="flex items-center justify-center gap-8 mt-2">
            <div className="flex items-center gap-2">
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, backgroundColor: "#60a5fa" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa" }}>{player1.atpname}</span>
            </div>
            <div className="flex items-center gap-2">
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, backgroundColor: "#f87171" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>{player2.atpname}</span>
            </div>
          </div>
        </div>

        {/* ── Bar chart ── */}
        <div data-barchart style={{ flex: 1, minWidth: 0, position: "relative" }}
          onMouseLeave={() => setBarTooltip(null)}
        >
          {statVals.map(({ p1, p2 }, i) => {
            const { label } = STATS[i];
            const BAR_H = 22;
            const MAX_W = 480;
            return (
              <div key={i} style={{ marginBottom: 14, cursor: "default" }}
                onMouseMove={(e) => {
                  const rect = (e.currentTarget.closest('[data-barchart]') as HTMLElement).getBoundingClientRect();
                  setBarTooltip({ idx: i, x: e.clientX - rect.left, y: e.clientY - rect.top });
                }}
              >
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>{label}</div>
                {/* player 1 */}
                <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                  <div style={{ width: Math.round((p1 / 100) * MAX_W), height: BAR_H, backgroundColor: "#60a5fa", borderRadius: 3, minWidth: 2 }} />
                  <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{p1}%</span>
                </div>
                {/* player 2 */}
                <div className="flex items-center gap-2">
                  <div style={{ width: Math.round((p2 / 100) * MAX_W), height: BAR_H, backgroundColor: "#f87171", borderRadius: 3, minWidth: 2 }} />
                  <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>{p2}%</span>
                </div>
              </div>
            );
          })}
          {barTooltip && (() => {
            const { label } = STATS[barTooltip.idx];
            const { p1, p2 } = statVals[barTooltip.idx];
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
                <p style={{ color: "#60a5fa", margin: "2px 0" }}>{player1.atpname}: <strong>{p1}%</strong></p>
                <p style={{ color: "#f87171", margin: "2px 0" }}>{player2.atpname}: <strong>{p2}%</strong></p>
              </div>
            );
          })()}
          {/* bar legend */}
          <div className="flex gap-4 mt-2">
            <div className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 2, backgroundColor: "#60a5fa" }} />
              <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{player1.atpname}</span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 2, backgroundColor: "#f87171" }} />
              <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>{player2.atpname}</span>
            </div>
          </div>
        </div>

      </div>{/* end flex */}
    </div>
  );
}
