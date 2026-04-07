"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import type { Match } from "@/types";
import { getLevelColors, getLevelFullName, getTourneyHref, getPlayerHref } from "@/lib/utils";
import { getSurfaceColor, palette } from "@/lib/colors";
import SummarySeasons from './SummarySeasons';
import TournamentGrid from "../../TournamentGrid";
import dynamic from 'next/dynamic';
const PlayerServiceSpider = dynamic(() => import('./PlayerServiceSpider'), { ssr: false });
const PlayerReturnSpider = dynamic(() => import('./PlayerReturnSpider'), { ssr: false });
import { useYearStatsAsync } from "./useYearStatsAsync";
import type { YearStatsResult } from "./computeYearStats";
import { useRouter, usePathname, useSearchParams } from "next/navigation"; // <--- added

interface SeasonsProps {
  playerId: string;
  playerSlug?: string | null;
  playerName?: string | null;
  initialYears?: number[];
  initialAllMatches?: Match[];
  initialSelectedYear?: number | null;
  /** Pre-computed stats from SSR — avoids all client-side calculation on first render */
  initialSeasonStats?: YearStatsResult | null;
  initialSeasonYear?: number | null;
}

const getTourneyLink = (tourneySlug?: string | null, tourneyId?: string | null, year?: number | null) => {
  // Prefer slug when available; fall back to id to keep cards clickable
  if (!tourneySlug && !tourneyId) return "#";
  return getTourneyHref({ slug: tourneySlug ?? undefined, id: tourneyId ?? undefined, year: year ?? undefined });
};

// ===================== WLStatTable =====================
interface WLRow {
  label: string;
  wins: number;
  losses: number;
  color?: string;
}

interface WLStatTableProps {
  title: string;
  rows: WLRow[];
}

const WLStatTable: React.FC<WLStatTableProps> = ({ title, rows }) => {
  const getTextColor = (hex: string) => {
    const c = hex.substring(1);
    const rgb = parseInt(c, 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = rgb & 0xff;
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? "#000" : "#fff";
  };

  return (
    <div className="relative mt-10">
      <div
        className="absolute -top-4 -left-3 bg-yellow-400 text-black px-5 py-2 rounded-r-xl shadow-xl font-extrabold text-base tracking-wide border border-yellow-500/70 z-20"
        style={{
          boxShadow: "2px 3px 10px rgba(0,0,0,0.5)",
          borderLeft: "4px solid rgba(0,0,0,0.3)",
          transform: "translateY(-4px)",
          minWidth: "160px",
          whiteSpace: "nowrap",
        }}
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
              <div
                key={`${row.label}-${idx}`}
                className="flex items-center gap-4 p-2 rounded-xl shadow-inner transition-all duration-300"
              >
                <div className="w-32 font-semibold">{row.label}</div>
                <div className="flex-1 relative h-6 rounded overflow-hidden bg-gray-900/70">
                  <div
                    className="h-6 rounded transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                  <div
                    className="absolute inset-0 flex justify-center items-center text-sm font-medium"
                    style={{ color: getTextColor(color) }}
                  >
                    {total > 0 ? `${pct.toFixed(1)}%` : "0%"}
                  </div>
                </div>
                <div className="w-32 flex justify-end font-mono">
                  {row.wins}-{row.losses} ({total})
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ===================== Seasons Component =====================
export default function Seasons({ playerId, playerSlug, playerName, initialYears, initialAllMatches, initialSelectedYear, initialSeasonStats, initialSeasonYear }: SeasonsProps) {
  const router = useRouter(); // <--- added
  const pathname = usePathname(); // <--- added
  const searchParams = useSearchParams(); // <--- added

  // Resolve canonical slug when parent didn't provide it (best-effort client-side fetch)
  const [resolvedPlayerSlug, setResolvedPlayerSlug] = useState<string | null>(playerSlug ?? null);

  useEffect(() => {
    let abort = false;
    async function resolveSlug() {
      if (resolvedPlayerSlug) return;
      try {
        const resp = await fetch(`/api/players/${encodeURIComponent(playerId)}/header`);
        if (!resp.ok) return;
        const json = await resp.json();
        if (abort) return;
        if (json && json.slug) setResolvedPlayerSlug(String(json.slug));
      } catch (e) {
        // ignore: best-effort
      }
    }
    if (!resolvedPlayerSlug && playerId) resolveSlug();
    return () => { abort = true; };
  }, [playerId, resolvedPlayerSlug, playerSlug]);

  const [years, setYears] = useState<number[]>(initialYears ?? []);
  // Lazy initializer: read from props first, then fall back to URL at mount time (avoids one-frame flicker)
  const [selectedYear, setSelectedYear] = useState<number | null>(() => {
    if (initialSelectedYear) return initialSelectedYear;
    if (initialSeasonYear)   return initialSeasonYear;
    // Try to read from URL synchronously (only works client-side)
    if (typeof window !== 'undefined') {
      const parts = window.location.pathname.split('/').filter(Boolean);
      const seasonIdx = parts.lastIndexOf('season');
      if (seasonIdx !== -1 && seasonIdx < parts.length - 1) {
        const maybeYear = Number(parts[seasonIdx + 1]);
        if (!Number.isNaN(maybeYear) && maybeYear > 1900) return maybeYear;
      }
      const yp = new URLSearchParams(window.location.search).get('year');
      if (yp) { const y = Number(yp); if (!Number.isNaN(y) && y > 1900) return y; }
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(!initialAllMatches);
  const [error, setError] = useState<string | null>(null);

  // Per-year match cache: avoids re-fetching and avoids fetching all-years at once
  const matchCacheRef = useRef<Map<number, Match[]>>(new Map());
  // Pre-populate cache with SSR data
  if (initialAllMatches && initialSeasonYear &&
      !matchCacheRef.current.has(initialSeasonYear)) {
    matchCacheRef.current.set(initialSeasonYear, initialAllMatches as Match[]);
  }

  const [allMatches, setAllMatches] = useState<Match[]>(() => {
    if (initialAllMatches && initialAllMatches.length) return initialAllMatches as Match[];
    return [];
  });
  const [openDropdown, setOpenDropdown] = useState(false);

  // Fetch years list once if not provided by SSR
  useEffect(() => {
    if (initialYears && initialYears.length) return;
    let abort = false;
    fetch(`/api/players/seasons?id=${encodeURIComponent(playerId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (abort || !Array.isArray(data)) return;
        const sorted = (data as number[]).filter(y => typeof y === 'number').sort((a, b) => b - a);
        setYears(sorted);
        if (!selectedYear && sorted.length) setSelectedYear(sorted[0]);
      })
      .catch(() => {});
    return () => { abort = true; };
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch matches for the selected year (uses cache, never fetches all years)
  useEffect(() => {
    if (!selectedYear) return;

    // Already have data for this year (SSR or prev fetch)
    if (matchCacheRef.current.has(selectedYear)) {
      setAllMatches(matchCacheRef.current.get(selectedYear)!);
      setLoading(false);
      return;
    }

    let abort = false;
    setLoading(true);
    setError(null);

    fetch(`/api/seasons/${selectedYear}/allmatches?id=${encodeURIComponent(playerId)}`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Match[]) => {
        if (abort) return;
        matchCacheRef.current.set(selectedYear, data);
        setAllMatches(data);
        setLoading(false);
      })
      .catch(e => {
        if (!abort) { setError(e.message); setLoading(false); }
      });

    return () => { abort = true; };
  }, [selectedYear, playerId]);

  // Keep component state in sync with URL query param changes
  useEffect(() => {
    // If pathname encodes the year (e.g. /season/2026), prefer it, otherwise fall back to ?year=
    const pathYear = (() => {
      if (!pathname) return null;
      const parts = pathname.split("/").filter(Boolean);
      const last = parts[parts.length - 1];
      const maybeYear = /^[0-9]{4}$/.test(last) ? Number(last) : null;
      if (maybeYear) {
        const seasonIdx = parts.lastIndexOf("season");
        if (seasonIdx !== -1 && seasonIdx === parts.length - 2) return maybeYear;
      }
      return null;
    })();

    if (pathYear !== null) {
      setSelectedYear(pathYear);
      return;
    }

    const paramYear = searchParams?.get("year");
    if (!paramYear) return;
    const y = Number(paramYear);
    if (!Number.isNaN(y)) setSelectedYear(y);
  }, [searchParams, pathname]);

  // Remember last-seen 'sub' for season so that navigating back to season can restore it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sub = searchParams?.get('sub');
    if (sub) {
      (window as any).__player_last_season_sub = sub;
    } else {
      delete (window as any).__player_last_season_sub;
    }
  }, [searchParams]);

  const updateUrlYear = (year: number | null) => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");

    // Detect if current path is the season tab (e.g. /players/slug/season or /players/slug/season/2026)
    const parts = pathname.split("/").filter(Boolean);
    const seasonIdx = parts.lastIndexOf("season");
    const isSeasonPath = seasonIdx !== -1;

    if (isSeasonPath) {
      // Build base path up to /season
      const base = "/" + parts.slice(0, seasonIdx + 1).join("/");
      // When using path-based year keep the path clean: remove year query param
      params.delete("year");
      if (year === null) {
        router.push(`${base}${params.toString() ? `?${params.toString()}` : ""}`);
      } else {
        router.push(`${base}/${year}${params.toString() ? `?${params.toString()}` : ""}`);
      }
    } else {
      if (year === null) params.delete("year");
      else params.set("year", String(year));
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  // Heavy computation runs off the main thread via requestIdleCallback.
  // When SSR pre-computed initialSeasonStats, the hook skips client-side computation entirely for that year.
  const { stats, computing } = useYearStatsAsync(allMatches, selectedYear ?? 0, playerId, {
    initialStatsForYear: (initialSeasonStats && initialSeasonYear)
      ? { stats: initialSeasonStats, year: initialSeasonYear }
      : null,
  });
  const {
    tourneysForYear,
    seasonAgg,
    surfacesAgg,
    levelsAgg,
    vsRankAgg,
    roundsAgg,
    setsAgg,
    gamesAgg,
    tiebreakAgg,
  } = stats;

  // 6 sections total; on mobile reveal one at a time via requestIdleCallback
  const SECTION_COUNT = 6;
  const { isMobile: isMobileCards, visibleCount, sentinelRef } = useIncrementalCards(
    selectedYear && !computing ? SECTION_COUNT : 0,
    { initialVisible: 1, debounceMs: 800 }
  );

  const matchesIndividual = useMemo(
    () => allMatches.filter((m) => !m.team_event),
    [allMatches]
  );

  const tourneysForDisplay = useMemo(
    () => tourneysForYear.filter((tourney) =>
      matchesIndividual.some((m) => m.tourney_id === tourney.tourney_id)
    ),
    [tourneysForYear, matchesIndividual]
  );

  // Dev-only: log computed tourneys arrays so we can diagnose empty UI
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    try {
      console.debug('[Seasons] tourneysForYear count', tourneysForYear.length, 'sample', tourneysForYear.slice(0,5));
      console.debug('[Seasons] matchesIndividual count', matchesIndividual.length, 'sampleTourneys', Array.from(new Set(matchesIndividual.map(m => m.tourney_id))).slice(0,10));
      console.debug('[Seasons] tourneysForDisplay count', tourneysForDisplay.length, 'sample', tourneysForDisplay.slice(0,5));
    } catch (e) {}
  }

  return (
    <div
      className="w-full p-4 section"
      style={{
        backgroundColor: "rgb(27,36,48)",
      }}
    >
      {/* --- Super Cool Season Selector + View All Matches Button (inline label) --- */}
      <div className="mb-6 flex items-center gap-6">
        <div className="inline-flex items-center gap-4">
          <span className="font-extrabold text-2xl text-yellow-400">Season:</span>
          <div className="relative inline-block">
            <button
              onClick={() => setOpenDropdown((o) => !o)}
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-2xl py-3 px-8 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-between w-60"
            >
              {selectedYear || "Select Year"}
              <svg
                className={`w-6 h-6 transition-transform duration-300 ${openDropdown ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openDropdown && (
              <ul className="absolute mt-2 w-60 bg-gray-800 text-white rounded-xl shadow-2xl z-50 max-h-72 overflow-auto">
                {years.map((y) => (
                  <li key={y}>
                    <Link
                      href={`/players/${encodeURIComponent(resolvedPlayerSlug ?? playerSlug ?? playerId)}/season/${y}`}
                      className="block px-8 py-3 hover:bg-yellow-400 hover:text-black cursor-pointer transition-all duration-200"
                      onClick={() => {
                        setSelectedYear(y);
                        setOpenDropdown(false);
                      }}
                    >
                      {y}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Big button that links to player's matches filtered by the selected year */}
        <div>
          {selectedYear ? (
            <Link
              href={`${getPlayerHref(resolvedPlayerSlug ?? playerSlug ?? playerId)}/matches?year=${selectedYear}`}
              className="inline-block bg-blue-600 hover:bg-blue-700 shadow-lg text-white font-bold text-2xl py-3 px-8 rounded-full transition-all duration-200"
            >
              View All Matches
            </Link>
          ) : (
            <span className="inline-block bg-blue-600/50 cursor-not-allowed opacity-60 text-white font-bold text-2xl py-3 px-8 rounded-full">
              View All Matches
            </span>
          )}
        </div>
      </div>

      {loading && <div className="text-gray-400 mb-4">Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}
      {computing && !loading && (
        <div className="text-yellow-400/70 text-sm mb-2 animate-pulse">Computing stats…</div>
      )}

      {!selectedYear ? (
        <div className="text-gray-400 text-xl">Select a season</div>
      ) : (
        <div style={{ opacity: computing ? 0.6 : 1, transition: "opacity 0.3s" }}>
          {/* Always render on mobile via CSS (sm:hidden) — avoids post-hydration layout shift */}
          <div className="text-gray-200 mb-4 sm:hidden">
            Wins: {seasonAgg.wins}–{seasonAgg.losses} ({((seasonAgg.wins/(seasonAgg.wins+seasonAgg.losses))*100).toFixed(1)}%)
          </div>

          {/* Section 1: Tournament Grid */}
          {(!isMobileCards || visibleCount >= 1) && (
            <TournamentGrid tourneys={tourneysForDisplay} getTourneyLink={getTourneyLink} />
          )}

          {/* Section 2: Row 1 */}
          {(!isMobileCards || visibleCount >= 2) && (
          <div className="flex flex-wrap gap-6 mt-8">
            <div className="flex-1 min-w-[300px]">
              <WLStatTable
                title="W-L"
                rows={[{ label: "Season", wins: seasonAgg.wins, losses: seasonAgg.losses, color: palette[0] }]}
              />
            </div>
            <div className="flex-1 min-w-[300px]">
              <WLStatTable
                title="Surfaces"
                rows={surfacesAgg.map((row) => ({
                  label: row.surface,
                  wins: row.wins,
                  losses: row.losses,
                  color: getSurfaceColor(row.surface),
                }))}
              />
            </div>
            <div className="flex-1 min-w-[300px]">
              <WLStatTable
                title="Categories"
                rows={levelsAgg.map((row, idx) => {
                  const levelName = getLevelFullName(row.level).toLowerCase();
                  let color: string;
                  switch (true) {
                    case levelName.includes("grand slam"):
                      color = "#A855F7";
                      break;
                    case levelName.includes("atp 1000") || levelName.includes("masters 1000"):
                      color = "#06B6D4";
                      break;
                    case levelName.includes("atp 500"):
                      color = "#22C55E";
                      break;
                    case levelName.includes("atp 250"):
                      color = "#EF4444";
                      break;
                    default:
                      color = getLevelColors(row.level)?.bar || palette[idx % palette.length];
                  }
                  return { label: getLevelFullName(row.level), wins: row.wins, losses: row.losses, color };
                })}
              />
            </div>
          </div>
          )}

          {/* Section 3: Row 2 */}
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
                  const order = ["F", "SF", "QF", "R16", "R32", "R64", "R128", "RR"];
                  const sorted = [...roundsAgg].sort((a, b) => {
                    const ia = order.indexOf(a.round);
                    const ib = order.indexOf(b.round);
                    if (ia === -1 && ib === -1) return a.round.localeCompare(b.round);
                    if (ia === -1) return 1;
                    if (ib === -1) return -1;
                    return ia - ib;
                  });
                  return sorted.map((r, i) => ({
                    label: r.round,
                    wins: r.wins,
                    losses: r.losses,
                    color: palette[i % palette.length],
                  }));
                })()}
              />
            </div>
          </div>
          )}

          {/* Section 4: Row 3 */}
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
                  { label: "Match TB", wins: tiebreakAgg.super.wins, losses: tiebreakAgg.super.losses, color: palette[4] },
                  { label: "Overall", wins: tiebreakAgg.overall.wins, losses: tiebreakAgg.overall.losses, color: palette[5] },
                ]}
              />
            </div>
          </div>
          )}

          {/* Sentinel: triggers next section load on mobile */}
          {isMobileCards && visibleCount < SECTION_COUNT && (
            <div ref={sentinelRef} style={{ height: 1 }} />
          )}

          {/* Section 5: Summary table */}
          {(!isMobileCards || visibleCount >= 5) && (
            <SummarySeasons years={years} allMatches={allMatches} playerId={playerId} playerSlug={resolvedPlayerSlug ?? playerSlug} selectedYear={selectedYear!} />
          )}

          {/* Section 6+7: Service & Return Statistics side by side */}
          {(!isMobileCards || visibleCount >= 6) && (
            <div className="flex flex-wrap gap-8 mt-10">
              <div style={{ flex: 1, minWidth: 320 }}>
                <PlayerServiceSpider
                  matches={allMatches}
                  playerId={playerId}
                  playerName={playerName || playerId}
                />
              </div>
              <div style={{ flex: 1, minWidth: 320 }}>
                <PlayerReturnSpider
                  matches={allMatches}
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
