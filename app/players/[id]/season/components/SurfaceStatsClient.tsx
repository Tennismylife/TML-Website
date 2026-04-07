"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import useIncrementalCards from "@/lib/hooks/useIncrementalCards";
import type { Match } from "@/types";
import { getLevelColors, getLevelFullName, getTourneyHref, getPlayerHref } from "@/lib/utils";
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
}: SurfaceStatsClientProps) {
  const [allMatches, setAllMatches] = useState<Match[]>(initialMatches ?? []);
  const [loading, setLoading] = useState<boolean>(!initialMatches || initialMatches.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // Fetch all surface matches client-side if not provided by SSR
  useEffect(() => {
    if (initialMatches && initialMatches.length > 0) return;
    let abort = false;
    setLoading(true);
    setError(null);

    fetch(`/api/players/allmatches?id=${encodeURIComponent(playerId)}&surface=${encodeURIComponent(surface)}`)
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

  const SECTION_COUNT = 7;
  const computing = false;
  const { isMobile: isMobileCards, visibleCount, sentinelRef } = useIncrementalCards(
    !loading ? SECTION_COUNT : 0,
    { initialVisible: 1, debounceMs: 800 }
  );

  return (
    <div className="w-full p-4 section" style={{ backgroundColor: "rgb(27,36,48)" }}>
      {/* Header row */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="font-extrabold text-2xl text-yellow-400">
          {surface} Court — {selectedYear ? selectedYear : "Career"} Stats
        </span>

        {/* Year selector */}
        {availableYears.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={selectedYear ?? ""}
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

        <Link
          href={`${getPlayerHref(playerSlug ?? playerId)}/${surface.toLowerCase()}${selectedYear ? `?year=${selectedYear}` : ""}`}
          className="inline-block bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold text-sm py-1.5 px-4 rounded-full transition-all duration-200 ml-auto"
        >
          View Matches ↗
        </Link>
      </div>

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

          {/* Section 2: W-L + Years/Career + Categories */}
          {(!isMobileCards || visibleCount >= 2) && (
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="flex-1 min-w-[300px]">
                <WLStatTable
                  title="W-L"
                  rows={[{ label: selectedYear ? String(selectedYear) : "Career", wins: careerAgg.wins, losses: careerAgg.losses, color: palette[0] }]}
                />
              </div>
              {!selectedYear && (
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
              )}
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
