import React from "react";
import { prisma } from "@/lib/prisma";
import H2HCareerRadarChart, { CareerStats } from "./H2HCareerRadarChart";
import H2HLevelRadarChart, { LevelStats } from "./H2HLevelRadarChart";
import H2HRankingRadarChart, { RankingStats } from "./H2HRankingRadarChart";
import H2HRoundRadarChart, { RoundStats } from "./H2HRoundRadarChart";
import H2HPressureRadarChart, { PressureStats } from "./H2HPressureRadarChart";
import H2HOpponentRadarChart, { OpponentStats } from "./H2HOpponentRadarChart";

interface Player {
  id?: string | number;
  atpname?: string | null;
}

interface Props {
  player1: Player | null;
  player2: Player | null;
}

interface AllStats {
  career: CareerStats;
  level: LevelStats;
  ranking: RankingStats;
  round: RoundStats;
  pressure: PressureStats;
  opponent: OpponentStats;
}

// Parse sets from the player's perspective.
// Score convention: a = match-winner's games, b = match-loser's games.
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

const fetchAllStats = async (playerId?: string | number): Promise<AllStats | null> => {
  if (!playerId) return null;
  const idStr = String(playerId);

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ winner_id: idStr }, { loser_id: idStr }],
      status: true,
      NOT: {
        OR: [
          { score: { contains: "DEF", mode: "insensitive" } },
          { score: { contains: "W/O", mode: "insensitive" } },
          { score: { contains: "WEA", mode: "insensitive" } },
        ],
      },
    },
    select: {
      winner_id: true, surface: true, tourney_level: true,
      winner_rank: true, loser_rank: true, round: true, score: true, best_of: true,
      winner_hand: true, loser_hand: true,
      winner_ht: true, loser_ht: true,
      winner_age: true, loser_age: true,
      player1: { select: { backhand: true } },
      player2: { select: { backhand: true } },
    },
  });

  let winsAll = 0, lossesAll = 0;
  let winsHard = 0, winsClay = 0, winsGrass = 0, winsCarpet = 0;
  let lossesHard = 0, lossesClay = 0, lossesGrass = 0, lossesCarpet = 0;
  let winsSlam = 0, lossesSlam = 0;
  let winsMasters = 0, lossesMasters = 0;
  let winsFinals = 0, lossesFinals = 0;
  let winsATP = 0, lossesATP = 0;
  let winsOlympics = 0, lossesOlympics = 0;
  let winsDavis = 0, lossesDavis = 0;
  // Round stats
  let winsFinal = 0, lossesFinal = 0;
  let winsSF = 0, lossesSF = 0;
  let winsQF = 0, lossesQF = 0;
  let winsR16 = 0, lossesR16 = 0;
  let winsR32 = 0, lossesR32 = 0;
  let winsR64 = 0, lossesR64 = 0;
  let winsR128 = 0, lossesR128 = 0;
  // Ranking stats
  let winsVsTop1 = 0, lossesVsTop1 = 0;
  let winsVsTop5 = 0, lossesVsTop5 = 0;
  let winsVsTop10 = 0, lossesVsTop10 = 0;
  let winsVsTop20 = 0, lossesVsTop20 = 0;
  let winsVsTop100 = 0, lossesVsTop100 = 0;
  let winsVsOutside100 = 0, lossesVsOutside100 = 0;
  let winsVsHigher = 0, lossesVsHigher = 0;
  let winsVsLower = 0, lossesVsLower = 0;
  // Pressure stats
  let winsDecidingSet = 0, lossesDecidingSet = 0;
  let winsFifthSet = 0, lossesFifthSet = 0;
  let winsAfterWin1st = 0, lossesAfterWin1st = 0;
  let winsAfterLoss1st = 0, lossesAfterLoss1st = 0;
  let winsAfterWin1st2nd = 0, lossesAfterWin1st2nd = 0;
  let winsAfterLoss1st2nd = 0, lossesAfterLoss1st2nd = 0;
  let winsDecidingTB = 0, lossesDecidingTB = 0;
  // Opponent breakdown stats
  let winsVsYounger = 0, lossesVsYounger = 0;
  let winsVsOlder = 0, lossesVsOlder = 0;
  let winsVsRight = 0, lossesVsRight = 0;
  let winsVsLeft = 0, lossesVsLeft = 0;
  let winsVsTwoHandedBH = 0, lossesVsTwoHandedBH = 0;
  let winsVsOneHandedBH = 0, lossesVsOneHandedBH = 0;
  let winsVsShorter = 0, lossesVsShorter = 0;
  let winsVsTaller = 0, lossesVsTaller = 0;

  for (const m of matches) {
    const won = m.winner_id === idStr;
    const playerRank = won ? (m.winner_rank ?? null) : (m.loser_rank ?? null);
    const oppRank = won ? (m.loser_rank ?? null) : (m.winner_rank ?? null);

    if (won) {
      winsAll++;
      if (m.surface === "Hard") winsHard++;
      else if (m.surface === "Clay") winsClay++;
      else if (m.surface === "Grass") winsGrass++;
      else if (m.surface === "Carpet") winsCarpet++;
      const lv = m.tourney_level;
      if (lv === "G") winsSlam++;
      else if (lv === "M") winsMasters++;
      else if (lv === "F") winsFinals++;
      else if (lv === "A") winsATP++;
      else if (lv === "O") winsOlympics++;
      else if (lv === "D") winsDavis++;
    } else {
      lossesAll++;
      if (m.surface === "Hard") lossesHard++;
      else if (m.surface === "Clay") lossesClay++;
      else if (m.surface === "Grass") lossesGrass++;
      else if (m.surface === "Carpet") lossesCarpet++;
      const lv = m.tourney_level;
      if (lv === "G") lossesSlam++;
      else if (lv === "M") lossesMasters++;
      else if (lv === "F") lossesFinals++;
      else if (lv === "A") lossesATP++;
      else if (lv === "O") lossesOlympics++;
      else if (lv === "D") lossesDavis++;
    }

    // Round-based stats
    const rnd = m.round;
    if (rnd === "F" || rnd === "Final")  { won ? winsFinal++  : lossesFinal++; }
    else if (rnd === "SF")              { won ? winsSF++     : lossesSF++; }
    else if (rnd === "QF")              { won ? winsQF++     : lossesQF++; }
    else if (rnd === "R16")             { won ? winsR16++    : lossesR16++; }
    else if (rnd === "R32")             { won ? winsR32++    : lossesR32++; }
    else if (rnd === "R64")             { won ? winsR64++    : lossesR64++; }
    else if (rnd === "R128")            { won ? winsR128++   : lossesR128++; }

    // Ranking-based stats
    if (oppRank !== null) {
      if (oppRank === 1)  { won ? winsVsTop1++       : lossesVsTop1++; }
      if (oppRank <= 5)   { won ? winsVsTop5++        : lossesVsTop5++; }
      if (oppRank <= 10)  { won ? winsVsTop10++       : lossesVsTop10++; }
      if (oppRank <= 20)  { won ? winsVsTop20++       : lossesVsTop20++; }
      if (oppRank <= 100) { won ? winsVsTop100++      : lossesVsTop100++; }
      if (oppRank > 100)  { won ? winsVsOutside100++  : lossesVsOutside100++; }
      if (playerRank !== null) {
        if (oppRank < playerRank) { won ? winsVsHigher++ : lossesVsHigher++; }
        if (oppRank > playerRank) { won ? winsVsLower++  : lossesVsLower++; }
      }
    }

    // Pressure stats
    const sets = parseSetsForPlayer(m.score, won);
    const bo = m.best_of ?? null;
    if (sets.length >= 1) {
      if (sets[0].playerWon) { won ? winsAfterWin1st++  : lossesAfterWin1st++; }
      else                   { won ? winsAfterLoss1st++ : lossesAfterLoss1st++; }
    }
    if (sets.length >= 2) {
      if ( sets[0].playerWon &&  sets[1].playerWon) { won ? winsAfterWin1st2nd++  : lossesAfterWin1st2nd++; }
      if (!sets[0].playerWon && !sets[1].playerWon) { won ? winsAfterLoss1st2nd++ : lossesAfterLoss1st2nd++; }
    }
    const isDeciding = bo != null && sets.length === bo;
    if (isDeciding) {
      won ? winsDecidingSet++ : lossesDecidingSet++;
      if (sets[sets.length - 1].tb) { won ? winsDecidingTB++ : lossesDecidingTB++; }
    }
    if (bo === 5 && sets.length === 5) { won ? winsFifthSet++ : lossesFifthSet++; }

    // Opponent breakdown stats
    const oppHand = won ? m.loser_hand : m.winner_hand;
    const playerHt = won ? (m.winner_ht ?? null) : (m.loser_ht ?? null);
    const oppHt    = won ? (m.loser_ht  ?? null) : (m.winner_ht ?? null);
    const playerAge = won ? (m.winner_age ?? null) : (m.loser_age ?? null);
    const oppAge    = won ? (m.loser_age  ?? null) : (m.winner_age ?? null);
    // player1 relation = winner, player2 relation = loser
    const oppBH = (won ? m.player2?.backhand : m.player1?.backhand) ?? null;

    if (oppHand === "R") { won ? winsVsRight++ : lossesVsRight++; }
    else if (oppHand === "L") { won ? winsVsLeft++ : lossesVsLeft++; }

    if (oppBH !== null) {
      const bh = String(oppBH).toUpperCase().trim();
      if (bh === "2H" || bh === "2") { won ? winsVsTwoHandedBH++ : lossesVsTwoHandedBH++; }
      else if (bh === "1H" || bh === "1") { won ? winsVsOneHandedBH++ : lossesVsOneHandedBH++; }
    }

    if (playerHt !== null && oppHt !== null) {
      if (oppHt < playerHt) { won ? winsVsShorter++ : lossesVsShorter++; }
      else if (oppHt > playerHt) { won ? winsVsTaller++ : lossesVsTaller++; }
    }

    if (playerAge !== null && oppAge !== null) {
      if (oppAge < playerAge) { won ? winsVsYounger++ : lossesVsYounger++; }
      else if (oppAge > playerAge) { won ? winsVsOlder++ : lossesVsOlder++; }
    }
  }

  const totalAll = winsAll + lossesAll;
  return {
    career: {
      percAll: totalAll > 0 ? (winsAll / totalAll) * 100 : 0,
      winsHard, lossesHard, winsClay, lossesClay,
      winsGrass, lossesGrass, winsCarpet, lossesCarpet,
    },
    level: {
      winsSlam, lossesSlam, winsMasters, lossesMasters,
      winsFinals, lossesFinals, winsAll, lossesAll,
      winsOlympics, lossesOlympics, winsDavis, lossesDavis,
    },
    ranking: {
      winsVsTop1, lossesVsTop1,
      winsVsTop5, lossesVsTop5,
      winsVsTop10, lossesVsTop10,
      winsVsTop20, lossesVsTop20,
      winsVsTop100, lossesVsTop100,
      winsVsOutside100, lossesVsOutside100,
      winsVsHigher, lossesVsHigher,
      winsVsLower, lossesVsLower,
    },
    round: {
      winsFinal, lossesFinal,
      winsSF, lossesSF,
      winsQF, lossesQF,
      winsR16, lossesR16,
      winsR32, lossesR32,
      winsR64, lossesR64,
      winsR128, lossesR128,
    },
    pressure: {
      winsDecidingSet, lossesDecidingSet,
      winsFifthSet, lossesFifthSet,
      winsAfterWin1st, lossesAfterWin1st,
      winsAfterLoss1st, lossesAfterLoss1st,
      winsAfterWin1st2nd, lossesAfterWin1st2nd,
      winsAfterLoss1st2nd, lossesAfterLoss1st2nd,
      winsDecidingTB, lossesDecidingTB,
    },
    opponent: {
      winsVsYounger, lossesVsYounger,
      winsVsOlder, lossesVsOlder,
      winsVsRight, lossesVsRight,
      winsVsLeft, lossesVsLeft,
      winsVsTwoHandedBH, lossesVsTwoHandedBH,
      winsVsOneHandedBH, lossesVsOneHandedBH,
      winsVsShorter, lossesVsShorter,
      winsVsTaller, lossesVsTaller,
    },
  };
};

export default async function H2HCareerOverviewServer({ player1, player2 }: Props) {
  if (!player1 || !player2) return null;

  const [p1All, p2All] = await Promise.all([
    fetchAllStats(player1.id),
    fetchAllStats(player2.id),
  ]);

  if (!p1All || !p2All) return null;

  const p1Name = player1.atpname ?? "Player 1";
  const p2Name = player2.atpname ?? "Player 2";

  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div>
        <h3 className="text-lg font-semibold mb-0 text-center text-gray-300">By Surface</h3>
        <div className="-mt-12">
        <H2HCareerRadarChart
          p1Stats={p1All.career}
          p2Stats={p2All.career}
          p1Name={p1Name}
          p2Name={p2Name}
        />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-0 text-center text-gray-300">By Tournament Level</h3>
        <div className="-mt-12">
        <H2HLevelRadarChart
          p1Stats={p1All.level}
          p2Stats={p2All.level}
          p1Name={p1Name}
          p2Name={p2Name}
        />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-0 text-center text-gray-300">By Round</h3>
        <div className="-mt-12">
        <H2HRoundRadarChart
          p1Stats={p1All.round}
          p2Stats={p2All.round}
          p1Name={p1Name}
          p2Name={p2Name}
        />
        </div>
      </div>
    </div>
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div>
        <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">By Opponent Ranking</h3>
        <H2HRankingRadarChart
          p1Stats={p1All.ranking}
          p2Stats={p2All.ranking}
          p1Name={p1Name}
          p2Name={p2Name}
        />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Opponent Breakdown</h3>
        <H2HOpponentRadarChart
          p1Stats={p1All.opponent}
          p2Stats={p2All.opponent}
          p1Name={p1Name}
          p2Name={p2Name}
        />
      </div>
    </div>
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3 text-center text-gray-300">Pressure Situations</h3>
      <H2HPressureRadarChart
        p1Stats={p1All.pressure}
        p2Stats={p2All.pressure}
        p1Name={p1Name}
        p2Name={p2Name}
      />
    </div>
    </>
  );
}
