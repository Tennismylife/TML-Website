/**
 * Pure (non-React) computation of season stats.
 * Designed to run inside requestIdleCallback or a Web Worker.
 */

import type { Match } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourneyTile = {
  key: string;
  name: string;
  date: Date;
  surface: string | null;
  level: string | null;
  tourney_id: string | null;
  tourney_slug?: string | null;
  matches: number;
  wins: number;
  losses: number;
  bestRound: string;
  champion: boolean;
  year: number;
};

export type SurfaceAgg   = { surface: string; matches: number; wins: number; losses: number; pct: number };
export type RoundAgg     = { round: string; matches: number; wins: number; losses: number; pct: number };
export type LevelAgg     = { level: string; wins: number; losses: number; total: number; pct: number };
export type VsRankAgg    = { id: string; label: string; wins: number; losses: number; total: number; pct: number };
export type SetsAgg      = { wins: number; losses: number; total: number; pct: number };
export type GamesAgg     = { won: number; lost: number; total: number; pct: number };
export type TiebreakAgg  = {
  standard: { wins: number; losses: number; total: number; pct: number };
  super:    { wins: number; losses: number; total: number; pct: number };
  overall:  { wins: number; losses: number; total: number; pct: number };
};

export type YearStatsResult = {
  tourneysForYear: TourneyTile[];
  seasonAgg:       { wins: number; losses: number; total: number; pct: number };
  surfacesAgg:     SurfaceAgg[];
  levelsAgg:       LevelAgg[];
  vsRankAgg:       VsRankAgg[];
  roundsAgg:       RoundAgg[];
  setsAgg:         SetsAgg;
  gamesAgg:        GamesAgg;
  tiebreakAgg:     TiebreakAgg;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDate(d: string | Date) {
  const dt = new Date(d as any);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

const roundWeight: Record<string, number> = {
  W: 7, F: 6, SF: 5, QF: 4, R16: 3, R32: 2, R64: 1, R128: 0.5, RR: 2.5, BR: 3.5,
  Q3: 0.3, Q2: 0.2, Q1: 0.1,
};

function getRoundScore(r?: string | null) {
  return r ? (roundWeight[r] ?? 0) : 0;
}

function parseSetScores(score?: string | null): Array<{ a: number; b: number; tb: boolean }> {
  if (!score) return [];
  const tokens = score.trim().split(/\s+/);
  const hasEarlyEnd = /\b(RET|ABD|DEF|W\/O|WO)\b/i.test(score);
  const sets: Array<{ a: number; b: number; tb: boolean }> = [];

  tokens.forEach((tok, idx) => {
    const m = tok.match(/^(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\))?$/);
    if (!m) return;
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const hasTB = !!m[3];
    const max  = Math.max(a, b);
    const diff = Math.abs(a - b);
    let completed = hasTB || max >= 10 || (max >= 6 && (diff >= 2 || max >= 7));
    if (!completed && hasEarlyEnd && idx === tokens.length - 1) return;
    sets.push({ a, b, tb: hasTB || max >= 10 });
  });

  return sets;
}

// ── Main computation ──────────────────────────────────────────────────────────

export function computeYearStats(
  allMatches: Match[],
  selectedYear: number,
  playerId: string
): YearStatsResult {
  // Single pass filter
  const yearMatches = allMatches.filter(
    (m) => m.status === true && m.year === selectedYear
  );
  const pid = String(playerId);

  // ── tourneysForYear ──
  const groups = new Map<string, Match[]>();
  for (const m of yearMatches) {
    if (m.team_event) continue;
    const key = `${m.tourney_name ?? "Unknown"}__${m.year ?? "noyear"}`;
    const arr = groups.get(key);
    if (arr) arr.push(m);
    else groups.set(key, [m]);
  }
  const tiles: TourneyTile[] = [];
  for (const [, arr] of groups.entries()) {
    const rep = arr[0];
    const d   = toDate(rep.tourney_date ?? "") ?? new Date(0);
    let wins = 0, losses = 0, bestScore = 0, bestRound = rep.round ?? "-";
    let champion = false;
    for (const m of arr) {
      const isWinner = String(m.winner_id) === pid;
      if (isWinner) wins++; else losses++;
      const rs = getRoundScore(m.round);
      if (rs > bestScore) { bestScore = rs; bestRound = m.round ?? "-"; }
    }
    champion = arr.some((m) => m.round === "F" && String(m.winner_id) === pid);
    tiles.push({
      key: `${rep.tourney_name ?? "Unknown"}__${selectedYear}`,
      name: rep.tourney_name ?? "Unknown",
      date: d,
      surface: rep.surface ?? null,
      level: rep.tourney_level ?? null,
      tourney_id: rep.tourney_id ?? null,
      tourney_slug: (rep as any).tourney_slug ?? null,
      matches: arr.length,
      wins, losses,
      bestRound: champion ? "W" : bestRound,
      champion,
      year: selectedYear,
    });
  }
  const tourneysForYear = tiles.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // ── seasonAgg ──
  const seasonWins = yearMatches.filter((m) => String(m.winner_id) === pid).length;
  const seasonTotal = yearMatches.length;
  const seasonAgg = {
    wins: seasonWins,
    losses: seasonTotal - seasonWins,
    total: seasonTotal,
    pct: seasonTotal > 0 ? (seasonWins / seasonTotal) * 100 : 0,
  };

  // ── surfacesAgg ──
  const surfaceMap = new Map<string, { matches: number; wins: number; losses: number }>();
  for (const m of yearMatches) {
    const surface   = m.surface || "Unknown";
    const isWinner  = String(m.winner_id) === pid;
    const ex = surfaceMap.get(surface) ?? { matches: 0, wins: 0, losses: 0 };
    ex.matches++; if (isWinner) ex.wins++; else ex.losses++;
    surfaceMap.set(surface, ex);
  }
  const surfacesAgg: SurfaceAgg[] = Array.from(surfaceMap.entries())
    .map(([surface, data]) => ({ surface, ...data, pct: data.matches > 0 ? (data.wins / data.matches) * 100 : 0 }))
    .sort((a, b) => b.matches - a.matches);

  // ── levelsAgg ──
  const levelMap = new Map<string, { wins: number; losses: number }>();
  for (const m of yearMatches) {
    const key = m.tourney_level ?? "Unknown";
    const cur = levelMap.get(key) ?? { wins: 0, losses: 0 };
    if (String(m.winner_id) === pid) cur.wins++; else cur.losses++;
    levelMap.set(key, cur);
  }
  const desiredOrder = ["G","M","A","B","O","D","C","F","Unknown"];
  const orderIdx     = (lvl: string) => { const i = desiredOrder.indexOf((lvl || "Unknown").toUpperCase()); return i === -1 ? 99 : i; };
  const levelsAgg: LevelAgg[] = Array.from(levelMap.entries())
    .map(([level, { wins, losses }]) => ({ level, wins, losses, total: wins + losses, pct: (wins + losses > 0) ? (wins / (wins + losses)) * 100 : 0 }))
    .sort((a, b) => { const oa = orderIdx(a.level), ob = orderIdx(b.level); return oa !== ob ? oa - ob : a.level.localeCompare(b.level); });

  // ── vsRankAgg ──
  const rankDefs: Array<{ id: string; label: string; test: (opp: number | null | undefined, self?: number | null | undefined) => boolean }> = [
    { id: "Top1",    label: "Vs Top 1",           test: (opp) => opp != null && opp === 1 },
    { id: "Top5",    label: "Vs Top 5",           test: (opp) => opp != null && opp <= 5 },
    { id: "Top10",   label: "Vs Top 10",          test: (opp) => opp != null && opp <= 10 },
    { id: "Top20",   label: "Vs Top 20",          test: (opp) => opp != null && opp <= 20 },
    { id: "Top50",   label: "Vs Top 50",          test: (opp) => opp != null && opp <= 50 },
    { id: "Top100",  label: "Vs Top 100",         test: (opp) => opp != null && opp <= 100 },
    { id: "101+",    label: "Vs 101+",            test: (opp) => opp != null && opp >= 101 },
    { id: "Higher",  label: "Vs higher ranked",   test: (opp, self) => opp != null && self != null && opp < self },
    { id: "Lower",   label: "Vs lower ranked",    test: (opp, self) => opp != null && self != null && opp > self },
    { id: "Unknown", label: "Unknown rank",       test: (opp) => opp == null },
  ];
  const vsRankAgg: VsRankAgg[] = rankDefs.map((def) => {
    let wins = 0, losses = 0;
    for (const m of yearMatches) {
      const iAmWinner = String(m.winner_id) === pid;
      const oppRank   = iAmWinner ? m.loser_rank  : m.winner_rank;
      const selfRank  = iAmWinner ? m.winner_rank : m.loser_rank;
      if (!def.test(oppRank, selfRank)) continue;
      if (iAmWinner) wins++; else losses++;
    }
    const total = wins + losses;
    return { id: def.id, label: def.label, wins, losses, total, pct: total > 0 ? (wins / total) * 100 : 0 };
  });

  // ── roundsAgg ──
  const roundMap = new Map<string, { matches: number; wins: number; losses: number }>();
  for (const m of yearMatches) {
    const round    = m.round || "Unknown";
    const isWinner = String(m.winner_id) === pid;
    const ex = roundMap.get(round) ?? { matches: 0, wins: 0, losses: 0 };
    ex.matches++; if (isWinner) ex.wins++; else ex.losses++;
    roundMap.set(round, ex);
  }
  const roundsAgg: RoundAgg[] = Array.from(roundMap.entries())
    .map(([round, data]) => ({ round, ...data, pct: data.matches > 0 ? (data.wins / data.matches) * 100 : 0 }))
    .sort((a, b) => b.matches - a.matches);

  // ── setsAgg ──
  let setWins = 0, setLosses = 0;
  for (const m of yearMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets      = parseSetScores(m.score);
    for (const s of sets) {
      if (iAmWinner) { if (s.a > s.b) setWins++; else if (s.a < s.b) setLosses++; }
      else            { if (s.b > s.a) setWins++; else if (s.b < s.a) setLosses++; }
    }
  }
  const setsTotal = setWins + setLosses;
  const setsAgg: SetsAgg = { wins: setWins, losses: setLosses, total: setsTotal, pct: setsTotal > 0 ? (setWins / setsTotal) * 100 : 0 };

  // ── gamesAgg ──
  let wonGames = 0, lostGames = 0;
  for (const m of yearMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets      = parseSetScores(m.score);
    for (const s of sets) {
      if (s.tb && Math.max(s.a, s.b) >= 10) continue; // skip super-TB
      if (iAmWinner) { wonGames += s.a; lostGames += s.b; }
      else            { wonGames += s.b; lostGames += s.a; }
    }
  }
  const gamesTotal = wonGames + lostGames;
  const gamesAgg: GamesAgg = { won: wonGames, lost: lostGames, total: gamesTotal, pct: gamesTotal > 0 ? (wonGames / gamesTotal) * 100 : 0 };

  // ── tiebreakAgg ──
  let stdW = 0, stdL = 0, supW = 0, supL = 0;
  for (const m of yearMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets      = parseSetScores(m.score);
    for (const s of sets) {
      const maxG = Math.max(s.a, s.b), minG = Math.min(s.a, s.b);
      const isSuperTB = maxG >= 10;
      const isStdTB   = !isSuperTB && ((s.tb && maxG < 10) || (maxG === 7 && minG === 6));
      if (!isStdTB && !isSuperTB) continue;
      const myGames  = iAmWinner ? s.a : s.b;
      const oppGames = iAmWinner ? s.b : s.a;
      if (isStdTB) { if (myGames > oppGames) stdW++; else if (myGames < oppGames) stdL++; }
      if (isSuperTB){ if (myGames > oppGames) supW++; else if (myGames < oppGames) supL++; }
    }
  }
  const stdT = stdW + stdL, supT = supW + supL, allW = stdW + supW, allL = stdL + supL, allT = allW + allL;
  const tiebreakAgg: TiebreakAgg = {
    standard: { wins: stdW, losses: stdL, total: stdT, pct: stdT > 0 ? (stdW / stdT) * 100 : 0 },
    super:    { wins: supW, losses: supL, total: supT, pct: supT > 0 ? (supW / supT) * 100 : 0 },
    overall:  { wins: allW, losses: allL, total: allT, pct: allT > 0 ? (allW / allT) * 100 : 0 },
  };

  return {
    tourneysForYear,
    seasonAgg,
    surfacesAgg,
    levelsAgg,
    vsRankAgg,
    roundsAgg,
    setsAgg,
    gamesAgg,
    tiebreakAgg,
  };
}

export const emptyYearStats: YearStatsResult = {
  tourneysForYear: [],
  seasonAgg:       { wins: 0, losses: 0, total: 0, pct: 0 },
  surfacesAgg:     [],
  levelsAgg:       [],
  vsRankAgg:       [],
  roundsAgg:       [],
  setsAgg:         { wins: 0, losses: 0, total: 0, pct: 0 },
  gamesAgg:        { won: 0, lost: 0, total: 0, pct: 0 },
  tiebreakAgg: {
    standard: { wins: 0, losses: 0, total: 0, pct: 0 },
    super:    { wins: 0, losses: 0, total: 0, pct: 0 },
    overall:  { wins: 0, losses: 0, total: 0, pct: 0 },
  },
};
