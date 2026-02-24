"use client";

import React, { useState, useEffect } from "react";
import { getSurfaceColor, getLevelColor, getTextColorForRound, getRoundColor } from "@/lib/colors";

/* ─────────────────────────────────────────
   Types
───────────────────────────────────────── */
interface BarRow {
  label: string;
  p1W: number; p1L: number;
  p2W: number; p2L: number;
  section?: string; // optional section title to help with coloring
}

interface Section {
  title: string;
  rows: BarRow[];
}

interface Player {
  id: string;
  atpname: string | null;
}

/* ─────────────────────────────────────────
   Helpers (mirrored from H2HCareerOverviewServer)
───────────────────────────────────────── */
function parseSetsForPlayer(
  score: string | null | undefined,
  won: boolean
): Array<{ playerWon: boolean; tb: boolean }> {
  if (!score) return [];
  const tokens = score.trim().split(/\s+/);
  const hasEarlyEnd = /\b(RET|ABD|DEF|W\/O|WO)\b/i.test(score);
  const sets: Array<{ playerWon: boolean; tb: boolean }> = [];
  tokens.forEach((tok, idx) => {
    const mx = tok.match(/^(\d+)-(\d+)(?:\((\d{1,2})\))?$/);
    if (!mx) return;
    const a = parseInt(mx[1], 10);
    const b = parseInt(mx[2], 10);
    const hasTB = !!mx[3];
    const max = Math.max(a, b);
    const diff = Math.abs(a - b);
    const completed = hasTB || max >= 10 || (max >= 6 && (diff >= 2 || max >= 7));
    if (!completed && hasEarlyEnd && idx === tokens.length - 1) return;
    sets.push({ playerWon: won ? a > b : b > a, tb: hasTB || max >= 10 });
  });
  return sets;
}

function computeStats(matches: any[], playerId: string): Section[] {
  const id = String(playerId);

  let wH = 0, lH = 0, wC = 0, lC = 0, wG = 0, lG = 0, wCa = 0, lCa = 0;
  let wSlam = 0, lSlam = 0, wM = 0, lM = 0, wFin = 0, lFin = 0;
  let wAll = 0, lAll = 0, wOly = 0, lOly = 0, wDav = 0, lDav = 0;
  let wF = 0, lF = 0, wSF = 0, lSF = 0, wQF = 0, lQF = 0;
  let wR16 = 0, lR16 = 0, wR32 = 0, lR32 = 0, wR64 = 0, lR64 = 0, wR128 = 0, lR128 = 0;
  let wT1 = 0, lT1 = 0, wT5 = 0, lT5 = 0, wT10 = 0, lT10 = 0;
  let wT20 = 0, lT20 = 0, wT100 = 0, lT100 = 0, wO100 = 0, lO100 = 0;
  let wHi = 0, lHi = 0, wLo = 0, lLo = 0;
  let wDec = 0, lDec = 0, wFifth = 0, lFifth = 0;
  let wAW1 = 0, lAW1 = 0, wAL1 = 0, lAL1 = 0;
  let wAW12 = 0, lAW12 = 0, wAL12 = 0, lAL12 = 0;
  let wDTB = 0, lDTB = 0;
  let wYg = 0, lYg = 0, wOl = 0, lOl = 0;
  let wR = 0, lR = 0, wL = 0, lL = 0;
  let w2H = 0, l2H = 0, w1H = 0, l1H = 0;
  let wSh = 0, lSh = 0, wTa = 0, lTa = 0;

  for (const m of matches) {
    const won = m.winner_id === id;
    const oRank = won ? (m.loser_rank ?? null) : (m.winner_rank ?? null);
    const pRank = won ? (m.winner_rank ?? null) : (m.loser_rank ?? null);

    // Surface
    if (won) { wAll++; } else { lAll++; }
    const surf = m.surface;
    if (surf === "Hard") won ? wH++ : lH++;
    else if (surf === "Clay") won ? wC++ : lC++;
    else if (surf === "Grass") won ? wG++ : lG++;
    else if (surf === "Carpet") won ? wCa++ : lCa++;

    // Level
    const lv = m.tourney_level;
    if (lv === "G") won ? wSlam++ : lSlam++;
    else if (lv === "M") won ? wM++ : lM++;
    else if (lv === "F") won ? wFin++ : lFin++;
    else if (lv === "O") won ? wOly++ : lOly++;
    else if (lv === "D") won ? wDav++ : lDav++;

    // Round
    const rnd = m.round;
    if (rnd === "F" || rnd === "Final") won ? wF++ : lF++;
    else if (rnd === "SF") won ? wSF++ : lSF++;
    else if (rnd === "QF") won ? wQF++ : lQF++;
    else if (rnd === "R16") won ? wR16++ : lR16++;
    else if (rnd === "R32") won ? wR32++ : lR32++;
    else if (rnd === "R64") won ? wR64++ : lR64++;
    else if (rnd === "R128") won ? wR128++ : lR128++;

    // Ranking
    if (oRank !== null) {
      if (oRank === 1) won ? wT1++ : lT1++;
      if (oRank <= 5) won ? wT5++ : lT5++;
      if (oRank <= 10) won ? wT10++ : lT10++;
      if (oRank <= 20) won ? wT20++ : lT20++;
      if (oRank <= 100) won ? wT100++ : lT100++;
      if (oRank > 100) won ? wO100++ : lO100++;
      if (pRank !== null) {
        if (oRank < pRank) won ? wHi++ : lHi++;
        if (oRank > pRank) won ? wLo++ : lLo++;
      }
    }

    // Pressure
    const sets = parseSetsForPlayer(m.score, won);
    const bo = m.best_of ?? null;
    if (sets.length >= 1) {
      if (sets[0].playerWon) won ? wAW1++ : lAW1++;
      else won ? wAL1++ : lAL1++;
    }
    if (sets.length >= 2) {
      if (sets[0].playerWon && sets[1].playerWon) won ? wAW12++ : lAW12++;
      if (!sets[0].playerWon && !sets[1].playerWon) won ? wAL12++ : lAL12++;
    }
    const isDeciding = bo != null && sets.length === bo;
    if (isDeciding) {
      won ? wDec++ : lDec++;
      if (sets[sets.length - 1].tb) won ? wDTB++ : lDTB++;
    }
    if (bo === 5 && sets.length === 5) won ? wFifth++ : lFifth++;

    // Opponent breakdown
    const oppHand = won ? m.loser_hand : m.winner_hand;
    const pHt = won ? (m.winner_ht ?? null) : (m.loser_ht ?? null);
    const oHt = won ? (m.loser_ht ?? null) : (m.winner_ht ?? null);
    const pAge = won ? (m.winner_age ?? null) : (m.loser_age ?? null);
    const oAge = won ? (m.loser_age ?? null) : (m.winner_age ?? null);
    const oppBH = (won ? m.player2?.backhand : m.player1?.backhand) ?? null;

    if (oppHand === "R") won ? wR++ : lR++;
    else if (oppHand === "L") won ? wL++ : lL++;

    if (oppBH !== null) {
      const bh = String(oppBH).toUpperCase().trim();
      if (bh === "2H" || bh === "2") won ? w2H++ : l2H++;
      else if (bh === "1H" || bh === "1") won ? w1H++ : l1H++;
    }
    if (pHt !== null && oHt !== null) {
      if (oHt < pHt) won ? wSh++ : lSh++;
      else if (oHt > pHt) won ? wTa++ : lTa++;
    }
    if (pAge !== null && oAge !== null) {
      if (oAge < pAge) won ? wYg++ : lYg++;
      else if (oAge > pAge) won ? wOl++ : lOl++;
    }
  }

  return [
    {
      title: "Surfaces",
      rows: [
        { label: "Overall",   p1W: wAll, p1L: lAll,   p2W: 0, p2L: 0 },
        { label: "Hard",      p1W: wH,   p1L: lH,     p2W: 0, p2L: 0 },
        { label: "Clay",      p1W: wC,   p1L: lC,     p2W: 0, p2L: 0 },
        { label: "Grass",     p1W: wG,   p1L: lG,     p2W: 0, p2L: 0 },
        { label: "Carpet",    p1W: wCa,  p1L: lCa,    p2W: 0, p2L: 0 },
      ],
    },
    {
      title: "Tournament Level",
      rows: [
        { label: "Grand Slam", p1W: wSlam, p1L: lSlam, p2W: 0, p2L: 0 },
        { label: "Masters",    p1W: wM,    p1L: lM,    p2W: 0, p2L: 0 },
        { label: "Finals",     p1W: wFin,  p1L: lFin,  p2W: 0, p2L: 0 },
        { label: "Olympics",   p1W: wOly,  p1L: lOly,  p2W: 0, p2L: 0 },
        { label: "Davis Cup",  p1W: wDav,  p1L: lDav,  p2W: 0, p2L: 0 },
      ],
    },
    {
      title: "Round",
      rows: [
        { label: "F",    p1W: wF,    p1L: lF,    p2W: 0, p2L: 0 },
        { label: "SF",   p1W: wSF,   p1L: lSF,   p2W: 0, p2L: 0 },
        { label: "QF",   p1W: wQF,   p1L: lQF,   p2W: 0, p2L: 0 },
        { label: "R16",  p1W: wR16,  p1L: lR16,  p2W: 0, p2L: 0 },
        { label: "R32",  p1W: wR32,  p1L: lR32,  p2W: 0, p2L: 0 },
        { label: "R64",  p1W: wR64,  p1L: lR64,  p2W: 0, p2L: 0 },
        { label: "R128", p1W: wR128, p1L: lR128, p2W: 0, p2L: 0 },
      ],
    },
    {
      title: "Opponent Ranking",
      rows: [
        { label: "vs #1",         p1W: wT1,   p1L: lT1,   p2W: 0, p2L: 0 },
        { label: "vs Top 5",      p1W: wT5,   p1L: lT5,   p2W: 0, p2L: 0 },
        { label: "vs Top 10",     p1W: wT10,  p1L: lT10,  p2W: 0, p2L: 0 },
        { label: "vs Top 20",     p1W: wT20,  p1L: lT20,  p2W: 0, p2L: 0 },
        { label: "vs Top 100",    p1W: wT100, p1L: lT100, p2W: 0, p2L: 0 },
        { label: "vs Out. 100",   p1W: wO100, p1L: lO100, p2W: 0, p2L: 0 },
        { label: "vs Higher R.",  p1W: wHi,   p1L: lHi,   p2W: 0, p2L: 0 },
        { label: "vs Lower R.",   p1W: wLo,   p1L: lLo,   p2W: 0, p2L: 0 },
      ],
    },
    {
      title: "Pressure Situations",
      rows: [
        { label: "Deciding set",    p1W: wDec,   p1L: lDec,   p2W: 0, p2L: 0 },
        { label: "5th set",         p1W: wFifth, p1L: lFifth, p2W: 0, p2L: 0 },
        { label: "Won 1st set",     p1W: wAW1,   p1L: lAW1,   p2W: 0, p2L: 0 },
        { label: "Lost 1st set",    p1W: wAL1,   p1L: lAL1,   p2W: 0, p2L: 0 },
        { label: "Won 1st+2nd",     p1W: wAW12,  p1L: lAW12,  p2W: 0, p2L: 0 },
        { label: "Lost 1st+2nd",    p1W: wAL12,  p1L: lAL12,  p2W: 0, p2L: 0 },
        { label: "Deciding TB",     p1W: wDTB,   p1L: lDTB,   p2W: 0, p2L: 0 },
      ],
    },
    {
      title: "Opponent Breakdown",
      rows: [
        { label: "vs Younger",    p1W: wYg,  p1L: lYg,  p2W: 0, p2L: 0 },
        { label: "vs Older",      p1W: wOl,  p1L: lOl,  p2W: 0, p2L: 0 },
        { label: "vs Right-h.",   p1W: wR,   p1L: lR,   p2W: 0, p2L: 0 },
        { label: "vs Left-h.",    p1W: wL,   p1L: lL,   p2W: 0, p2L: 0 },
        { label: "vs 2H BH",      p1W: w2H,  p1L: l2H,  p2W: 0, p2L: 0 },
        { label: "vs 1H BH",      p1W: w1H,  p1L: l1H,  p2W: 0, p2L: 0 },
        { label: "vs Shorter",    p1W: wSh,  p1L: lSh,  p2W: 0, p2L: 0 },
        { label: "vs Taller",     p1W: wTa,  p1L: lTa,  p2W: 0, p2L: 0 },
      ],
    },
  ];
}

/* ─────────────────────────────────────────
   Merge p1 + p2 sections into combined rows
───────────────────────────────────────── */
function mergeSections(s1: Section[], s2: Section[]): Section[] {
  return s1.map((sec, si) => ({
    title: sec.title,
    rows: sec.rows.map((r, ri) => ({
      label: r.label,
      p1W: r.p1W, p1L: r.p1L,
      p2W: s2[si]?.rows[ri]?.p1W ?? 0,
      p2L: s2[si]?.rows[ri]?.p1L ?? 0,
    })),
  }));
}

/* ─────────────────────────────────────────
   BarRow renderer
───────────────────────────────────────── */
function pct(w: number, l: number) {
  const t = w + l;
  return t > 0 ? (w / t) * 100 : null;
}

const P1_COLOR_CLASS = "bg-blue-500";
const P2_COLOR_CLASS = "bg-red-500"; // match BAR2_COLOR (#EF4444)

// helper for tinting headers based on win/loss comparison
const getColor = (a: number, b: number) => {
  if (a > b) return "!text-green-400";
  if (a < b) return "!text-red-400";
  return "text-gray-300";
};

function RowBar({
  label, p1W, p1L, p2W, p2L, section,
}: BarRow) {
  const tot1 = p1W + p1L;
  const tot2 = p2W + p2L;
  const pct1 = pct(p1W, p1L);
  const pct2 = pct(p2W, p2L);
  const [hover, setHover] = useState(false);

  // compute label color based on the section type
  const labelColor: string | undefined =
    section === "Surfaces" ? getSurfaceColor(label)
    : section === "Tournament Level" ? getLevelColor(label)
    : section === "Round" ? getRoundColor(label)
    : undefined;

  const bar1 = pct1 ?? 0;
  const bar2 = pct2 ?? 0;

  // fixed bar colors: player1 blue, player2 red to match other components
  const BAR1_COLOR = "#3B82F6"; // blue-500
  const BAR2_COLOR = "#EF4444"; // red-500
  const color1 = BAR1_COLOR;
  const color2 = BAR2_COLOR;

  if (tot1 === 0 && tot2 === 0) return null;

  return (
    <div
      className="relative group py-1.5 px-2 hover:bg-gray-700/30 rounded transition-colors"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* label */}
      {labelColor ? (
        <span
          className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1"
          style={{ backgroundColor: labelColor, color: getTextColorForRound(labelColor) }}
        >{label}</span>
      ) : (
        <div className={`text-sm mb-1 font-medium tracking-wide uppercase ${getColor(p1W, p2W)}`}>{label}</div>
      )}

      {/* P1 bar */}
      <div className="flex items-center gap-2 mb-0.5">
        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bar1}%`, backgroundColor: color1 }}
          />
          {pct1 !== null && tot1 > 0 && (
            <span className="absolute right-1 top-0 bottom-0 flex items-center text-xs text-white">
              {`${pct1.toFixed(2)}%`}
            </span>
          )}
        </div>
        <span className={`text-sm w-14 text-right shrink-0 tabular-nums ${pct1 !== null && pct2 !== null && pct1 >= pct2 ? 'text-white font-bold' : 'text-gray-400'}`}>
          {tot1 > 0 ? `${p1W}-${p1L}` : '—'}
        </span>
      </div>

      {/* P2 bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${bar2}%`, backgroundColor: color2 }}
          />
          {pct2 !== null && tot2 > 0 && (
            <span className="absolute right-1 top-0 bottom-0 flex items-center text-xs text-white">
              {`${pct2.toFixed(2)}%`}
            </span>
          )}
        </div>
        <span className={`text-sm w-14 text-right shrink-0 tabular-nums ${pct1 !== null && pct2 !== null && pct2 >= pct1 ? 'text-white font-bold' : 'text-gray-400'}`}>
          {tot2 > 0 ? `${p2W}-${p2L}` : '—'}
        </span>
      </div>

      {/* Tooltip */}
      {hover && tot1 > 0 && tot2 > 0 && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 z-50 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-xs shadow-xl whitespace-nowrap pointer-events-none">
          <div className="font-semibold text-gray-200 mb-1">{label}</div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color1 }} />
            <span className="text-gray-300"><span className="text-white font-bold">{pct1 !== null ? `${pct1.toFixed(1)}%` : '—'}</span> ({p1W}W / {p1L}L)</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color2 }} />
            <span className="text-gray-300"><span className="text-white font-bold">{pct2 !== null ? `${pct2.toFixed(1)}%` : '—'}</span> ({p2W}W / {p2L}L)</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Main component
───────────────────────────────────────── */
export default function H2HCareerBarsClient({
  player1,
  player2,
}: {
  player1: Player;
  player2: Player;
}) {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      try {
        const [r1, r2] = await Promise.all([
          fetch(`/api/players/performance?id=${encodeURIComponent(player1.id)}`).then(r => r.json()),
          fetch(`/api/players/performance?id=${encodeURIComponent(player2.id)}`).then(r => r.json()),
        ]);
        if (cancelled) return;
        const s1 = computeStats(Array.isArray(r1) ? r1 : [], player1.id);
        const s2 = computeStats(Array.isArray(r2) ? r2 : [], player2.id);
        setSections(mergeSections(s1, s2));
      } catch (e) {
        if (!cancelled) setError("Failed to load career data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [player1.id, player2.id]);

  const p1Name = player1.atpname ?? "Player 1";
  const p2Name = player2.atpname ?? "Player 2";

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-16 text-sm animate-pulse">Loading career data…</div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 py-8 text-sm">{error}</div>
    );
  }

  if (!sections) return null;

  return (
    <div className="space-y-6 text-sm">
      {/* Player legend (horizontal) */}
      <div className="flex items-center gap-6 justify-center text-sm mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${P1_COLOR_CLASS}`} />
          <span className="text-gray-300 font-medium">{p1Name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-3 h-3 rounded-full ${P2_COLOR_CLASS}`} />
          <span className="text-gray-300 font-medium">{p2Name}</span>
        </div>
        <span className="text-gray-600 text-xs">Bars show Win %</span>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sections.map((sec) => (
          <div
            key={sec.title}
            className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-4 shadow"
          >
            <h3 className="text-sm font-bold text-white mb-3 border-b border-gray-700 pb-2 tracking-wide uppercase">
              {sec.title}
            </h3>
            <div className="space-y-0.5">
              {sec.rows.map((row) => (
                <RowBar
                  key={row.label}
                  {...row}
                  section={sec.title}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
