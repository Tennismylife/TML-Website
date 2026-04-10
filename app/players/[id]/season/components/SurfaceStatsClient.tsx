"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import useIncrementalCards from "@/lib/hooks/useIncrementalCards";
import type { Match } from "@/types";
import { getLevelColors, getLevelFullName, getTourneyHref, getPlayerHref, getPlayerHrefWithTab, formatDateISO, getRoundIndex } from "@/lib/utils";
import Flag from "@/components/Flag";
import { getSurfaceColor, palette } from "@/lib/colors";
import TournamentCompactList from "./TournamentCompactList";
import PlayerServiceSpider from "./PlayerServiceSpider";
import PlayerReturnSpider from "./PlayerReturnSpider";
import { computeSurfaceStats, emptySurfaceStats, type SurfaceStatsResult } from "./computeSurfaceStats";

interface SurfaceStatsClientProps {
  playerId: string;
  playerSlug?: string | null;
  playerName?: string | null;
  surface: string; // e.g. 'Clay', 'Hard', 'Grass'
  initialMatches?: Match[];
  initialStats?: SurfaceStatsResult | null;
  // player bio fields (for Overview card)
  birthdate?: Date | string | null;
  hand?: string | null;
  backhand?: string | null;
  height?: number | null;
  weight?: number | null;
  turnedpro?: number | null;
  coaches?: string | null;
  ioc?: string | null;
  // SSR-rendered career overview + last 10 matches (for Google/SEO)
  overviewSlot?: React.ReactNode;
}

function calcAge(bd: Date | string): { years: number; days: number } {
  const birth = new Date(bd);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const thisYearBday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
  if (now < thisYearBday) years--;
  const lastBday = new Date(
    now.getFullYear() - (now < thisYearBday ? 1 : 0),
    birth.getMonth(),
    birth.getDate()
  );
  const days = Math.floor((now.getTime() - lastBday.getTime()) / 86400000);
  return { years, days };
}

const YearByYearBreakdownTable: React.FC<{
  rows: Array<{ year: number; wins: number; losses: number; pct: number; total: number; titles: number; finals: number; sf: number; qf: number; r16: number; r32: number; r64: number; r128: number }>;
}> = ({ rows }) => {
  if (!rows.length) return null;

  return (
    <div className="relative mt-10">
      <div
        className="absolute -top-4 -left-3 bg-yellow-400 text-white px-5 py-2 rounded-r-xl shadow-xl font-extrabold text-base tracking-wide border border-yellow-500/70 z-20"
        style={{ boxShadow: "2px 3px 10px rgba(0,0,0,0.5)", borderLeft: "4px solid rgba(0,0,0,0.3)", transform: "translateY(-4px)", minWidth: "230px", whiteSpace: "nowrap" }}
      >
        Year-by-year breakdown
      </div>
      <div className="relative border-l-4 border-yellow-400 bg-gray-800 p-6 pl-8 pt-8 shadow-xl rounded-2xl overflow-visible">
        <div className="mx-auto w-[93%] overflow-x-auto rounded-xl border border-white/10 bg-gray-900/60">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black/40">
                <th className="border border-white/10 px-3 py-2 text-center text-white">Year</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">W</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">L</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">%</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">Titles 🏆</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">F</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">SF</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">QF</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">R16</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">R32</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">R64</th>
                <th className="border border-white/10 px-3 py-2 text-center text-white">R128</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                return (
                  <tr key={row.year} className="text-gray-200 even:bg-white/5">
                      <td className="border border-white/10 px-3 py-2 text-center font-semibold text-yellow-300">{row.year}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-green-400">{row.wins}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-red-400">{row.losses}</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-blue-400">{row.pct.toFixed(1)}%</td>
                    <td className="border border-white/10 px-3 py-2 text-center text-yellow-400">{row.titles}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.finals}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.sf}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.qf}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.r16}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.r32}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.r64}</td>
                    <td className="border border-white/10 px-3 py-2 text-center">{row.r128}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ===================== WLStatTable (local copy, same as Seasons) =====================
interface WLRow { label: string; wins: number; losses: number; color?: string; }
const WLStatTable: React.FC<{ title: string; rows: WLRow[] }> = ({ title, rows }) => {
  const getTextColor = (hex: string) => {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000" : "#fff";
  };
  return (
    <div className="relative mt-10">
      <div
        className="absolute -top-4 -left-3 bg-yellow-400 text-black px-5 py-2 rounded-r-xl shadow-xl font-extrabold text-base tracking-wide border border-yellow-500/70 z-20"
        style={{ boxShadow: "2px 3px 10px rgba(0,0,0,0.5)", borderLeft: "4px solid rgba(0,0,0,0.3)", transform: "translateY(-4px)", minWidth: "160px", whiteSpace: "nowrap" }}
      >
        {title}
      </div>
      <div className="relative border-l-4 border-yellow-400 bg-gray-800 p-6 pl-8 pt-8 shadow-xl rounded-2xl overflow-visible">
        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => {
            const total = row.wins + row.losses;
            const pct = total > 0 ? (row.wins / total) * 100 : 0;
            const color = row.color || palette[idx % palette.length];
            return (
              <div key={`${row.label}-${idx}`} className="flex items-center gap-4 p-2 rounded-xl shadow-inner transition-all duration-300">
                <div className="w-32 font-semibold">{row.label}</div>
                <div className="flex-1 relative h-6 rounded overflow-hidden bg-gray-900/70">
                  <div className="h-6 rounded transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                  <div className="absolute inset-0 flex justify-center items-center text-sm font-medium text-blue-400">
                    {total > 0 ? `${pct.toFixed(1)}%` : "0%"}
                  </div>
                </div>
                <div className="w-32 flex justify-end font-mono">{row.wins}-{row.losses} ({total})</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const getTourneyLink = (tourneySlug?: string | null, tourneyId?: string | null, year?: number | null) => {
  if (!tourneySlug && !tourneyId) return "#";
  return getTourneyHref({ slug: tourneySlug ?? undefined, id: tourneyId ?? undefined, year: year ?? undefined });
};

export default function SurfaceStatsClient({
  playerId,
  playerSlug,
  playerName,
  surface,
  initialMatches,
  initialStats,
  birthdate,
  hand,
  backhand,
  height,
  weight,
  turnedpro,
  coaches,
  ioc,
  overviewSlot,
}: SurfaceStatsClientProps) {
  const [allMatches, setAllMatches] = useState<Match[]>(initialMatches ?? []);
  const [loading, setLoading] = useState<boolean>(!initialMatches || initialMatches.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [rankingData, setRankingData] = useState<{ currentRank: number | null; currentPoints: number | null; bestRank: number | null } | null>(null);
  const [rankingLoaded, setRankingLoaded] = useState(false);

  // Fetch all surface matches client-side if not provided by SSR
  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) return;
    let abort = false;
    setLoading(true);
    setError(null);

    const surfaceParam = surface === 'All' || surface === '' ? '' : `&surface=${encodeURIComponent(surface)}`;
    fetch(`/api/players/allmatches?id=${encodeURIComponent(playerId)}${surfaceParam}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Match[]) => {
        if (abort) return;
        setAllMatches(Array.isArray(data) ? data : (data as any)?.results ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (!abort) { setError(e.message); setLoading(false); }
      });

    return () => { abort = true; };
  }, [playerId, surface]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ranking data for the Overview info card (surface=All only)
  useEffect(() => {
    if (surface !== 'All' && surface !== '') return;
    let abort = false;
    fetch(`/api/players/current-ranking?id=${encodeURIComponent(playerId)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data: { ranking?: { rank: number; points: number; date: string; bestRank: number | null } | null } | null) => {
        if (abort) return;
        const r = data?.ranking;
        setRankingData(r ? { currentRank: r.rank, currentPoints: r.points, bestRank: r.bestRank } : null);
        setRankingLoaded(true);
      })
      .catch(() => { setRankingLoaded(true); }); // silently ignore ranking errors
    return () => { abort = true; };
  }, [playerId, surface]); // eslint-disable-line react-hooks/exhaustive-deps

  // Available years derived from all surface matches
  const availableYears = useMemo(() => {
    const ySet = new Set<number>();
    for (const m of allMatches) { if (m.year) ySet.add(m.year); }
    return Array.from(ySet).sort((a, b) => b - a);
  }, [allMatches]);

  // Matches filtered by selected year (null = all years)
  const filteredMatches = useMemo(
    () => selectedYear ? allMatches.filter((m) => m.year === selectedYear) : allMatches,
    [allMatches, selectedYear]
  );

  // Compute stats on filtered matches
  const stats: SurfaceStatsResult = useMemo(() => {
    if (!selectedYear && initialStats && (!allMatches.length || allMatches === initialMatches)) return initialStats;
    if (!filteredMatches.length) return emptySurfaceStats;
    return computeSurfaceStats(filteredMatches, surface, playerId);
  }, [filteredMatches, selectedYear, surface, playerId, initialStats, initialMatches, allMatches]);

  const {
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
  } = stats;

  // ── Overview narrative stats (all surfaces, no year selected) ──
  const overviewStats = useMemo(() => {
    if (selectedYear || loading || !allMatches.length) return null;
    const pid = String(playerId);
    const matches = allMatches.filter((m: any) => m.status === true);
    if (!matches.length) return null;

    const totalMatches = matches.length;
    const wins = matches.filter((m: any) => String(m.winner_id) === pid).length;
    const losses = totalMatches - wins;
    const winRateN = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    const winPct = `${winRateN.toFixed(1)}%`;

    const slamMatches = matches.filter((m: any) => m.tourney_level === 'G');
    const slamWins = slamMatches.filter((m: any) => String(m.winner_id) === pid).length;
    const slamLosses = slamMatches.length - slamWins;
    const slamTotal = slamMatches.length;
    const slamWinPctN = slamTotal > 0 ? (slamWins / slamTotal) * 100 : 0;

    const mastersMatches = matches.filter((m: any) => m.tourney_level === 'M');
    const mastersWins = mastersMatches.filter((m: any) => String(m.winner_id) === pid).length;
    const mastersLosses = mastersMatches.length - mastersWins;
    const mastersTotal = mastersMatches.length;
    const mastersWinPctN = mastersTotal > 0 ? (mastersWins / mastersTotal) * 100 : 0;

    const finalMatches = matches.filter((m: any) => m.round === 'F');
    const finalsReached = finalMatches.length;
    const totalTitles = finalMatches.filter((m: any) => String(m.winner_id) === pid && m.team_event !== true && !(m.score && String(m.score).includes('WEA')) && !String(m.tourney_name ?? '').toLowerCase().includes('next gen')).length;
    const titleNames = Array.from(new Set(
      finalMatches
        .filter((m: any) => String(m.winner_id) === pid && m.team_event !== true)
        .map((m: any) => typeof m.tourney_name === 'string' ? m.tourney_name : null)
        .filter(Boolean) as string[]
    ));

    const sfReached = matches.filter((m: any) => m.round === 'SF' && (String(m.winner_id) === pid || String(m.loser_id) === pid)).length;
    const qfReached = matches.filter((m: any) => m.round === 'QF' && (String(m.winner_id) === pid || String(m.loser_id) === pid)).length;

    const top10Matches = matches.filter((m: any) => {
      const iAmWinner = String(m.winner_id) === pid;
      const oppRank = iAmWinner ? m.loser_rank : m.winner_rank;
      return oppRank != null && oppRank <= 10;
    });
    const top10Wins = top10Matches.filter((m: any) => String(m.winner_id) === pid).length;
    const top10Losses = top10Matches.length - top10Wins;
    const top10Total = top10Matches.length;
    const top10WinPctN = top10Total > 0 ? (top10Wins / top10Total) * 100 : 0;

    const bo5Matches = matches.filter((m: any) => m.best_of === 5);
    const bo5Wins = bo5Matches.filter((m: any) => String(m.winner_id) === pid).length;
    const bo5Losses = bo5Matches.length - bo5Wins;
    const bo5Total = bo5Matches.length;
    const bo5WinPctN = bo5Total > 0 ? (bo5Wins / bo5Total) * 100 : 0;

    const bo3Matches = matches.filter((m: any) => m.best_of === 3);
    const bo3Wins = bo3Matches.filter((m: any) => String(m.winner_id) === pid).length;
    const bo3Losses = bo3Matches.length - bo3Wins;
    const bo3Total = bo3Matches.length;
    const bo3WinPctN = bo3Total > 0 ? (bo3Wins / bo3Total) * 100 : 0;

    const yearMap = new Map<number, { wins: number; total: number }>();
    for (const m of matches) {
      const y = (m as any).year ?? 0;
      if (!y) continue;
      const cur = yearMap.get(y) ?? { wins: 0, total: 0 };
      cur.total++;
      if (String((m as any).winner_id) === pid) cur.wins++;
      yearMap.set(y, cur);
    }
    let bestYear = '', bestYearWins = 0, bestYearTotal = 0;
    for (const [y, s] of yearMap.entries()) {
      if (s.total >= 5 && s.wins > bestYearWins) { bestYearWins = s.wins; bestYearTotal = s.total; bestYear = String(y); }
    }

    const sorted = [...matches].sort((a: any, b: any) => {
      const da = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
      const db = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
      return da - db;
    });
    let winStreak = 0, curStreak = 0;
    for (const m of sorted) {
      if (String((m as any).winner_id) === pid) { curStreak++; if (curStreak > winStreak) winStreak = curStreak; }
      else curStreak = 0;
    }

    const currentYear = new Date().getFullYear();
    const recentYearMatches = sorted.filter((m: any) => m.year === currentYear);
    const recentW = recentYearMatches.filter((m: any) => String(m.winner_id) === pid).length;
    const recentL = recentYearMatches.length - recentW;
    const recentYearTotal = recentYearMatches.length;
    const recentFormStr = recentYearMatches.slice(-10).map((m: any) => String(m.winner_id) === pid ? 'W' : 'L');
    const recentFormW = recentFormStr.filter((r: string) => r === 'W').length;

    const streakThreshold = totalMatches >= 200 ? 20 : totalMatches >= 100 ? 12 : totalMatches >= 50 ? 8 : 5;
    const titleConvRate = finalsReached > 0 ? totalTitles / finalsReached : 0;
    const displayName = playerName || String(playerId);

    // Titles breakdown by level
    const titlesByLevel: Record<string, number> = {};
    const titlesBySurface: Record<string, number> = {};
    finalMatches
      .filter((m: any) => String(m.winner_id) === pid && m.team_event !== true && !(m.score && String(m.score).includes('WEA')) && !String(m.tourney_name ?? '').toLowerCase().includes('next gen'))
      .forEach((m: any) => {
        const lvl = m.tourney_level ?? 'Other';
        titlesByLevel[lvl] = (titlesByLevel[lvl] || 0) + 1;
        const surf = m.surface ?? 'Unknown';
        titlesBySurface[surf] = (titlesBySurface[surf] || 0) + 1;
      });

    return { totalMatches, wins, losses, winRateN, winPct, slamWins, slamLosses, slamTotal, slamWinPctN, mastersWins, mastersLosses, mastersTotal, mastersWinPctN, finalsReached, totalTitles, titleNames, titlesByLevel, titlesBySurface, sfReached, qfReached, top10Wins, top10Losses, top10Total, top10WinPctN, bo5Wins, bo5Losses, bo5Total, bo5WinPctN, bo3Wins, bo3Losses, bo3Total, bo3WinPctN, bestYear, bestYearWins, bestYearTotal, winStreak, streakThreshold, currentYear, recentW, recentL, recentYearTotal, recentFormStr, recentFormW, titleConvRate, displayName };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface, selectedYear, allMatches, playerId, playerName, loading]);

  const SECTION_COUNT = 7;
  const computing = false;
  const { isMobile: isMobileCards, visibleCount, sentinelRef } = useIncrementalCards(
    !loading ? SECTION_COUNT : 0,
    { initialVisible: 1, debounceMs: 800 }
  );

  const isSurfacePage = surface !== 'All' && surface !== '';
  const surfaceLabel = surface === 'Clay' ? 'Clay Court' : surface === 'Hard' ? 'Hard Court' : surface === 'Grass' ? 'Grass Court' : `${surface} Court`;
  const surfAdj = surface.toLowerCase();

  return (
    <div className="w-full p-4 section" style={{ backgroundColor: "rgb(27,36,48)" }}>

      {/* Surface page H1 — shown below the tabs on clay/hard/grass */}
      {isSurfacePage && (
        <h1 className="text-3xl font-bold mb-6 text-center">{playerName} {surfaceLabel} Stats &amp; Match Results</h1>
      )}

      {/* Player info card — Overview landing only */}
      {surface === 'All' && !selectedYear && (
        <div className="mb-6 bg-gray-900 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
          {/* Card header */}
          <div className="bg-gray-800 px-5 py-3 flex items-center gap-3 border-b border-gray-700">
            {ioc && <Flag ioc={ioc} className="w-7 h-5" />}
            <span className="font-bold text-white text-base">{playerName || 'Player Profile'}</span>
            {/* Titles breakdown */}
            {overviewStats && overviewStats.totalTitles > 0 && (
              <div className="ml-auto flex flex-col items-end gap-1.5">
                {/* Total */}
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-400 text-sm">🏆</span>
                  <span className="text-yellow-300 font-black text-lg leading-none">{overviewStats.totalTitles}</span>
                  <span className="text-gray-400 text-xs">title{overviewStats.totalTitles !== 1 ? 's' : ''}</span>
                </div>
                {/* Per-category */}
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {(['G','M','F','500','A','250','B','C','D'] as const).map((lvl) => {
                    const lvlLabels: Record<string, string> = { G: 'Grand Slam', M: 'Masters 1000', F: 'Year-end Finals', '500': 'ATP 500', A: 'Others', '250': 'ATP 250', B: 'ATP 250', C: 'Challenger', D: 'Davis Cup' };
                    const count = overviewStats.titlesByLevel[lvl];
                    if (!count) return null;
                    return (
                      <span key={lvl} className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-gray-200">
                        <span className="text-yellow-300 font-bold">{count}</span>
                        <span className="text-gray-400 ml-1">{lvlLabels[lvl] ?? lvl}</span>
                      </span>
                    );
                  })}
                  {Object.entries(overviewStats.titlesByLevel)
                    .filter(([lvl]) => !['G','M','F','500','A','250','B','C','D'].includes(lvl))
                    .map(([lvl, count]) => (
                      <span key={lvl} className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-gray-200">
                        <span className="text-yellow-300 font-bold">{count}</span>
                        <span className="text-gray-400 ml-1">{lvl}</span>
                      </span>
                    ))
                  }
                </div>
                {/* Per-surface */}
                {Object.keys(overviewStats.titlesBySurface).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {(['Hard','Clay','Grass','Carpet'] as const).map((surf) => {
                      const surfColors: Record<string, string> = { Hard: '#3B82F6', Clay: '#F97316', Grass: '#22C55E', Carpet: '#A855F7' };
                      const count = overviewStats.titlesBySurface[surf];
                      if (!count) return null;
                      return (
                        <span key={surf} className="text-xs rounded px-2 py-0.5 font-semibold" style={{ backgroundColor: `${surfColors[surf]}22`, border: `1px solid ${surfColors[surf]}55`, color: surfColors[surf] }}>
                          {count} {surf}
                        </span>
                      );
                    })}
                    {Object.entries(overviewStats.titlesBySurface)
                      .filter(([s]) => !['Hard','Clay','Grass','Carpet'].includes(s))
                      .map(([s, count]) => (
                        <span key={s} className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-gray-200">
                          {count} {s}
                        </span>
                      ))
                    }
                  </div>
                )}
              </div>
            )}
          </div>
          {/* Card body: bio left, ranking+W-L right */}
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-700">
            {/* Bio column */}
            <div className="px-5 py-4 space-y-2 text-sm">
              {birthdate && (() => {
                const { years, days } = calcAge(birthdate);
                const bdStr = new Date(birthdate).toISOString().split('T')[0];
                return (
                  <div className="flex gap-2">
                    <span className="text-gray-400 w-28 shrink-0">Age</span>
                    <span className="text-white">{years}y {days}d <span className="text-gray-500 text-xs">({bdStr})</span></span>
                  </div>
                );
              })()}
              {hand && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Hand</span>
                  <span className="text-white">
                    {hand.trim().toUpperCase() === 'R' ? 'Right' : hand.trim().toUpperCase() === 'L' ? 'Left' : hand}
                  </span>
                </div>
              )}
              {backhand && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Backhand</span>
                  <span className="text-white">
                    {(() => {
                      const b = backhand.trim().toUpperCase();
                      if (b === '2H' || b === '2' || b.startsWith('TWO') || b.startsWith('2 H')) return '2 Hands';
                      if (b === '1H' || b === '1' || b.startsWith('ONE') || b.startsWith('1 H')) return '1 Hand';
                      return backhand;
                    })()}
                  </span>
                </div>
              )}
              {height != null && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Height</span>
                  <span className="text-white">{height} cm</span>
                </div>
              )}
              {weight != null && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Weight</span>
                  <span className="text-white">{weight} kg</span>
                </div>
              )}
              {turnedpro != null && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Turned Pro</span>
                  <span className="text-white">{turnedpro}</span>
                </div>
              )}
              {coaches && (
                <div className="flex gap-2">
                  <span className="text-gray-400 w-28 shrink-0">Coach</span>
                  <span className="text-white">{coaches}</span>
                </div>
              )}
            </div>
            {/* Ranking + W-L column */}
            <div className="px-5 py-4 space-y-3 text-sm">
              {rankingLoaded && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex flex-col items-center justify-center bg-yellow-500/15 border border-yellow-500/30 rounded px-2 py-1 min-w-[32px]">
                    <span className="text-[9px] font-black text-yellow-400 tracking-[0.2em] uppercase leading-none">ATP</span>
                  </span>
                  <div>
                    <div className="text-xl font-black text-yellow-300 leading-none">
                      {rankingData?.currentRank != null ? `#${rankingData.currentRank}` : '/'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Current ranking</div>
                  </div>
                </div>
              )}
              {rankingLoaded && (
                <div className="flex items-center gap-3">
                  <span className="inline-flex flex-col items-center justify-center bg-blue-500/15 border border-blue-500/30 rounded px-2 py-1 min-w-[32px]">
                    <span className="text-[9px] font-black text-blue-400 tracking-[0.2em] uppercase leading-none">PTS</span>
                  </span>
                  <div>
                    <div className="text-xl font-black text-blue-300 leading-none">
                      {rankingData?.currentPoints != null ? rankingData.currentPoints.toLocaleString() : '/'}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Current ATP points</div>
                  </div>
                </div>
              )}
              {rankingData?.bestRank != null && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">Best ranking</span>
                  <span className="font-bold text-yellow-400">#{rankingData.bestRank}</span>
                </div>
              )}
              {/* Career W-L */}
              {overviewStats && overviewStats.totalMatches >= 1 && (
                <div className="pt-2 border-t border-gray-700/60">
                  <div className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Career W-L</div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-bold text-xl leading-none">{overviewStats.wins}</span>
                    <span className="text-gray-500 text-lg">–</span>
                    <span className="text-red-400 font-bold text-xl leading-none">{overviewStats.losses}</span>
                    <span className="text-gray-400 text-xs ml-1">({overviewStats.winPct})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Overview narrative panel — shown on all surface tabs when no year selected */}
      {!selectedYear && (
        overviewSlot
          ? overviewSlot
          : (overviewStats && !loading && (
              <div className="mb-6 p-5 bg-gray-800 rounded-lg shadow-lg">
          <h3 className="text-xl font-bold mb-4 text-center" style={{ color: '#facc15' }}>{isSurfacePage ? `${surfaceLabel} Overview` : 'Career Overview'}</h3>
          <div className="text-sm leading-relaxed text-gray-200 space-y-3">

            {/* Overall career record */}
            {overviewStats.totalMatches < 5 ? (
              <p>
                <strong>{overviewStats.displayName}</strong> has played only{' '}
                <strong className="text-yellow-400">{overviewStats.totalMatches}</strong> match{overviewStats.totalMatches !== 1 ? 'es' : ''} on {isSurfacePage ? `${surfAdj} courts` : 'Tour'} — too small a sample to draw firm conclusions.
              </p>
            ) : (
              <p>
                <strong>{overviewStats.displayName}</strong>{' '}
                {isSurfacePage
                  ? (overviewStats.winRateN >= 75 ? `has been dominant on ${surfAdj}, posting` :
                     overviewStats.winRateN >= 65 ? `has an impressive ${surfAdj} court record of` :
                     overviewStats.winRateN >= 55 ? `holds a solid ${surfAdj} court record of` :
                     overviewStats.winRateN >= 45 ? `has a competitive ${surfAdj} court record of` :
                     `has found ${surfAdj} courts difficult, recording`)
                  : (overviewStats.winRateN >= 75 ? 'has had a dominant career, posting' :
                     overviewStats.winRateN >= 65 ? 'has an impressive career record of' :
                     overviewStats.winRateN >= 55 ? 'holds a solid career record of' :
                     overviewStats.winRateN >= 45 ? 'has a competitive career record of' :
                     'has found the Tour difficult, recording')}{' '}
                <strong className="text-green-400">{overviewStats.wins}</strong>–<strong className="text-red-400">{overviewStats.losses}</strong>{' '}
                across <strong className="text-yellow-400">{overviewStats.totalMatches}</strong> matches (<strong className="text-blue-400">{overviewStats.winPct}</strong>
                {overviewStats.winRateN >= 75 ? ' — exceptional' : overviewStats.winRateN >= 65 ? ' — strong' : ''}).{' '}
                {overviewStats.winRateN >= 75
                  ? (isSurfacePage ? `Few players have sustained that level of dominance on ${surfAdj} across a full career.` : `Few players in the Open Era have sustained that level of dominance across a full career.`)
                  : overviewStats.winRateN >= 65
                  ? `A win rate of that calibre over ${overviewStats.totalMatches} matches${isSurfacePage ? ` on ${surfAdj}` : ''} is a reliable indicator of genuine quality.`
                  : overviewStats.winRateN >= 55
                  ? `A winning majority across ${overviewStats.totalMatches} matches shows consistent ability to get results${isSurfacePage ? ` on ${surfAdj}` : ' on Tour'}.`
                  : overviewStats.winRateN >= 45
                  ? `The record shows a player capable of competing${isSurfacePage ? ` on ${surfAdj}` : ' at Tour level'}, though there is clear room to push the win rate higher.`
                  : (isSurfacePage ? `The numbers point to a surface that has not consistently suited the game — a key area of opportunity on the calendar.` : `The numbers point to a player still building their Tour presence — a key area of opportunity going forward.`)
                }
                {' '}
                {overviewStats.totalTitles === 0 && overviewStats.finalsReached > 0
                  ? <>{overviewStats.displayName} has reached <strong className="text-yellow-400">{overviewStats.finalsReached}</strong> final{overviewStats.finalsReached !== 1 ? 's' : ''} without yet claiming a title — one of the finest margins in tennis.</>
                  : overviewStats.totalTitles >= 10
                  ? <>With <strong className="text-yellow-400">{overviewStats.totalTitles}</strong> titles{isSurfacePage ? ` on ${surfAdj}` : ''}, among the most prolific {isSurfacePage ? `${surfAdj} court ` : ''}champions in the Open Era{overviewStats.titleNames.length > 0 ? `: ${overviewStats.titleNames.slice(0, 4).join(', ')}${overviewStats.titleNames.length > 4 ? ` and ${overviewStats.titleNames.length - 4} more` : ''}` : ''}.</>
                  : overviewStats.totalTitles >= 4
                  ? <><strong className="text-yellow-400">{overviewStats.totalTitles}</strong> title{overviewStats.totalTitles !== 1 ? 's' : ''}{isSurfacePage ? ` on ${surfAdj}` : ''}{overviewStats.titleNames.length > 0 ? `: ${overviewStats.titleNames.join(', ')}` : ''} — a record that reflects consistent ability to close out tournaments{isSurfacePage ? ` on this surface` : ''}.</>                  : overviewStats.totalTitles > 0
                  ? <>Claimed <strong className="text-yellow-400">{overviewStats.totalTitles}</strong> title{overviewStats.totalTitles !== 1 ? 's' : ''}{isSurfacePage ? ` on ${surfAdj}` : ''}{overviewStats.titleNames.length > 0 ? `: ${overviewStats.titleNames.join(', ')}` : ''}.</>
                  : null
                }
              </p>
            )}

            {/* Grand Slams */}
            {overviewStats.slamTotal > 0 && (
              <p>
                At Grand Slam level ({surface === 'Clay' ? 'Roland Garros' : surface === 'Hard' ? 'Australian Open & US Open' : surface === 'Grass' ? 'Wimbledon' : 'Australian Open, Roland Garros, Wimbledon, US Open'}):{' '}
                {overviewStats.slamWins === 0
                  ? <>{overviewStats.displayName} has yet to record a win at Grand Slam level — <strong className="text-green-400">0</strong>–<strong className="text-red-400">{overviewStats.slamTotal}</strong> across <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> match{overviewStats.slamTotal !== 1 ? 'es' : ''}. Breaking through here would mark a significant step forward.</>                  : overviewStats.slamTotal <= 3
                  ? <><strong className="text-green-400">{overviewStats.slamWins}</strong>–<strong className="text-red-400">{overviewStats.slamLosses}</strong> across just <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> match{overviewStats.slamTotal !== 1 ? 'es' : ''} — still very early days at this level.</>
                  : overviewStats.slamWinPctN >= 72
                  ? <>{overviewStats.displayName} has been outstanding at the Slams — <strong className="text-green-400">{overviewStats.slamWins}</strong>–<strong className="text-red-400">{overviewStats.slamLosses}</strong> (<strong className="text-blue-400">{overviewStats.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> matches. Winning more than 7 in 10 Grand Slam matches is the benchmark of an all-time great.</>
                  : overviewStats.slamWinPctN >= 58
                  ? <>a positive <strong className="text-green-400">{overviewStats.slamWins}</strong>–<strong className="text-red-400">{overviewStats.slamLosses}</strong> (<strong className="text-blue-400">{overviewStats.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> matches — a player who generally rises to the occasion at the Slams.</>
                  : overviewStats.slamWinPctN >= 40
                  ? <>{overviewStats.displayName} is <strong className="text-green-400">{overviewStats.slamWins}</strong>–<strong className="text-red-400">{overviewStats.slamLosses}</strong> (<strong className="text-blue-400">{overviewStats.slamWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> Grand Slam matches — below .500, though the elite draw depth makes that a notoriously difficult barrier.</>
                  : <>{overviewStats.displayName} has struggled at Grand Slam level: <strong className="text-green-400">{overviewStats.slamWins}</strong>–<strong className="text-red-400">{overviewStats.slamLosses}</strong> (<strong className="text-blue-400">{overviewStats.slamWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{overviewStats.slamTotal}</strong> matches. The best-of-five format and elite fields make this the toughest benchmark on Tour.</>
                }
              </p>
            )}

            {/* Masters 1000 */}
            {overviewStats.mastersTotal >= 3 && surface !== 'Grass' && (
              <p>
                ATP Masters 1000{isSurfacePage ? ` on ${surfAdj}` : ''} ({surface === 'Clay' ? 'Monte Carlo, Madrid, Rome' : surface === 'Hard' ? 'Indian Wells, Miami, Canada, Cincinnati, Shanghai, Paris' : 'Indian Wells, Miami, Monte Carlo, Madrid, Rome, Canada, Cincinnati, Shanghai, Paris'}):{' '}
                {overviewStats.mastersWinPctN >= 65
                  ? <>{overviewStats.displayName} is elite here — <strong className="text-green-400">{overviewStats.mastersWins}</strong>–<strong className="text-red-400">{overviewStats.mastersLosses}</strong> (<strong className="text-blue-400">{overviewStats.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.mastersTotal}</strong> matches. Sustaining that win rate in the Tour's deepest regular-week draws is a defining quality of the very best.</>
                  : overviewStats.mastersWinPctN >= 50
                  ? <>a positive <strong className="text-green-400">{overviewStats.mastersWins}</strong>–<strong className="text-red-400">{overviewStats.mastersLosses}</strong> (<strong className="text-blue-400">{overviewStats.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.mastersTotal}</strong> matches — winning above .500 at this level, week in week out, is a genuine sign of quality.</>
                  : overviewStats.mastersWinPctN >= 35
                  ? <>{overviewStats.displayName} is <strong className="text-green-400">{overviewStats.mastersWins}</strong>–<strong className="text-red-400">{overviewStats.mastersLosses}</strong> (<strong className="text-blue-400">{overviewStats.mastersWinPctN.toFixed(1)}%</strong>) across <strong className="text-yellow-400">{overviewStats.mastersTotal}</strong> Masters matches — below .500 in the Tour's deepest fields. Lifting that record here would unlock better results across the calendar.</>
                  : <>{overviewStats.displayName} has struggled at Masters level: <strong className="text-green-400">{overviewStats.mastersWins}</strong>–<strong className="text-red-400">{overviewStats.mastersLosses}</strong> (<strong className="text-blue-400">{overviewStats.mastersWinPctN.toFixed(1)}%</strong>) in <strong className="text-yellow-400">{overviewStats.mastersTotal}</strong> matches. Improving at this level is the clearest path to a stronger overall record.</>
                }
              </p>
            )}

            {/* Finals */}
            {overviewStats.finalsReached >= 2 && (
              <p>
                <strong className="text-yellow-400">{overviewStats.finalsReached}</strong> finals reached{isSurfacePage ? ` on ${surfAdj}` : ''} —{' '}
                {overviewStats.titleConvRate >= 0.75
                  ? <>converted <strong className="text-yellow-400">{overviewStats.totalTitles}</strong> into titles (outstanding <strong className="text-blue-400">{(overviewStats.titleConvRate * 100).toFixed(0)}%</strong> conversion rate). Converting finals at that rate separates champions from contenders.</>
                  : overviewStats.titleConvRate >= 0.5
                  ? <>won <strong className="text-yellow-400">{overviewStats.totalTitles}</strong>, lost <strong className="text-yellow-400">{overviewStats.finalsReached - overviewStats.totalTitles}</strong> (solid <strong className="text-blue-400">{(overviewStats.titleConvRate * 100).toFixed(0)}%</strong> conversion) — consistently getting to finals and winning the majority is a hallmark of elite performers.</>
                  : overviewStats.totalTitles === 0
                  ? <>none converted into a title yet. Reaching <strong className="text-yellow-400">{overviewStats.finalsReached}</strong> final{overviewStats.finalsReached !== 1 ? 's' : ''} is a mark of real quality, but the gap between finalist and champion is one of the finest lines in the sport.</>
                  : <>won <strong className="text-yellow-400">{overviewStats.totalTitles}</strong>, lost <strong className="text-yellow-400">{overviewStats.finalsReached - overviewStats.totalTitles}</strong> (<strong className="text-blue-400">{(overviewStats.titleConvRate * 100).toFixed(0)}%</strong> conversion) — capable of reaching finals consistently, with room to improve at the decisive moment.</>
                }
                {overviewStats.sfReached > 0 && <>{' '}<strong className="text-yellow-400">{overviewStats.sfReached}</strong> semifinal{overviewStats.sfReached !== 1 ? 's' : ''}.</>}
                {overviewStats.qfReached > 0 && <>{' '}<strong className="text-yellow-400">{overviewStats.qfReached}</strong> quarterfinal{overviewStats.qfReached !== 1 ? 's' : ''}.</>}
              </p>
            )}
            {overviewStats.finalsReached === 1 && (
              <p>
                One final reached{isSurfacePage ? ` on ${surfAdj}` : ''}{overviewStats.totalTitles === 1
                  ? ', converted into a title — a perfect finals record so far.'
                  : ', without converting it into a title. That final-round experience is valuable groundwork for going one step further next time.'
                }
                {overviewStats.sfReached > 0 && <>{' '}<strong className="text-yellow-400">{overviewStats.sfReached}</strong> semifinal{overviewStats.sfReached !== 1 ? 's' : ''}.</>}
                {overviewStats.qfReached > 0 && <>{' '}<strong className="text-yellow-400">{overviewStats.qfReached}</strong> quarterfinal{overviewStats.qfReached !== 1 ? 's' : ''}.</>}
              </p>
            )}

            {/* Top 10 */}
            {overviewStats.top10Total >= 3 && (
              <p>
                vs. Top 10: <strong className="text-green-400">{overviewStats.top10Wins}</strong>–<strong className="text-red-400">{overviewStats.top10Losses}</strong>{' '}
                (<strong className="text-blue-400">{overviewStats.top10WinPctN.toFixed(1)}%</strong>, <strong className="text-yellow-400">{overviewStats.top10Total}</strong> match{overviewStats.top10Total !== 1 ? 'es' : ''}).{' '}
                {overviewStats.top10WinPctN >= 55
                  ? `Winning above .500 against the world's best is a benchmark of genuine elite quality on Tour.`
                  : overviewStats.top10WinPctN >= 40
                  ? `Competitive against the elite, but still narrowly below .500 — closing that gap would directly elevate the overall career profile.`
                  : `Top 10 opponents have represented a clear ceiling; addressing that deficit is the single biggest lever for improving the overall record.`
                }
              </p>
            )}

            {/* Bo5 vs Bo3 */}
            {overviewStats.bo5Total >= 3 && overviewStats.bo3Total >= 3 && (
              <p>
                By format — best-of-five: <strong className="text-green-400">{overviewStats.bo5Wins}</strong>–<strong className="text-red-400">{overviewStats.bo5Losses}</strong>{' '}
                (<strong className="text-blue-400">{overviewStats.bo5WinPctN.toFixed(1)}%</strong>); best-of-three: <strong className="text-green-400">{overviewStats.bo3Wins}</strong>–<strong className="text-red-400">{overviewStats.bo3Losses}</strong>{' '}
                (<strong className="text-blue-400">{overviewStats.bo3WinPctN.toFixed(1)}%</strong>).{' '}
                {overviewStats.bo5WinPctN > overviewStats.bo3WinPctN + 8
                  ? `Significantly better in five-set matches — a strong physical profile that tends to tell as matches and tournaments progress.`
                  : overviewStats.bo3WinPctN > overviewStats.bo5WinPctN + 8
                  ? `Markedly stronger in three-set formats; the win rate drops noticeably in five-setters, which has direct implications for Grand Slam performance.`
                  : overviewStats.bo5WinPctN > overviewStats.bo3WinPctN + 2
                  ? `Slightly better in five-set matches — a positive sign for Grand Slam campaigns specifically.`
                  : overviewStats.bo3WinPctN > overviewStats.bo5WinPctN + 2
                  ? `Slightly stronger in three-set contests, though the five-set record is still respectable.`
                  : `Consistent regardless of format — a sign of a well-rounded game that holds up as matches develop.`
                }
              </p>
            )}

            {/* Best season */}
            {overviewStats.bestYear && overviewStats.bestYearTotal >= 5 && (
              <p>
                {overviewStats.bestYearWins >= 70 ? 'Historic season' : overviewStats.bestYearWins >= 40 ? 'Dominant season' : overviewStats.bestYearWins >= 20 ? 'Peak season' : 'Best season'}: <strong className="text-yellow-400">{overviewStats.bestYear}</strong> —{' '}
                <strong className="text-green-400">{overviewStats.bestYearWins}</strong>–<strong className="text-red-400">{overviewStats.bestYearTotal - overviewStats.bestYearWins}</strong>{' '}
                (<strong className="text-blue-400">{((overviewStats.bestYearWins / overviewStats.bestYearTotal) * 100).toFixed(1)}%</strong>) from <strong className="text-yellow-400">{overviewStats.bestYearTotal}</strong> matches.{' '}
                {overviewStats.bestYearWins >= 70
                  ? <>A campaign of <strong className="text-yellow-400">{overviewStats.bestYearWins}</strong> wins in a single season is among the finest single-season records the Open Era has seen — the clearest benchmark of what is achievable at peak level.</>
                  : overviewStats.bestYearWins >= 40
                  ? `That year represents a level of dominance that sets the ceiling for what ${overviewStats.displayName} can produce.`
                  : overviewStats.bestYearWins >= 20
                  ? `That year captures the ceiling of what ${overviewStats.displayName} can do when performing at their best and represents the standard to aim for.`
                  : `The best single-season display to date — a useful reference point as the career continues to develop.`
                }
              </p>
            )}

            {/* Win streak */}
            {overviewStats.winStreak >= overviewStats.streakThreshold && (
              <p>
                {overviewStats.winStreak >= 30
                  ? <><strong>{overviewStats.displayName}</strong> assembled a historic <strong className="text-yellow-400">{overviewStats.winStreak}</strong>-match winning streak — one of the longest in the Open Era. Sustaining that level across so many matches demands physical and mental consistency that very few players have matched.</>
                  : overviewStats.winStreak >= 15
                  ? <>{overviewStats.displayName} assembled a remarkable <strong className="text-yellow-400">{overviewStats.winStreak}</strong>-match winning streak — a run of that length goes far beyond form and into a different level of dominance.</>
                  : overviewStats.winStreak >= 8
                  ? <>{overviewStats.displayName} put together an impressive <strong className="text-yellow-400">{overviewStats.winStreak}</strong>-match winning streak, highlighting the ability to maintain high performance across multiple tournament rounds and events.</>
                  : <>{overviewStats.displayName} recorded a notable <strong className="text-yellow-400">{overviewStats.winStreak}</strong>-match winning streak — a run that demonstrates consistency across consecutive draws.</>
                }
              </p>
            )}

            {/* Recent form (current year) */}
            {overviewStats.recentYearTotal > 0 && (
              <p>
                <strong className="text-yellow-400">Recent Form {overviewStats.currentYear}:</strong>{' '}
                <strong className="text-green-400">{overviewStats.recentW}</strong>–<strong className="text-red-400">{overviewStats.recentL}</strong>{' '}
                (<strong className="text-blue-400">{((overviewStats.recentW / overviewStats.recentYearTotal) * 100).toFixed(1)}%</strong>).
                {overviewStats.recentFormStr.length > 0 && (
                  <>{' '}Last {overviewStats.recentFormStr.length}:{' '}
                    {overviewStats.recentFormStr.map((r: string, i: number) => (
                      <span key={i} className={r === 'W' ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{r}{' '}</span>
                    ))}
                    {overviewStats.recentFormStr.length >= 4 && (
                      overviewStats.recentFormW >= overviewStats.recentFormStr.length * 0.75 ? ' — excellent form, carrying real momentum.' :
                      overviewStats.recentFormW > overviewStats.recentFormStr.length / 2 ? ' — positive form, wins outweighing losses in the latest stretch.' :
                      overviewStats.recentFormW >= overviewStats.recentFormStr.length * 0.25 ? ' — mixed results, some inconsistency in the current period.' :
                      ' — a difficult recent run, with results not going the right way.'
                    )}
                  </>
                )}
              </p>
            )}

          </div>
        </div>
          ))
      )}

      {/* Last 10 matches table — visible on all surface tabs (and Overview when no SSR slot), no year filter */}
      {!overviewSlot && !selectedYear && !loading && allMatches.length > 0 && (() => {
        const isSurface = surface !== 'All' && surface !== '';
        const sorted = [...allMatches]
          .filter((m: any) => m.status === true && (!isSurface || (typeof m.surface === 'string' && m.surface.toLowerCase() === surface.toLowerCase())))
          .sort((a: any, b: any) => {
            const da = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
            const db = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
            if (db !== da) return db - da;
            // Within the same tournament, sort by round descending (F before SF before QF…)
            return getRoundIndex(b.round, b.tourney_level) - getRoundIndex(a.round, a.tourney_level);
          })
          .slice(0, 10);
        if (!sorted.length) return null;
        const input = playerSlug ? { slug: playerSlug } : { id: playerId };
        const matchesHref = isSurface
          ? `${getPlayerHrefWithTab(input, 'matches')}?surface=${encodeURIComponent(surface)}`
          : `${getPlayerHrefWithTab(input, 'matches')}`;
        return (
          <div className="mb-8 p-5 bg-gray-800 rounded-lg shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold" style={{ color: '#facc15' }}>Last 10 {isSurface ? `${surface} ` : ''}Matches</h3>
              <Link
                href={matchesHref}
                className="inline-block bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold text-sm py-1.5 px-4 rounded-full transition-all duration-200"
              >
                View All Matches ↗
              </Link>
            </div>
            <div className="overflow-x-auto rounded border border-white/20 bg-gray-900 shadow">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-black/80">
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Date</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Tournament</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Srf</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Rd</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Wrk</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Winner</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Lrk</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Loser</th>
                    <th className="border border-white/20 px-3 py-2 text-center font-medium text-gray-200">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-800/50">
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{formatDateISO(m.tourney_date)}</td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                        {m.tourney_name ? (
                          m.tourney_id ? (
                            <Link href={getTourneyHref({ slug: m.tourney_slug ?? undefined, id: m.tourney_id, year: m.year })} className="text-indigo-300 hover:underline">
                              {m.tourney_name}
                            </Link>
                          ) : m.tourney_name
                        ) : '-'}
                      </td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.surface ?? '-'}</td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">{m.round ?? '-'}</td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                        {m.winner_rank != null && m.winner_slug
                          ? <Link href={`/players/${m.winner_slug}/ranking`} className="hover:underline">{m.winner_rank}</Link>
                          : m.winner_rank ?? '-'}
                      </td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-6 h-4" />}
                          {m.winner_slug || m.winner_id ? (
                            <Link href={getPlayerHref(m.winner_slug ?? String(m.winner_id))} className="text-gray-200 hover:text-yellow-400">
                              {m.winner_name ?? ''}
                            </Link>
                          ) : (m.winner_name ?? '')}
                        </div>
                      </td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                        {m.loser_rank != null && m.loser_slug
                          ? <Link href={`/players/${m.loser_slug}/ranking`} className="hover:underline">{m.loser_rank}</Link>
                          : m.loser_rank ?? '-'}
                      </td>
                      <td className="border border-white/10 px-3 py-2 text-center text-gray-200">
                        <div className="flex items-center justify-center gap-2">
                          {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-6 h-4" />}
                          {m.loser_slug || m.loser_id ? (
                            <Link href={getPlayerHref(m.loser_slug ?? String(m.loser_id))} className="text-gray-400 hover:text-gray-200">
                              {m.loser_name ?? ''}
                            </Link>
                          ) : (m.loser_name ?? '')}
                        </div>
                      </td>
                      <td className="border border-white/10 px-3 py-2 text-center font-mono text-gray-200">{m.score ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {loading && <div className="text-gray-400 mb-4">Loading matches…</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!loading && careerAgg.total === 0 && (
        <div className="text-gray-400 text-xl">No {surface.toLowerCase()} court matches found.</div>
      )}

      {careerAgg.total > 0 && (
        <div style={{ opacity: loading ? 0.6 : 1, transition: "opacity 0.3s" }}>
          {/* Mobile summary */}
          <div className="text-gray-200 mb-4 sm:hidden">
            Wins: {careerAgg.wins}–{careerAgg.losses} (<span className="text-blue-400">{careerAgg.pct.toFixed(1)}%</span>)
          </div>

          {/* Section 1: Tournament tiles — only when a year is selected */}
          {selectedYear && (!isMobileCards || visibleCount >= 1) && (
            <TournamentCompactList tourneys={tourneysForSurface} getTourneyLink={getTourneyLink} />
          )}

          {/* Section 2: title+dropdown header (surface pages) + 3-col W-L / By Year / Categories */}
          {(!isMobileCards || visibleCount >= 2) && (
            <>
              {/* Surface pages: title + year picker top-left */}
              {isSurfacePage && (
                <div className="flex items-center gap-4 mt-6 mb-2">
                  <span className="font-extrabold text-2xl text-yellow-400">
                    {surfaceLabel} — {selectedYear ? `${selectedYear} Stats` : 'Career Stats'}
                  </span>
                  {availableYears.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedYear ?? ''}
                        onChange={(e) => setSelectedYear(e.target.value ? Number(e.target.value) : null)}
                        className="bg-gray-700 text-white text-sm rounded-lg px-3 py-1.5 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
                      >
                        <option value="">All years</option>
                        {availableYears.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      {selectedYear && (
                        <button
                          onClick={() => setSelectedYear(null)}
                          className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded bg-gray-700 hover:bg-gray-600"
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={`flex flex-wrap gap-6 ${isSurfacePage ? 'mt-2' : 'mt-8'}`}>
                {/* Column 1: W-L (surface pages) or By Year (Overview) */}
                {isSurfacePage ? (
                  <div className="flex-1 min-w-[300px]">
                    <WLStatTable
                      title="W-L"
                      rows={[{ label: selectedYear ? String(selectedYear) : 'Career', wins: careerAgg.wins, losses: careerAgg.losses, color: palette[0] }]}
                    />
                  </div>
                ) : (
                  !selectedYear && (
                    <div className="flex-1 min-w-[300px]">
                      <WLStatTable
                        title="By Year"
                        rows={[...yearsAgg].sort((a, b) => a.year - b.year).map((r, i) => ({
                          label: String(r.year),
                          wins: r.wins,
                          losses: r.losses,
                          color: palette[i % palette.length],
                        }))}
                      />
                    </div>
                  )
                )}

                {/* Column 2: By Year (surface pages) or By Surface (Overview) */}
                <div className="flex-1 min-w-[300px]">
                  {isSurfacePage ? (
                    !selectedYear ? (
                      <WLStatTable
                        title="By Year"
                        rows={[...yearsAgg].sort((a, b) => a.year - b.year).map((r, i) => ({
                          label: String(r.year),
                          wins: r.wins,
                          losses: r.losses,
                          color: palette[i % palette.length],
                        }))}
                      />
                    ) : (
                      /* When a year is selected: show rounds breakdown */
                      <WLStatTable
                        title="Rounds"
                        rows={(() => {
                          const order = ["F","SF","QF","R16","R32","R64","R128","RR"];
                          return [...roundsAgg].sort((a, b) => {
                            const ia = order.indexOf(a.round), ib = order.indexOf(b.round);
                            if (ia === -1 && ib === -1) return a.round.localeCompare(b.round);
                            if (ia === -1) return 1; if (ib === -1) return -1;
                            return ia - ib;
                          }).map((r, i) => ({ label: r.round, wins: r.wins, losses: r.losses, color: palette[i % palette.length] }));
                        })()}
                      />
                    )
                  ) : !selectedYear ? (() => {
                    const pid = String(playerId);
                    const surfaces = ['Hard', 'Clay', 'Grass', 'Carpet'];
                    const surfaceColors: Record<string, string> = { Hard: '#3B82F6', Clay: '#F97316', Grass: '#22C55E', Carpet: '#A855F7' };
                    const rows = surfaces.map(s => {
                      const sm = allMatches.filter((m: any) => m.status === true && typeof m.surface === 'string' && m.surface.toLowerCase().includes(s.toLowerCase()));
                      const w = sm.filter((m: any) => String(m.winner_id) === pid).length;
                      const l = sm.length - w;
                      return { label: s, wins: w, losses: l, color: surfaceColors[s] };
                    }).filter(r => r.wins + r.losses > 0);
                    return <WLStatTable title="By Surface" rows={rows} />;
                  })() : (
                    <WLStatTable
                      title="W-L"
                      rows={[{ label: String(selectedYear), wins: careerAgg.wins, losses: careerAgg.losses, color: palette[0] }]}
                    />
                  )}
                </div>

                {/* Column 3: Categories — always */}
                <div className="flex-1 min-w-[300px]">
                  <WLStatTable
                    title="Categories"
                    rows={levelsAgg.map((row, idx) => {
                      const levelName = getLevelFullName(row.level).toLowerCase();
                      let color: string;
                      switch (true) {
                        case levelName.includes("grand slam"): color = "#A855F7"; break;
                        case levelName.includes("atp 1000") || levelName.includes("masters 1000"): color = "#06B6D4"; break;
                        case levelName.includes("atp 500"): color = "#22C55E"; break;
                        case levelName.includes("atp 250"): color = "#EF4444"; break;
                        default: color = getLevelColors(row.level)?.bar || palette[idx % palette.length];
                      }
                      return { label: getLevelFullName(row.level), wins: row.wins, losses: row.losses, color };
                    })}
                  />
                </div>
              </div>
            </>
          )}

          {/* Section 3: Ranking + Rounds */}
          {(!isMobileCards || visibleCount >= 3) && (
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="Ranking"
                  rows={vsRankAgg.map((r, i) => ({
                    label: r.label,
                    wins: r.wins,
                    losses: r.losses,
                    color: palette[i % palette.length],
                  }))}
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="Rounds"
                  rows={(() => {
                    const order = ["F","SF","QF","R16","R32","R64","R128","RR"];
                    const sorted = [...roundsAgg].sort((a, b) => {
                      const ia = order.indexOf(a.round), ib = order.indexOf(b.round);
                      if (ia === -1 && ib === -1) return a.round.localeCompare(b.round);
                      if (ia === -1) return 1; if (ib === -1) return -1;
                      return ia - ib;
                    });
                    return sorted.map((r, i) => ({
                      label: r.round, wins: r.wins, losses: r.losses, color: palette[i % palette.length],
                    }));
                  })()}
                />
              </div>
            </div>
          )}

          {/* Section 4: W-L Sets + Games + Tiebreaks */}
          {(!isMobileCards || visibleCount >= 4) && (
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="W-L Sets"
                  rows={[{ label: "Sets", wins: setsAgg.wins, losses: setsAgg.losses, color: palette[1] }]}
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="W-L Games"
                  rows={[{ label: "Games", wins: gamesAgg.won, losses: gamesAgg.lost, color: palette[2] }]}
                />
              </div>
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="Tiebreaks"
                  rows={[
                    { label: "Standard TB", wins: tiebreakAgg.standard.wins, losses: tiebreakAgg.standard.losses, color: palette[3] },
                    { label: "Match TB",    wins: tiebreakAgg.super.wins,    losses: tiebreakAgg.super.losses,    color: palette[4] },
                    { label: "Overall",     wins: tiebreakAgg.overall.wins,  losses: tiebreakAgg.overall.losses,  color: palette[5] },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Sentinel */}
          {isMobileCards && visibleCount < SECTION_COUNT && (
            <div ref={sentinelRef} style={{ height: 1 }} />
          )}

          {/* Section 5: Year-by-year breakdown */}
          {(!isMobileCards || visibleCount >= 5) && (
            <YearByYearBreakdownTable
              rows={yearsBreakdown}
            />
          )}

          {/* Section 6 & 7: Service & Return Spider */}
          {(!isMobileCards || visibleCount >= 6) && (
            <div className="flex flex-wrap gap-8 mt-10">
              <div style={{ flex: 1, minWidth: 320 }}>
                <PlayerServiceSpider
                  matches={filteredMatches}
                  playerId={playerId}
                  playerName={playerName || playerId}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <PlayerReturnSpider
                  matches={filteredMatches}
                  playerId={playerId}
                  playerName={playerName || playerId}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
