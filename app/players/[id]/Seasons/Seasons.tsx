"use client";

import React, { useEffect, useState, useMemo } from "react";
import type { Match } from "@/types";
import { getLevelColors, getLevelFullName } from "@/lib/utils";
import { getSurfaceColor, palette } from "@/lib/colors";
import SummarySeasons from "./SummarySeasons";
import TournamentGrid from "../TournamentGrid";
import { useYearStats } from "./useYearStats";
import { useRouter, usePathname, useSearchParams } from "next/navigation"; // <--- added

interface SeasonsProps {
  playerId: string;
}

const getTourneyLink = (tourneyId?: string, year?: number) => {
  if (!tourneyId || !year) return "#";
  return `/tournaments/${tourneyId}/${year}`;
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

      <div className="card relative border-l-4 border-yellow-400 bg-gray-800/90 p-6 pl-8 pt-8 shadow-xl rounded-2xl backdrop-blur-md overflow-visible">
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
export default function Seasons({ playerId }: SeasonsProps) {
  const router = useRouter(); // <--- added
  const pathname = usePathname(); // <--- added
  const searchParams = useSearchParams(); // <--- added

  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [openDropdown, setOpenDropdown] = useState(false);

  useEffect(() => {
    let abort = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/players/allmatches?id=${encodeURIComponent(playerId)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (abort) return;

        setAllMatches(data);
        const uniqYears = Array.from(new Set(data.map((m) => m.year))).sort((a, b) => b - a);
        setYears(uniqYears);

        // If a year is present in URL params and valid -> select it, otherwise default to first year
        const paramYear = searchParams?.get("year");
        const numericParamYear = paramYear ? Number(paramYear) : null;
        if (numericParamYear && uniqYears.includes(numericParamYear)) {
          setSelectedYear(numericParamYear);
        } else if (uniqYears.length > 0) {
          setSelectedYear(uniqYears[0]);
        }
      } catch (e: any) {
        if (!abort) setError(e instanceof Error ? e.message : "Error loading seasons");
      } finally {
        if (!abort) setLoading(false);
      }
    }
    load();
    return () => {
      abort = true;
    };
  }, [playerId, searchParams]);

  // Keep component state in sync with URL query param changes
  useEffect(() => {
    const paramYear = searchParams?.get("year");
    if (!paramYear) return;
    const y = Number(paramYear);
    if (!Number.isNaN(y)) setSelectedYear(y);
  }, [searchParams]);

  const updateUrlYear = (year: number | null) => {
    // guard: ensure we have a pathname
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (year === null) params.delete("year");
    else params.set("year", String(year));
    // Use router.push to update url (client side) - replace with .replace if you prefer not to add history entries
    router.push(`${pathname}?${params.toString()}`);
  };

  const matchesForStats = allMatches;
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
  } = useYearStats(matchesForStats, selectedYear, playerId);

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

  return (
    <div
      className="h-full w-full p-4 overflow-auto section"
      style={{ backgroundColor: "rgba(31,41,55,0.95)", backdropFilter: "blur(4px)" }}
    >
      {/* --- Super Cool Season Selector --- */}
      <div className="mb-6 relative inline-block">
        <label className="block mb-2 font-extrabold text-2xl text-yellow-400">Season:</label>
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
              <li
                key={y}
                className="px-8 py-3 hover:bg-yellow-400 hover:text-black cursor-pointer transition-all duration-200"
                onClick={() => {
                  setSelectedYear(y);
                  setOpenDropdown(false);
                  updateUrlYear(y); // <--- update the URL when year is selected
                }}
              >
                {y}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <div className="text-gray-400 mb-4">Loading...</div>}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {!selectedYear ? (
        <div className="text-gray-400 text-xl">Select a season</div>
      ) : (
        <>
          <TournamentGrid tourneys={tourneysForDisplay} getTourneyLink={getTourneyLink} />

          {/* Row 1 */}
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

          {/* Row 2 */}
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

          {/* Row 3 */}
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

          <SummarySeasons years={years} allMatches={allMatches} playerId={playerId} />
        </>
      )}
    </div>
  );
}
