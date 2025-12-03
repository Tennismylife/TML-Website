import { useMemo } from "react";
import type { Match } from "@/types";

type TourneyTile = {
  key: string;
  name: string;
  date: Date;
  surface: string | null;
  level: string | null;
  tourney_id: string | null;
  matches: number;
  wins: number;
  losses: number;
  bestRound: string;
  champion: boolean;
  year: number;
};

type SurfaceAgg = { surface: string; matches: number; wins: number; losses: number; pct: number };
type RoundAgg = { round: string; matches: number; wins: number; losses: number; pct: number };
type LevelAgg = { level: string; wins: number; losses: number; total: number; pct: number };
type VsRankAgg = { id: string; label: string; wins: number; losses: number; total: number; pct: number };
type SetsAgg = { wins: number; losses: number; total: number; pct: number };
type GamesAgg = { won: number; lost: number; total: number; pct: number };
type TiebreakAgg = {
  standard: { wins: number; losses: number; total: number; pct: number };
  super: { wins: number; losses: number; total: number; pct: number };
  overall: { wins: number; losses: number; total: number; pct: number };
};

function toDate(d: string | Date) {
  const dt = new Date(d as any);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

const roundWeight: Record<string, number> = {
  W: 7,
  F: 6,
  SF: 5,
  QF: 4,
  R16: 3,
  R32: 2,
  R64: 1,
  R128: 0.5,
  RR: 2.5,
  BR: 3.5,
  Q3: 0.3,
  Q2: 0.2,
  Q1: 0.1,
};

function getRoundScore(r?: string | null) {
  if (!r) return 0;
  return roundWeight[r] ?? 0;
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
    const diff = Math.abs(a - b);

    let completed = hasTB || max >= 10 || (max >= 6 && (diff >= 2 || max >= 7));
    if (!completed && hasEarlyEnd && idx === tokens.length - 1) return;

    sets.push({ a, b, tb: hasTB || max >= 10 });
  });

  return sets;
}

export function useYearStats(allMatches: Match[], selectedYear: number | "All", playerId: string) {
  // Filtra i match una volta sola
  const yearMatches = useMemo(
    () =>
      allMatches.filter(
        (m) => m.status === true && (selectedYear === "All" ? true : m.year === selectedYear)
      ),
    [allMatches, selectedYear]
  );

  const tourneysForYear = useMemo<TourneyTile[]>(() => {
    if (selectedYear === "All") return [];
    const groups = new Map<string, Match[]>();
    for (const m of yearMatches) {
      const d = toDate(m.tourney_date);
      const key = `${m.tourney_name ?? "Unknown"}__${d ? d.toISOString().slice(0, 10) : "nodate"}`;
      const arr = groups.get(key);
      if (arr) arr.push(m);
      else groups.set(key, [m]);
    }

    const tiles: TourneyTile[] = [];
    for (const [key, arr] of groups.entries()) {
      const rep = arr[0];
      const d = toDate(rep.tourney_date)!;

      let wins = 0, losses = 0, bestScore = 0, bestRound = rep.round ?? "-", champion = false;

      for (const m of arr) {
        const isWinner = String(m.winner_id) === String(playerId);
        if (isWinner) wins++; else losses++;
        const rs = getRoundScore(m.round);
        if (rs > bestScore) { bestScore = rs; bestRound = m.round ?? "-"; }
      }

      champion = arr.some((m) => m.round === "F" && String(m.winner_id) === String(playerId));

      tiles.push({
        key,
        name: rep.tourney_name ?? "Unknown",
        date: d,
        surface: rep.surface ?? null,
        level: rep.tourney_level ?? null,
        tourney_id: rep.tourney_id ?? null,
        matches: arr.length,
        wins,
        losses,
        bestRound: champion ? "W" : bestRound,
        champion,
        year: selectedYear,
      });
    }

    return tiles.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [yearMatches, playerId, selectedYear]);

  const seasonAgg = useMemo(() => {
    const wins = yearMatches.filter((m) => String(m.winner_id) === String(playerId)).length;
    const total = yearMatches.length;
    return { wins, losses: total - wins, total, pct: total > 0 ? (wins / total) * 100 : 0 };
  }, [yearMatches, playerId]);

  const surfacesAgg = useMemo<SurfaceAgg[]>(() => {
    const agg = new Map<string, { matches: number; wins: number; losses: number }>();
    for (const m of yearMatches) {
      const surface = m.surface || "Unknown";
      const isWinner = String(m.winner_id) === String(playerId);
      const existing = agg.get(surface) || { matches: 0, wins: 0, losses: 0 };
      existing.matches++;
      if (isWinner) existing.wins++; else existing.losses++;
      agg.set(surface, existing);
    }
    return Array.from(agg.entries())
      .map(([surface, data]) => ({ surface, ...data, pct: data.matches > 0 ? (data.wins / data.matches) * 100 : 0 }))
      .sort((a, b) => b.matches - a.matches);
  }, [yearMatches, playerId]);

  const levelsAgg = useMemo<LevelAgg[]>(() => {
    const byLevel = new Map<string, { wins: number; losses: number }>();
    for (const m of yearMatches) {
      const key = m.tourney_level ?? "Unknown";
      const cur = byLevel.get(key) ?? { wins: 0, losses: 0 };
      if (String(m.winner_id) === String(playerId)) cur.wins++; else cur.losses++;
      byLevel.set(key, cur);
    }
    const desiredOrder = ["G","M","A","B","O","D","C","F","Unknown"];
    const orderIdx = (lvl: string) => { const i = desiredOrder.indexOf((lvl||"Unknown").toUpperCase()); return i===-1?99:i; };
    return Array.from(byLevel.entries())
      .map(([level, { wins, losses }]) => ({ level, wins, losses, total: wins+losses, pct: (wins+losses>0)?(wins/(wins+losses))*100:0 }))
      .sort((a,b) => { const oa=orderIdx(a.level), ob=orderIdx(b.level); return oa!==ob?oa-ob:a.level.localeCompare(b.level); });
  }, [yearMatches, playerId]);

  const vsRankAgg = useMemo<VsRankAgg[]>(() => {
    const defs: Array<{id:string,label:string,test:(opp:number|null|undefined,self?:number|null|undefined)=>boolean}> = [
      { id: "Top1", label: "Vs Top 1", test: (opp) => opp!=null && opp===1 },
      { id: "Top5", label: "Vs Top 5", test: (opp) => opp!=null && opp<=5 },
      { id: "Top10", label: "Vs Top 10", test: (opp) => opp!=null && opp<=10 },
      { id: "Top20", label: "Vs Top 20", test: (opp) => opp!=null && opp<=20 },
      { id: "Top50", label: "Vs Top 50", test: (opp) => opp!=null && opp<=50 },
      { id: "Top100", label: "Vs Top 100", test: (opp) => opp!=null && opp<=100 },
      { id: "101+", label: "Vs 101+", test: (opp) => opp!=null && opp>=101 },
      { id: "Higher", label: "Vs higher ranked", test: (opp,self)=> opp!=null && self!=null && opp<self },
      { id: "Lower", label: "Vs lower ranked", test: (opp,self)=> opp!=null && self!=null && opp>self },
      { id: "Unknown", label: "Unknown rank", test: (opp)=>opp==null },
    ];

    return defs.map(def=>{
      let wins=0, losses=0;
      for(const m of yearMatches){
        const iAmWinner = String(m.winner_id)===String(playerId);
        const oppRank = iAmWinner ? m.loser_rank : m.winner_rank;
        const selfRank = iAmWinner ? m.winner_rank : m.loser_rank;
        if(!def.test(oppRank,selfRank)) continue;
        if(iAmWinner) wins++; else losses++;
      }
      const total = wins+losses;
      return { id:def.id, label:def.label, wins, losses, total, pct: total>0?(wins/total)*100:0 };
    });
  }, [yearMatches, playerId]);

  const roundsAgg = useMemo<RoundAgg[]>(() => {
    const agg = new Map<string, { matches: number; wins: number; losses: number }>();
    for (const m of yearMatches) {
      const round = m.round || "Unknown";
      const isWinner = String(m.winner_id) === String(playerId);
      const existing = agg.get(round) || { matches: 0, wins: 0, losses: 0 };
      existing.matches++;
      if (isWinner) existing.wins++; else existing.losses++;
      agg.set(round, existing);
    }
    return Array.from(agg.entries())
      .map(([round,data])=>({ round, ...data, pct:data.matches>0?(data.wins/data.matches)*100:0 }))
      .sort((a,b)=>b.matches-a.matches);
  }, [yearMatches, playerId]);

  const setsAgg = useMemo<SetsAgg>(() => {
    let setWins=0,setLosses=0;
    for(const m of yearMatches){
      const iAmWinner = String(m.winner_id) === String(playerId);
      const sets = parseSetScores(m.score);
      for(const s of sets){
        if(iAmWinner){ if(s.a>s.b) setWins++; else if(s.a<s.b) setLosses++; }
        else { if(s.b>s.a) setWins++; else if(s.b<s.a) setLosses++; }
      }
    }
    const total = setWins+setLosses;
    return { wins:setWins, losses:setLosses, total, pct: total>0?(setWins/total)*100:0 };
  }, [yearMatches, playerId]);

  const gamesAgg = useMemo<GamesAgg>(() => {
    let won=0, lost=0;
    for(const m of yearMatches){
      const iAmWinner = String(m.winner_id) === String(playerId);
      const sets = parseSetScores(m.score);
      for(const s of sets){
        const isSuperTB = s.tb && Math.max(s.a,s.b)>=10;
        if(isSuperTB) continue;
        if(iAmWinner){ won+=s.a; lost+=s.b; } else { won+=s.b; lost+=s.a; }
      }
    }
    const total = won+lost;
    return { won, lost, total, pct: total>0?(won/total)*100:0 };
  }, [yearMatches, playerId]);

  const tiebreakAgg = useMemo<TiebreakAgg>(()=>{
    let stdW=0,stdL=0,supW=0,supL=0;
    for(const m of yearMatches){
      const iAmWinner = String(m.winner_id)===String(playerId);
      const sets = parseSetScores(m.score);
      for(const s of sets){
        const maxG = Math.max(s.a,s.b), minG = Math.min(s.a,s.b);
        const isSuperTB = maxG>=10;
        const isStdTB = !isSuperTB && ((s.tb && maxG<10) || (maxG===7 && minG===6));
        if(!isStdTB && !isSuperTB) continue;
        const myGames = iAmWinner ? s.a : s.b, oppGames = iAmWinner ? s.b : s.a;
        if(isStdTB){ if(myGames>oppGames) stdW++; else if(myGames<oppGames) stdL++; }
        if(isSuperTB){ if(myGames>oppGames) supW++; else if(myGames<oppGames) supL++; }
      }
    }
    const stdT=stdW+stdL, supT=supW+supL, allW=stdW+supW, allL=stdL+supL, allT=allW+allL;
    return {
      standard:{ wins:stdW, losses:stdL, total:stdT, pct:stdT>0?(stdW/stdT)*100:0 },
      super:{ wins:supW, losses:supL, total:supT, pct:supT>0?(supW/supT)*100:0 },
      overall:{ wins:allW, losses:allL, total:allT, pct:allT>0?(allW/allT)*100:0 }
    };
  }, [yearMatches, playerId]);

  return {
    tourneysForYear,
    seasonAgg,
    surfacesAgg,
    levelsAgg,
    vsRankAgg,
    roundsAgg,
    setsAgg,
    gamesAgg,
    tiebreakAgg
  };
}
