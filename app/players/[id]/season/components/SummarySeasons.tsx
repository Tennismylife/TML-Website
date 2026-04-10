
import React, { useMemo } from "react";
import Link from "next/link";
import type { Match } from "@/types";
import { getPlayerHref, getPlayerHrefWithTab } from "@/lib/utils";
import SummarySeasonsClient from './SummarySeasonsClient';

interface SummarySeasonsProps {
  years: number[];
  allMatches: Match[];
  playerId: string;
  playerSlug?: string | null;
  selectedYear: number;
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

export default function SummarySeasons({ years, allMatches, playerId, playerSlug, selectedYear }: SummarySeasonsProps) {
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

      let bestRound = "Unknown";
      let bestCount = 0;
      const bestMap = new Map<string, number>();

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

      let bestLabel = "-";
      let maxScore = -1;
      bestMap.forEach((cnt, r) => {
        const sc = getRoundScore(r);
        if (sc > maxScore) { maxScore = sc; bestLabel = `${r} (${cnt}x)`; }
      });

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

    // Compute stats only for the selected year
    const yearMatches = validMatches.filter(m => m.year === selectedYear);
    const rows = [{ year: selectedYear, ...computeStats(yearMatches) }];

    return { rows };
  }, [years, allMatches, playerId, selectedYear]);

  const renderTd = (val: string | number, align: "left" | "center" = "center") => (
    <td className={`px-2 py-1 text-sm text-${align}`}>{val}</td>
  );

  // previously mobile detection for client-side fallback; now always server-rendered
  // const ua = headers().get('user-agent') || '';
  // const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

  return (

    <div className="mt-8 overflow-x-auto rounded bg-gray-900 shadow">
      <h3 className="text-base font-semibold mb-2 text-gray-200 px-2 pt-2">Summary Season</h3>
      <table className="min-w-full border-collapse text-gray-200 text-sm">
        <thead>
          <tr className="bg-black">
            <th title="Year" className="border border-white/30 px-3 py-1 text-center text-sm text-gray-200 cursor-help">Year</th>
            <th title="Matches played" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">M</th>
            <th title="Wins" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">W</th>
            <th title="Losses" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">L</th>
            <th title="Win percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Win%</th>
            <th title="Sets won – Sets lost" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Set W-L</th>
            <th title="Sets win percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Set%</th>
            <th title="Games won – Games lost" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Game W-L</th>
            <th title="Games win percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Game%</th>
            <th title="Tiebreaks won – Tiebreaks lost" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">TB W-L</th>
            <th title="Tiebreaks win percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">TB%</th>
            <th title="Matches with serve stats available" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">MS</th>
            <th title="Hold percentage – service games held" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Hld%</th>
            <th title="Break percentage – opponent service games broken" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Brk%</th>
            <th title="Ace percentage (aces / serve points)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">A%</th>
            <th title="Double fault percentage (double faults / serve points)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">DF%</th>
            <th title="1st serve in percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">1stIn</th>
            <th title="1st serve points won percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">1st%</th>
            <th title="2nd serve points won percentage" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">2nd%</th>
            <th title="Serve points won percentage (all serve points)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">SPW</th>
            <th title="Return points won percentage (all return points)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">RPW</th>
            <th title="Total points won percentage (serve + return)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">TPW</th>
            <th title="Dominance Ratio – RPW / (1 − SPW). Values > 1 indicate the player dominated overall." className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">DR</th>
            <th title="Best round reached (most frequent)" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Best</th>
            <th title="Link to all matches for this season" className="border border-white/30 px-3 py-2 text-center text-sm text-gray-200 cursor-help">Matches</th>
          </tr>
        </thead>
        <tbody>
          {yearlySummary.rows.map(r => (
            <tr key={r.year} className="even:bg-gray-800">
              {renderTd(r.year)}
              {renderTd(r.M)}
              {renderTd(r.W)}
              {renderTd(r.L)}
              {renderTd(`${formatPct(r.winPct)}%`)}
              {renderTd(`${r.setW}-${r.setL}`)}
              {renderTd(`${formatPct(r.setPct)}%`)}
              {renderTd(`${r.gameW}-${r.gameL}`)}
              {renderTd(`${formatPct(r.gamePct)}%`)}
              {renderTd(`${r.tbW}-${r.tbL}`)}
              {renderTd(`${formatPct(r.tbPct)}%`)}
              {renderTd(r.ms)}
              {renderTd(`${formatPct(r.hldPct)}%`)}
              {renderTd(`${formatPct(r.brkPct)}%`)}
              {renderTd(`${formatPct(r.aPct)}%`)}
              {renderTd(`${formatPct(r.dfPct)}%`)}
              {renderTd(`${formatPct(r.firstInPct)}%`)}
              {renderTd(`${formatPct(r.firstWonPct)}%`)}
              {renderTd(`${formatPct(r.secondWonPct)}%`)}
              {renderTd(`${formatPct(r.spwPct)}%`)}
              {renderTd(`${formatPct(r.rpwPct)}%`)}
              {renderTd(`${formatPct(r.tpwPct)}%`)}
              {renderTd(r.dr.toFixed(2))}
              {renderTd(r.bestLabel)}
                <td className="px-2 py-1 text-center">
                {(() => {
                  const input = playerSlug ? { slug: playerSlug } : { id: playerId };
                  return (
                    <Link href={`${getPlayerHrefWithTab(input, 'matches')}?year=${r.year}`} className="text-blue-400 hover:underline">View All Matches</Link>
                  );
                })()}
              </td>
</tr>
          ))}

        </tbody>
      </table>
    </div>
  );
}
