"use client";

import React, { useMemo } from "react";
import type { Match } from "@/types";

interface SummarySeasonsProps {
  years: number[];
  allMatches: Match[];
  playerId: string;
}

const roundWeight: Record<string, number> = {
  W: 7, F: 6, SF: 5, QF: 4, R16: 3, R32: 2, R64: 1, R128: 0.5,
  RR: 2.5, BR: 3.5, Q3: 0.3, Q2: 0.2, Q1: 0.1,
};

function getRoundScore(r?: string | null) {
  return r ? roundWeight[r] ?? 0 : 0;
}

function parseSetScores(score?: string | null) {
  if (!score) return [] as Array<{ a: number; b: number; tb: boolean }>;
  const tokens = score.trim().split(/\s+/);
  const hasEarlyEnd = /\b(RET|ABD|DEF|W\/O|WO)\b/i.test(score);
  const sets: Array<{ a: number; b: number; tb: boolean }> = [];

  tokens.forEach((tok, idx) => {
    const m = tok.match(/^(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\))?$/);
    if (!m) return;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const hasTB = !!m[3];
    const max = Math.max(a, b);

    let completed = hasTB || max >= 10 || (max >= 6 && (Math.abs(a - b) >= 2 || max >= 7));
    if (!completed && hasEarlyEnd && idx === tokens.length - 1) return;

    sets.push({ a, b, tb: hasTB || max >= 10 });
  });

  return sets;
}

function safePct(num: number, den: number) {
  return den > 0 ? (num / den) * 100 : 0;
}

function formatPct(num: number) {
  return num.toFixed(2);
}

export default function SummarySeasons({ years, allMatches, playerId }: SummarySeasonsProps) {
  const yearlySummary = useMemo(() => {
    const validMatches = allMatches.filter(m => m.status !== false);

    const computeStats = (matches: Match[]) => {
      let W = 0, L = 0;
      let setW = 0, setL = 0;
      let gameW = 0, gameL = 0;
      let tbW = 0, tbL = 0;

      let ms = 0;
      let my_svpt = 0, my_ace = 0, my_df = 0, my_1stIn = 0, my_1stWon = 0, my_2ndWon = 0, my_SvGms = 0, my_bpSaved = 0, my_bpFaced = 0;
      let opp_svpt = 0, opp_1stWon = 0, opp_2ndWon = 0, opp_SvGms = 0, opp_bpSaved = 0, opp_bpFaced = 0;

      const groups = new Map<string, Match[]>();

      for (const m of matches) {
        const iAmWinner = String(m.winner_id) === String(playerId);
        if (iAmWinner) W++; else L++;

        const sets = parseSetScores(m.score);
        sets.forEach((s) => {
          const isSuperTB = s.tb && Math.max(s.a, s.b) >= 10;
          if (iAmWinner) { setW += s.a > s.b ? 1 : 0; setL += s.a < s.b ? 1 : 0; }
          else { setW += s.b > s.a ? 1 : 0; setL += s.b < s.a ? 1 : 0; }

          if (!isSuperTB) {
            if (iAmWinner) { gameW += s.a; gameL += s.b; }
            else { gameW += s.b; gameL += s.a; }
          }

          if ((Math.max(s.a, s.b) === 7 && Math.min(s.a, s.b) === 6) || Math.max(s.a, s.b) >= 10 || s.tb) {
            const my = iAmWinner ? s.a : s.b;
            const op = iAmWinner ? s.b : s.a;
            if (my > op) tbW++; else if (my < op) tbL++;
          }
        });

        const hasBothSvpt = m.w_svpt != null && m.l_svpt != null;
        if (hasBothSvpt) {
          ms++;
          if (iAmWinner) {
            my_svpt += m.w_svpt ?? 0; my_ace += m.w_ace ?? 0; my_df += m.w_df ?? 0; my_1stIn += m.w_1stIn ?? 0;
            my_1stWon += m.w_1stWon ?? 0; my_2ndWon += m.w_2ndWon ?? 0; my_SvGms += m.w_SvGms ?? 0;
            my_bpSaved += m.w_bpSaved ?? 0; my_bpFaced += m.w_bpFaced ?? 0;

            opp_svpt += m.l_svpt ?? 0; opp_1stWon += m.l_1stWon ?? 0; opp_2ndWon += m.l_2ndWon ?? 0;
            opp_SvGms += m.l_SvGms ?? 0; opp_bpSaved += m.l_bpSaved ?? 0; opp_bpFaced += m.l_bpFaced ?? 0;
          } else {
            my_svpt += m.l_svpt ?? 0; my_ace += m.l_ace ?? 0; my_df += m.l_df ?? 0; my_1stIn += m.l_1stIn ?? 0;
            my_1stWon += m.l_1stWon ?? 0; my_2ndWon += m.l_2ndWon ?? 0; my_SvGms += m.l_SvGms ?? 0;
            my_bpSaved += m.l_bpSaved ?? 0; my_bpFaced += m.l_bpFaced ?? 0;

            opp_svpt += m.w_svpt ?? 0; opp_1stWon += m.w_1stWon ?? 0; opp_2ndWon += m.w_2ndWon ?? 0;
            opp_SvGms += m.w_SvGms ?? 0; opp_bpSaved += m.w_bpSaved ?? 0; opp_bpFaced += m.w_bpFaced ?? 0;
          }
        }

        const gkey = `${m.tourney_name ?? "Unknown"}__${m.year}`;
        const arr = groups.get(gkey);
        if (arr) arr.push(m); else groups.set(gkey, [m]);
      }

      let bestRound = "Unknown";
      let bestCount = 0;
      const bestMap = new Map<string, number>();
      groups.forEach((arr) => {
        const champion = arr.some(mm => mm.round === "F" && String(mm.winner_id) === String(playerId));
        let best = "Unknown";
        let score = 0;
        arr.forEach((mm) => {
          const sc = getRoundScore(mm.round);
          if (sc > score) { score = sc; best = mm.round ?? "Unknown"; }
        });
        const br = champion ? "W" : best;
        bestMap.set(br, (bestMap.get(br) ?? 0) + 1);
      });
      bestMap.forEach((cnt, r) => {
        if (getRoundScore(r) > getRoundScore(bestRound)) { bestRound = r; bestCount = cnt; }
      });
      const bestLabel = bestCount > 0 ? `${bestRound} (${bestCount}x)` : "-";

      const winPct = safePct(W, W + L);
      const setPct = safePct(setW, setW + setL);
      const gamePct = safePct(gameW, gameW + gameL);
      const tbPct = safePct(tbW, tbW + tbL);

      const holds = Math.max(0, my_SvGms - Math.max(0, my_bpFaced - my_bpSaved));
      const hldPct = safePct(holds, my_SvGms);
      const brkMade = Math.max(0, opp_bpFaced - opp_bpSaved);
      const brkPct = safePct(brkMade, opp_SvGms);

      const aPct = safePct(my_ace, my_svpt);
      const dfPct = safePct(my_df, my_svpt);
      const firstInPct = safePct(my_1stIn, my_svpt);
      const firstWonPct = safePct(my_1stWon, my_1stIn);
      const secondDen = Math.max(0, my_svpt - my_1stIn);
      const secondWonPct = safePct(my_2ndWon, secondDen);
      const spwPct = safePct(my_1stWon + my_2ndWon, my_svpt);
      const rpwNum = Math.max(0, opp_svpt - (opp_1stWon + opp_2ndWon));
      const rpwPct = safePct(rpwNum, opp_svpt);
      const totalPtsWon = (my_1stWon + my_2ndWon) + rpwNum;
      const totalPtsPlayed = my_svpt + opp_svpt;
      const tpwPct = safePct(totalPtsWon, totalPtsPlayed);
      const dr = (1 - spwPct / 100) > 0 ? rpwPct / (100 - spwPct) : 0;

      return {
        M: W + L, W, L, winPct,
        setW, setL, setPct,
        gameW, gameL, gamePct,
        tbW, tbL, tbPct,
        ms,
        hldPct, brkPct,
        aPct, dfPct,
        firstInPct, firstWonPct, secondWonPct,
        spwPct, rpwPct, tpwPct, dr,
        bestLabel,
      };
    };

    const rows = years.map(year => {
      const yearMatches = validMatches.filter(m => m.year === year);
      return { year, ...computeStats(yearMatches) };
    });

    const career = computeStats(validMatches);

    return { rows, career };
  }, [years, allMatches, playerId]);

  const renderTd = (val: string | number, align: "left" | "center" = "center") => (
    <td className={`px-2 py-1 text-sm text-${align}`}>{val}</td>
  );

  return (

<div className="mt-8 overflow-x-auto rounded bg-gray-900 shadow">
  <h3 className="text-base font-semibold mb-2 text-gray-200 px-2 pt-2">Summary Seasons</h3>
  <table className="min-w-full border-collapse text-gray-200 text-sm">
    <thead>
      <tr className="bg-black">
        <th className="border border-white/30 px-3 py-1 text-center text-sm text-gray-200">Year</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">M</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">W</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">L</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Win%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Set W-L</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Set%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Game W-L</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Game%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">TB W-L</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">TB%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">MS</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Hld%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Brk%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">A%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">DF%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">1stIn</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">1st%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">2nd%</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">SPW</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">RPW</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">TPW</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">DR</th>
        <th className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200">Best</th>
      </tr>
        </thead>
        <tbody>
          {yearlySummary.rows.map(r => (
            <tr key={r.year} className="even:bg-gray-800">
              {renderTd(r.year)}
              {renderTd(r.M)}
              {renderTd(r.W)}
              {renderTd(r.L)}
              {renderTd(formatPct(r.winPct))}
              {renderTd(`${r.setW}-${r.setL}`)}
              {renderTd(formatPct(r.setPct))}
              {renderTd(`${r.gameW}-${r.gameL}`)}
              {renderTd(formatPct(r.gamePct))}
              {renderTd(`${r.tbW}-${r.tbL}`)}
              {renderTd(formatPct(r.tbPct))}
              {renderTd(r.ms)}
              {renderTd(formatPct(r.hldPct))}
              {renderTd(formatPct(r.brkPct))}
              {renderTd(formatPct(r.aPct))}
              {renderTd(formatPct(r.dfPct))}
              {renderTd(formatPct(r.firstInPct))}
              {renderTd(formatPct(r.firstWonPct))}
              {renderTd(formatPct(r.secondWonPct))}
              {renderTd(formatPct(r.spwPct))}
              {renderTd(formatPct(r.rpwPct))}
              {renderTd(formatPct(r.tpwPct))}
              {renderTd(r.dr.toFixed(2))}
              {renderTd(r.bestLabel)}
            </tr>
          ))}
          <tr className="bg-gray-700 font-bold text-sm">
            {renderTd("Career")}
            {renderTd(yearlySummary.career.M)}
            {renderTd(yearlySummary.career.W)}
            {renderTd(yearlySummary.career.L)}
            {renderTd(formatPct(yearlySummary.career.winPct))}
            {renderTd(`${yearlySummary.career.setW}-${yearlySummary.career.setL}`)}
            {renderTd(formatPct(yearlySummary.career.setPct))}
            {renderTd(`${yearlySummary.career.gameW}-${yearlySummary.career.gameL}`)}
            {renderTd(formatPct(yearlySummary.career.gamePct))}
            {renderTd(`${yearlySummary.career.tbW}-${yearlySummary.career.tbL}`)}
            {renderTd(formatPct(yearlySummary.career.tbPct))}
            {renderTd(yearlySummary.career.ms)}
            {renderTd(formatPct(yearlySummary.career.hldPct))}
            {renderTd(formatPct(yearlySummary.career.brkPct))}
            {renderTd(formatPct(yearlySummary.career.aPct))}
            {renderTd(formatPct(yearlySummary.career.dfPct))}
            {renderTd(formatPct(yearlySummary.career.firstInPct))}
            {renderTd(formatPct(yearlySummary.career.firstWonPct))}
            {renderTd(formatPct(yearlySummary.career.secondWonPct))}
            {renderTd(formatPct(yearlySummary.career.spwPct))}
            {renderTd(formatPct(yearlySummary.career.rpwPct))}
            {renderTd(formatPct(yearlySummary.career.tpwPct))}
            {renderTd(yearlySummary.career.dr.toFixed(2))}
            {renderTd("-")}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
