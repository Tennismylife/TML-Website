"use client";

import React, { useState } from "react";

interface Player {
  id: string;
  atpname: string | null;
}

interface Match {
  winner_name: string | null;
  loser_name: string | null;
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
  w_ace?: number | null;
  l_ace?: number | null;
  w_df?: number | null;
  l_df?: number | null;
  w_SvGms?: number | null;
  l_SvGms?: number | null;
}

interface Props {
  matches: Match[];
  player1: Player;
  player2: Player;
}

type MetricKey = "totalPtsWon" | "domRatio" | "firstSrvEff" | "secondSrvVuln" | "pressurePerf" | "netRating" | "serveRating" | "returnRating";

interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string[];
  description: string;
  min: number;
  max: number;
  higherIsBetter: boolean;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  {
    key: "totalPtsWon",
    label: "Total Pts Won %",
    shortLabel: ["Total Pts", "Won %"],
    description: "% of all points won (serve + return)",
    min: 30, max: 70,
    higherIsBetter: true,
    format: (v) => v.toFixed(1) + "%",
  },
  {
    key: "domRatio",
    label: "Dominance Ratio",
    shortLabel: ["Dominance", "Ratio"],
    description: "Return pts won % Ã· (100 âˆ’ Svc pts won %)",
    min: 0.3, max: 2.5,
    higherIsBetter: true,
    format: (v) => v.toFixed(2),
  },
  {
    key: "firstSrvEff",
    label: "1st Srv Efficiency",
    shortLabel: ["1st Srv", "Efficiency"],
    description: "% of all serve pts won on 1st serve",
    min: 15, max: 65,
    higherIsBetter: true,
    format: (v) => v.toFixed(1) + "%",
  },
  {
    key: "secondSrvVuln",
    label: "2nd Srv Vulnerability",
    shortLabel: ["2nd Srv", "Vulnerability"],
    description: "% of serve pts where 1st missed AND 2nd lost",
    min: 0, max: 40,
    higherIsBetter: false,
    format: (v) => v.toFixed(1) + "%",
  },
  {
    key: "pressurePerf",
    label: "Pressure Performance",
    shortLabel: ["Pressure", "Perf."],
    description: "Avg of BP Saved % and BP Won %",
    min: 20, max: 80,
    higherIsBetter: true,
    format: (v) => v.toFixed(1) + "%",
  },
  {
    key: "netRating",
    label: "Net Rating",
    shortLabel: ["Net", "Rating"],
    description: "Svc pts won % + Ret pts won % âˆ’ 100",
    min: -40, max: 40,
    higherIsBetter: true,
    format: (v) => (v >= 0 ? "+" : "") + v.toFixed(1),
  },  {
    key: "serveRating",
    label: "Serve Rating",
    shortLabel: ["Serve", "Rating"],
    description: "Ace% − DF% + 1stIn% + 1stWon% + 2ndWon% + BPSaved% + SvcGmsWon%",
    min: 240, max: 430,
    higherIsBetter: true,
    format: (v) => v.toFixed(1),
  },
  {
    key: "returnRating",
    label: "Return Rating",
    shortLabel: ["Return", "Rating"],
    description: "1stRetWon% + 2ndRetWon% + BPConverted% + RetGmsWon%",
    min: 90, max: 200,
    higherIsBetter: true,
    format: (v) => v.toFixed(1),
  },
];

function collectStats(matches: Match[], name: string) {
  let svpt = 0, firstIn = 0, firstWon = 0, secondWon = 0, bpSaved = 0, bpFaced = 0;
  let ace = 0, df = 0, svGms = 0;
  let oSvpt = 0, oFirstIn = 0, oFirstWon = 0, oSecondWon = 0, oBpSaved = 0, oBpFaced = 0, oSvGms = 0;

  matches.forEach((m) => {
    const isW = m.winner_name === name;
    const isL = m.loser_name === name;
    if (!isW && !isL) return;

    if (isW) {
      svpt      += m.w_svpt    ?? 0;  firstIn   += m.w_1stIn   ?? 0;
      firstWon  += m.w_1stWon  ?? 0;  secondWon += m.w_2ndWon  ?? 0;
      bpSaved   += m.w_bpSaved ?? 0;  bpFaced   += m.w_bpFaced ?? 0;
      ace       += m.w_ace     ?? 0;  df        += m.w_df      ?? 0;
      svGms     += m.w_SvGms   ?? 0;
      oSvpt     += m.l_svpt    ?? 0;  oFirstIn  += m.l_1stIn   ?? 0;
      oFirstWon += m.l_1stWon  ?? 0;  oSecondWon+= m.l_2ndWon  ?? 0;
      oBpSaved  += m.l_bpSaved ?? 0;  oBpFaced  += m.l_bpFaced ?? 0;
      oSvGms    += m.l_SvGms   ?? 0;
    } else {
      svpt      += m.l_svpt    ?? 0;  firstIn   += m.l_1stIn   ?? 0;
      firstWon  += m.l_1stWon  ?? 0;  secondWon += m.l_2ndWon  ?? 0;
      bpSaved   += m.l_bpSaved ?? 0;  bpFaced   += m.l_bpFaced ?? 0;
      ace       += m.l_ace     ?? 0;  df        += m.l_df      ?? 0;
      svGms     += m.l_SvGms   ?? 0;
      oSvpt     += m.w_svpt    ?? 0;  oFirstIn  += m.w_1stIn   ?? 0;
      oFirstWon += m.w_1stWon  ?? 0;  oSecondWon+= m.w_2ndWon  ?? 0;
      oBpSaved  += m.w_bpSaved ?? 0;  oBpFaced  += m.w_bpFaced ?? 0;
      oSvGms    += m.w_SvGms   ?? 0;
    }
  });

  return { svpt, firstIn, firstWon, secondWon, bpSaved, bpFaced, ace, df, svGms, oSvpt, oFirstIn, oFirstWon, oSecondWon, oBpSaved, oBpFaced, oSvGms };
}

function computeAll(s: ReturnType<typeof collectStats>): Record<MetricKey, number> {
  const { svpt, firstIn, firstWon, secondWon, bpSaved, bpFaced, ace, df, svGms, oSvpt, oFirstIn, oFirstWon, oSecondWon, oBpSaved, oBpFaced, oSvGms } = s;

  const secondSvpt   = svpt - firstIn;
  const svcPtsWon    = svpt  > 0 ? (firstWon + secondWon) / svpt * 100 : 0;
  const retPtsWon    = oSvpt > 0 ? (oSvpt - oFirstWon - oSecondWon) / oSvpt * 100 : 0;
  const totalPtsWon  = (svpt + oSvpt) > 0
    ? (firstWon + secondWon + oSvpt - oFirstWon - oSecondWon) / (svpt + oSvpt) * 100
    : 0;
  const domRatio     = (100 - svcPtsWon) > 0 ? retPtsWon / (100 - svcPtsWon) : 0;
  const firstSrvEff  = svpt > 0 ? (firstWon / svpt) * 100 : 0;
  const secondSrvVuln = svpt > 0 && secondSvpt > 0
    ? ((svpt - firstIn) / svpt) * ((secondSvpt - secondWon) / secondSvpt) * 100
    : 0;
  const bpWon        = oBpFaced > 0 ? (oBpFaced - oBpSaved) / oBpFaced * 100 : 0;
  const bpSavedPct   = bpFaced  > 0 ? bpSaved / bpFaced * 100 : 0;
  const pressurePerf = (bpFaced > 0 || oBpFaced > 0)
    ? ((bpFaced > 0 ? bpSavedPct : 0) + (oBpFaced > 0 ? bpWon : 0)) / 2
    : 0;
  const netRating    = svcPtsWon + retPtsWon - 100;

  const acePct        = svpt > 0 ? ace / svpt * 100 : 0;
  const dfPct         = svpt > 0 ? df  / svpt * 100 : 0;
  const firstInPct    = svpt > 0 ? firstIn / svpt * 100 : 0;
  const firstWonPct   = firstIn > 0 ? firstWon / firstIn * 100 : 0;
  const secondWonPct  = secondSvpt > 0 ? secondWon / secondSvpt * 100 : 0;
  const svcGmsWonPct  = svGms > 0 ? (svGms - (bpFaced - bpSaved)) / svGms * 100 : 0;
  const serveRating   = acePct - dfPct + firstInPct + firstWonPct + secondWonPct + bpSavedPct + svcGmsWonPct;

  const oSecondSvpt      = oSvpt - oFirstIn;
  const firstRetWonPct   = oFirstIn > 0 ? (oFirstIn - oFirstWon) / oFirstIn * 100 : 0;
  const secondRetWonPct  = oSecondSvpt > 0 ? (oSecondSvpt - oSecondWon) / oSecondSvpt * 100 : 0;
  const bpConvertedPct   = oBpFaced > 0 ? (oBpFaced - oBpSaved) / oBpFaced * 100 : 0;
  const retGmsWonPct     = oSvGms > 0 ? (oBpFaced - oBpSaved) / oSvGms * 100 : 0;
  const returnRating     = firstRetWonPct + secondRetWonPct + bpConvertedPct + retGmsWonPct;

  return {
    totalPtsWon:   +totalPtsWon.toFixed(2),
    domRatio:      +domRatio.toFixed(3),
    firstSrvEff:   +firstSrvEff.toFixed(2),
    secondSrvVuln: +secondSrvVuln.toFixed(2),
    pressurePerf:  +pressurePerf.toFixed(2),
    netRating:     +netRating.toFixed(2),
    serveRating:   +serveRating.toFixed(2),
    returnRating:  +returnRating.toFixed(2),
  };
}

function norm(value: number, min: number, max: number): number {
  return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
}

export default function H2HAdvancedMetrics({ matches, player1, player2 }: Props) {
  const [tooltip, setTooltip] = useState<{
    x: number; y: number;
    metricIdx: number;
  } | null>(null);
  const [barTooltip, setBarTooltip] = useState<{
    idx: number; x: number; y: number;
  } | null>(null);

  const name1 = player1.atpname ?? "";
  const name2 = player2.atpname ?? "";

  const s1 = collectStats(matches, name1);
  const s2 = collectStats(matches, name2);
  const vals1 = computeAll(s1);
  const vals2 = computeAll(s2);

  const hasData = s1.svpt > 0 || s2.svpt > 0;

  // Chart dimensions
  const W      = 800;
  const H      = 340;
  const PAD_L  = 52;
  const PAD_R  = 20;
  const PAD_T  = 24;
  const PAD_B  = 60;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const N      = METRICS.length;
  const YGRID  = [0, 25, 50, 75, 100];

  function xFor(i: number) {
    return PAD_L + (i / (N - 1)) * chartW;
  }
  function yFor(normVal: number) {
    return PAD_T + chartH - (normVal / 100) * chartH;
  }

  const pts1 = METRICS.map(({ key, min, max }, i) =>
    `${xFor(i)},${yFor(norm(vals1[key], min, max))}`
  ).join(" ");
  const pts2 = METRICS.map(({ key, min, max }, i) =>
    `${xFor(i)},${yFor(norm(vals2[key], min, max))}`
  ).join(" ");

  return (
    <div style={{ width: "100%" }}>
      <h2 className="text-center text-3xl font-bold text-amber-400 mb-3 tracking-tight">Advanced Metrics</h2>
      <p className="text-center text-xs text-gray-500 mb-4">
        Line chart: position within each metric's expected range (0 = min, 100 = max). Hover dots for values.
      </p>

      {!hasData && (
        <p className="text-center text-gray-500 text-sm">No serve data available for these matches.</p>
      )}

      {hasData && (
        <div className="flex flex-wrap gap-6 items-start justify-center">

          {/* ── Line chart ── */}
          <div style={{ flex: "1 1 480px", minWidth: 0, position: "relative" }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              width="100%"
              style={{ display: "block", overflow: "visible" }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Y grid lines + labels */}
              {YGRID.map((pct) => {
                const y = yFor(pct);
                return (
                  <g key={pct}>
                    <line
                      x1={PAD_L} y1={y} x2={W - PAD_R} y2={y}
                      stroke={pct === 0 ? "#4b5563" : "#1f2937"}
                      strokeWidth={pct === 0 ? 1 : 0.8}
                      strokeDasharray={pct === 0 ? undefined : "4 3"}
                    />
                    <text x={PAD_L - 6} y={y} textAnchor="end" dominantBaseline="middle"
                      fill="#6b7280" fontSize={11}>{pct}</text>
                  </g>
                );
              })}

              {/* X vertical guides + bottom axis */}
              {METRICS.map((_, i) => (
                <line key={i}
                  x1={xFor(i)} y1={PAD_T} x2={xFor(i)} y2={PAD_T + chartH}
                  stroke="#1f2937" strokeWidth={0.8} strokeDasharray="3 3"
                />
              ))}
              <line x1={PAD_L} y1={PAD_T + chartH} x2={W - PAD_R} y2={PAD_T + chartH}
                stroke="#4b5563" strokeWidth={1} />

              {/* X axis labels (two lines) */}
              {METRICS.map(({ shortLabel }, i) => (
                <g key={i}>
                  {shortLabel.map((ln, li) => (
                    <text key={li}
                      x={xFor(i)} y={PAD_T + chartH + 16 + li * 14}
                      textAnchor="middle" fill="#9ca3af" fontSize={11} fontWeight={600}
                    >{ln}</text>
                  ))}
                </g>
              ))}

              {/* Lines */}
              <polyline points={pts2} fill="none" stroke="#f87171" strokeWidth={2}
                strokeLinejoin="round" strokeLinecap="round" />
              <polyline points={pts1} fill="none" stroke="#60a5fa" strokeWidth={2}
                strokeLinejoin="round" strokeLinecap="round" />

              {/* Dots */}
              {METRICS.map(({ key, min, max }, i) => {
                const v1 = vals1[key]; const v2 = vals2[key];
                const x  = xFor(i);
                const y1 = yFor(norm(v1, min, max));
                const y2 = yFor(norm(v2, min, max));

                const onEnter = (e: React.MouseEvent<SVGCircleElement>) => {
                  const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                  setTooltip({ x: e.clientX - rect.left, y: e.clientY - rect.top, metricIdx: i });
                };

                return (
                  <g key={key}>
                    <circle cx={x} cy={y2} r={5} fill="#f87171" stroke="#0f172a" strokeWidth={1.5}
                      style={{ cursor: "pointer" }} onMouseEnter={onEnter} onMouseMove={onEnter} />
                    <circle cx={x} cy={y1} r={5} fill="#60a5fa" stroke="#0f172a" strokeWidth={1.5}
                      style={{ cursor: "pointer" }} onMouseEnter={onEnter} onMouseMove={onEnter} />
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {tooltip && (() => {
              const m  = METRICS[tooltip.metricIdx];
              const v1 = vals1[m.key];
              const v2 = vals2[m.key];
              return (
                <div style={{
                  position: "absolute",
                  left: tooltip.x + 14, top: tooltip.y - 10,
                  pointerEvents: "none",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  padding: "8px 12px",
                  fontSize: 13, zIndex: 10, minWidth: 200,
                }}>
                  <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>{m.description}</p>
                  <p style={{ color: "#60a5fa", margin: "2px 0" }}>
                    {name1}: <strong>{m.format(v1)}</strong>
                  </p>
                  <p style={{ color: "#f87171", margin: "2px 0" }}>
                    {name2}: <strong>{m.format(v2)}</strong>
                  </p>
                </div>
              );
            })()}

            {/* Legend */}
            <div className="flex items-center justify-center gap-8 mt-3">
              <div className="flex items-center gap-2">
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke="#60a5fa" strokeWidth="2" />
                  <circle cx="14" cy="5" r="4" fill="#60a5fa" stroke="#0f172a" strokeWidth="1.5" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#60a5fa" }}>{name1}</span>
              </div>
              <div className="flex items-center gap-2">
                <svg width="28" height="10">
                  <line x1="0" y1="5" x2="28" y2="5" stroke="#f87171" strokeWidth="2" />
                  <circle cx="14" cy="5" r="4" fill="#f87171" stroke="#0f172a" strokeWidth="1.5" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#f87171" }}>{name2}</span>
              </div>
            </div>
          </div>

          {/* ── Bar chart ── */}
          <div data-barchart style={{ flex: "1 1 260px", minWidth: 0, position: "relative" }}
            onMouseLeave={() => setBarTooltip(null)}
          >
            {METRICS.map(({ key, label, min, max, higherIsBetter, format }, idx) => {
              const v1 = vals1[key];
              const v2 = vals2[key];
              const n1 = norm(v1, min, max);
              const n2 = norm(v2, min, max);
              const BAR_H = 22;
              const MAX_W = 400;
              const p1Better = higherIsBetter ? v1 >= v2 : v1 <= v2;
              return (
                <div key={key} style={{ marginBottom: 14, cursor: "default" }}
                  onMouseMove={(e) => {
                    const rect = (e.currentTarget.closest('[data-barchart]') as HTMLElement).getBoundingClientRect();
                    setBarTooltip({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                >
                  <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4, fontWeight: 600 }}>{label}</div>
                  {/* player 1 */}
                  <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                    <div style={{
                      width: Math.max(2, Math.round((n1 / 100) * MAX_W)),
                      height: BAR_H,
                      backgroundColor: "#60a5fa",
                      borderRadius: 3,
                    }} />
                    <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: p1Better ? 700 : 400 }}>
                      {format(v1)}
                    </span>
                  </div>
                  {/* player 2 */}
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: Math.max(2, Math.round((n2 / 100) * MAX_W)),
                      height: BAR_H,
                      backgroundColor: "#f87171",
                      borderRadius: 3,
                    }} />
                    <span style={{ fontSize: 13, color: "#f87171", fontWeight: !p1Better ? 700 : 400 }}>
                      {format(v2)}
                    </span>
                  </div>
                </div>
              );
            })}
            {barTooltip && (() => {
              const m  = METRICS[barTooltip.idx];
              const v1 = vals1[m.key];
              const v2 = vals2[m.key];
              return (
                <div style={{
                  position: "absolute",
                  left: barTooltip.x + 14, top: barTooltip.y - 10,
                  pointerEvents: "none",
                  backgroundColor: "#111827",
                  border: "1px solid #374151",
                  borderRadius: 8, padding: "8px 12px",
                  fontSize: 13, zIndex: 20, minWidth: 200,
                }}>
                  <p style={{ color: "#f9fafb", fontWeight: 700, marginBottom: 4 }}>{m.label}</p>
                  <p style={{ color: "#6b7280", fontSize: 11, marginBottom: 6 }}>{m.description}</p>
                  <p style={{ color: "#60a5fa", margin: "2px 0" }}>{name1}: <strong>{m.format(v1)}</strong></p>
                  <p style={{ color: "#f87171", margin: "2px 0" }}>{name2}: <strong>{m.format(v2)}</strong></p>
                </div>
              );
            })()}
            {/* bar legend */}
            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-1">
                <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 2, backgroundColor: "#60a5fa" }} />
                <span style={{ fontSize: 13, color: "#60a5fa", fontWeight: 600 }}>{name1}</span>
              </div>
              <div className="flex items-center gap-1">
                <span style={{ display: "inline-block", width: 13, height: 13, borderRadius: 2, backgroundColor: "#f87171" }} />
                <span style={{ fontSize: 13, color: "#f87171", fontWeight: 600 }}>{name2}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
