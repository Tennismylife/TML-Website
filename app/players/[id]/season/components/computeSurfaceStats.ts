/**
 * Pure (non-React) computation of surface stats (career stats filtered by surface).
 * Mirrors the structure of computeYearStats.ts but filters by surface instead of year.
 */

import type { Match } from "@/types";
import type {
  TourneyTile,
  SurfaceAgg,
  RoundAgg,
  LevelAgg,
  VsRankAgg,
  SetsAgg,
  GamesAgg,
  TiebreakAgg,
} from "./computeYearStats";

export type SurfaceStatsResult = {
  tourneysForSurface: TourneyTile[];
  careerAgg:          { wins: number; losses: number; total: number; pct: number };
  yearsAgg:           Array<{ year: number; wins: number; losses: number; total: number; pct: number }>;
  yearsBreakdown:     Array<{ year: number; wins: number; losses: number; total: number; pct: number; titles: number; finals: number; sf: number; qf: number; r16: number; r32: number; r64: number; r128: number }>;
  levelsAgg:          LevelAgg[];
  vsRankAgg:          VsRankAgg[];
  roundsAgg:          RoundAgg[];
  setsAgg:            SetsAgg;
  gamesAgg:           GamesAgg;
  tiebreakAgg:        TiebreakAgg;
};

function toDate(d: string | Date) {
  const dt = new Date(d as any);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

const roundWeight: Record<string, number> = {
  W: 7, F: 6, SF: 5, QF: 4, R16: 3, R32: 2, R64: 1, R128: 0.5, RR: 2.5, BR: 3.5,
  Q3: 0.3, Q2: 0.2, Q1: 0.1,
};
function getRoundScore(r?: string | null) { return r ? (roundWeight[r] ?? 0) : 0; }

function parseSetScores(score?: string | null): Array<{ a: number; b: number; tb: boolean }> {
  if (!score) return [];
  const tokens = score.trim().split(/\s+/);
  const hasEarlyEnd = /\b(RET|ABD|DEF|W\/O|WO)\b/i.test(score);
  const sets: Array<{ a: number; b: number; tb: boolean }> = [];
  tokens.forEach((tok, idx) => {
    const m = tok.match(/^(\d+)\s*-\s*(\d+)(?:\s*\((\d+)\))?$/);
    if (!m) return;
    const a = parseInt(m[1], 10), b = parseInt(m[2], 10);
    const hasTB = !!m[3];
    const max = Math.max(a, b), diff = Math.abs(a - b);
    let completed = hasTB || max >= 10 || (max >= 6 && (diff >= 2 || max >= 7));
    if (!completed && hasEarlyEnd && idx === tokens.length - 1) return;
    sets.push({ a, b, tb: hasTB || max >= 10 });
  });
  return sets;
}

export function computeSurfaceStats(
  allMatches: Match[],
  surface: string,
  playerId: string
): SurfaceStatsResult {
  const surfaceMatches = allMatches.filter(
    (m) =>
      m.status === true &&
      typeof m.surface === 'string' &&
      m.surface.toLowerCase().includes(surface.toLowerCase())
  );
  const pid = String(playerId);

  // ── tourneysForSurface: group by tourney_name + year ──
  const groups = new Map<string, Match[]>();
  for (const m of surfaceMatches) {
    if (m.team_event) continue;
    const key = `${m.tourney_name ?? 'Unknown'}__${m.year ?? 'noyear'}`;
    const arr = groups.get(key);
    if (arr) arr.push(m); else groups.set(key, [m]);
  }
  const tiles: TourneyTile[] = [];
  for (const [, arr] of groups.entries()) {
    const rep = arr[0];
    const d   = toDate(rep.tourney_date ?? '') ?? new Date(0);
    let wins = 0, losses = 0, bestScore = 0, bestRound = rep.round ?? '-';
    let champion = false;
    for (const m of arr) {
      const isWinner = String(m.winner_id) === pid;
      if (isWinner) wins++; else losses++;
      const rs = getRoundScore(m.round);
      if (rs > bestScore) { bestScore = rs; bestRound = m.round ?? '-'; }
    }
    champion = arr.some((m) => m.round === 'F' && String(m.winner_id) === pid);
    tiles.push({
      key: `${rep.tourney_name ?? 'Unknown'}__${rep.year ?? 0}`,
      name: rep.tourney_name ?? 'Unknown',
      date: d,
      surface: rep.surface ?? null,
      level: rep.tourney_level ?? null,
      tourney_id: rep.tourney_id ?? null,
      tourney_slug: (rep as any).tourney_slug ?? null,
      matches: arr.length,
      wins, losses,
      bestRound: champion ? 'W' : bestRound,
      champion,
      year: rep.year ?? 0,
    });
  }
  const tourneysForSurface = tiles.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── careerAgg ──
  const careerWins = surfaceMatches.filter((m) => String(m.winner_id) === pid).length;
  const careerTotal = surfaceMatches.length;
  const careerAgg = {
    wins: careerWins,
    losses: careerTotal - careerWins,
    total: careerTotal,
    pct: careerTotal > 0 ? (careerWins / careerTotal) * 100 : 0,
  };

  // ── yearsAgg ──
  const yearMap = new Map<number, { wins: number; losses: number }>();
  for (const m of surfaceMatches) {
    const y = m.year ?? 0;
    const cur = yearMap.get(y) ?? { wins: 0, losses: 0 };
    if (String(m.winner_id) === pid) cur.wins++; else cur.losses++;
    yearMap.set(y, cur);
  }
  const yearsAgg = Array.from(yearMap.entries())
    .map(([year, { wins, losses }]) => ({ year, wins, losses, total: wins + losses, pct: (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0 }))
    .sort((a, b) => b.year - a.year);

  const seasonMap = new Map<number, { wins: number; losses: number; titles: number; finals: number; sf: number; qf: number; r16: number; r32: number; r64: number; r128: number }>();
  for (const m of surfaceMatches) {
    const year = m.year ?? 0;
    const current = seasonMap.get(year) ?? { wins: 0, losses: 0, titles: 0, finals: 0, sf: 0, qf: 0, r16: 0, r32: 0, r64: 0, r128: 0 };
    const isWinner = String(m.winner_id) === pid;
    if (isWinner) current.wins++; else current.losses++;
    if (m.round === 'F') {
      current.finals++;
      if (isWinner) current.titles++;
    }
    if (m.round === 'SF') current.sf++;
    if (m.round === 'QF') current.qf++;
    if (m.round === 'R16') current.r16++;
    if (m.round === 'R32') current.r32++;
    if (m.round === 'R64') current.r64++;
    if (m.round === 'R128') current.r128++;
    seasonMap.set(year, current);
  }
  const yearsBreakdown = Array.from(seasonMap.entries())
    .map(([year, row]) => ({
      year,
      ...row,
      total: row.wins + row.losses,
      pct: row.wins + row.losses > 0 ? (row.wins / (row.wins + row.losses)) * 100 : 0,
    }))
    .sort((a, b) => b.year - a.year);

  // ── levelsAgg ──
  const levelMap = new Map<string, { wins: number; losses: number }>();
  for (const m of surfaceMatches) {
    const key = m.tourney_level ?? 'Unknown';
    const cur = levelMap.get(key) ?? { wins: 0, losses: 0 };
    if (String(m.winner_id) === pid) cur.wins++; else cur.losses++;
    levelMap.set(key, cur);
  }
  const desiredOrder = ['G','M','A','B','O','D','C','F','Unknown'];
  const orderIdx = (lvl: string) => { const i = desiredOrder.indexOf((lvl || 'Unknown').toUpperCase()); return i === -1 ? 99 : i; };
  const levelsAgg: LevelAgg[] = Array.from(levelMap.entries())
    .map(([level, { wins, losses }]) => ({ level, wins, losses, total: wins + losses, pct: (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0 }))
    .sort((a, b) => { const oa = orderIdx(a.level), ob = orderIdx(b.level); return oa !== ob ? oa - ob : a.level.localeCompare(b.level); });

  // ── vsRankAgg ──
  const rankDefs: Array<{ id: string; label: string; test: (opp: number | null | undefined, self?: number | null | undefined) => boolean }> = [
    { id: 'Top1',    label: 'Vs Top 1',         test: (opp) => opp != null && opp === 1 },
    { id: 'Top5',    label: 'Vs Top 5',         test: (opp) => opp != null && opp <= 5 },
    { id: 'Top10',   label: 'Vs Top 10',        test: (opp) => opp != null && opp <= 10 },
    { id: 'Top20',   label: 'Vs Top 20',        test: (opp) => opp != null && opp <= 20 },
    { id: 'Top50',   label: 'Vs Top 50',        test: (opp) => opp != null && opp <= 50 },
    { id: 'Top100',  label: 'Vs Top 100',       test: (opp) => opp != null && opp <= 100 },
    { id: '101+',    label: 'Vs 101+',          test: (opp) => opp != null && opp >= 101 },
    { id: 'Higher',  label: 'Vs higher ranked', test: (opp, self) => opp != null && self != null && opp < self },
    { id: 'Lower',   label: 'Vs lower ranked',  test: (opp, self) => opp != null && self != null && opp > self },
    { id: 'Unknown', label: 'Unknown rank',     test: (opp) => opp == null },
  ];
  const vsRankAgg: VsRankAgg[] = rankDefs.map((def) => {
    let wins = 0, losses = 0;
    for (const m of surfaceMatches) {
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
  for (const m of surfaceMatches) {
    const round = m.round || 'Unknown';
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
  for (const m of surfaceMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets = parseSetScores(m.score);
    for (const s of sets) {
      if (iAmWinner) { if (s.a > s.b) setWins++; else if (s.a < s.b) setLosses++; }
      else            { if (s.b > s.a) setWins++; else if (s.b < s.a) setLosses++; }
    }
  }
  const setsTotal = setWins + setLosses;
  const setsAgg: SetsAgg = { wins: setWins, losses: setLosses, total: setsTotal, pct: setsTotal > 0 ? (setWins / setsTotal) * 100 : 0 };

  // ── gamesAgg ──
  let wonGames = 0, lostGames = 0;
  for (const m of surfaceMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets = parseSetScores(m.score);
    for (const s of sets) {
      if (s.tb && Math.max(s.a, s.b) >= 10) continue;
      if (iAmWinner) { wonGames += s.a; lostGames += s.b; }
      else            { wonGames += s.b; lostGames += s.a; }
    }
  }
  const gamesTotal = wonGames + lostGames;
  const gamesAgg: GamesAgg = { won: wonGames, lost: lostGames, total: gamesTotal, pct: gamesTotal > 0 ? (wonGames / gamesTotal) * 100 : 0 };

  // ── tiebreakAgg ──
  let stdW = 0, stdL = 0, supW = 0, supL = 0;
  for (const m of surfaceMatches) {
    const iAmWinner = String(m.winner_id) === pid;
    const sets = parseSetScores(m.score);
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
    tourneysForSurface,
    careerAgg,
    yearsAgg,
    yearsBreakdown,
    levelsAgg,
    vsRankAgg,
    roundsAgg,
    setsAgg,
    gamesAgg,
    tiebreakAgg,
  };
}

export const emptySurfaceStats: SurfaceStatsResult = {
  tourneysForSurface: [],
  careerAgg:          { wins: 0, losses: 0, total: 0, pct: 0 },
  yearsAgg:           [],
  yearsBreakdown:     [],
  levelsAgg:          [],
  vsRankAgg:          [],
  roundsAgg:          [],
  setsAgg:            { wins: 0, losses: 0, total: 0, pct: 0 },
  gamesAgg:           { won: 0, lost: 0, total: 0, pct: 0 },
  tiebreakAgg: {
    standard: { wins: 0, losses: 0, total: 0, pct: 0 },
    super:    { wins: 0, losses: 0, total: 0, pct: 0 },
    overall:  { wins: 0, losses: 0, total: 0, pct: 0 },
  },
};
