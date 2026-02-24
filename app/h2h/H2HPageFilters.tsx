"use client";

import React, { useMemo } from "react";
import type { Match } from "@/types";
import { getLevelFullName } from "@/lib/utils";

interface H2HPageFiltersProps {
  allMatches: Match[];
  loading: boolean;
  error: string | null;
  hideTourney?: boolean;
  filters: {
    year: number | "All";
    level: string;
    surface: string;
    round: string;
    tourney_name: string;
    best_of?: string; // 'All' | '3' | '5'
  };
  setFilters: (filters: Partial<H2HPageFiltersProps["filters"]>) => void;
}

const LEVEL_ORDER = ["G", "M", "A", "O", "D", "Unknown"];
const ROUND_ORDER = ["R128","R64","R32","R16","QF","SF","F","W","RR","BR","Unknown"];
const SURFACE_ORDER = ["Hard","Clay","Grass","Carpet","Unknown"];

export default function H2HPageFilters({ allMatches, loading, error, hideTourney, filters, setFilters }: H2HPageFiltersProps) {
  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    for (const m of allMatches) {
      if (m.year != null) ys.add(m.year);
    }
    return Array.from(ys).sort((a, b) => b - a);
  }, [allMatches]);

  const levelOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMatches) s.add(m.tourney_level ?? "Unknown");
    return Array.from(s).sort((a,b)=>LEVEL_ORDER.indexOf(a)-LEVEL_ORDER.indexOf(b));
  }, [allMatches]);

  const surfaceOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMatches) s.add(m.surface ?? "Unknown");
    return Array.from(s).sort((a,b)=>SURFACE_ORDER.indexOf(a)-SURFACE_ORDER.indexOf(b));
  }, [allMatches]);

  const roundOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMatches) s.add(m.round ?? "Unknown");
    return Array.from(s).sort((a,b)=>ROUND_ORDER.indexOf(a)-ROUND_ORDER.indexOf(b));
  }, [allMatches]);

  const tournamentOptions = useMemo(() => {
    const s = new Set<string>();
    for (const m of allMatches) if (m.tourney_name && !m.tourney_name.toLowerCase().includes("davis")) s.add(m.tourney_name);
    return Array.from(s).sort();
  }, [allMatches]);

  const bestOfOptions = useMemo(() => {
    const s = new Set<number>();
    for (const m of allMatches) if (Number.isFinite((m as any).best_of)) s.add(Number((m as any).best_of));
    const arr = Array.from(s).sort((a,b)=>a-b);
    return arr; // numeric array like [3,5]
  }, [allMatches]);

  return (
    <div data-testid="h2h-filters" className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Season</label>
        <select
          name="year"
          value={filters.year === "All" ? "All" : String(filters.year)}
          onChange={e => setFilters({ year: e.target.value === "All" ? "All" : Number(e.target.value) })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="w-32 font-semibold text-white">Level</label>
        <select
          name="level"
          value={filters.level}
          onChange={e => setFilters({ level: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {levelOptions.map(lv => <option key={lv} value={lv}>{getLevelFullName(lv)}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Surface</label>
        <select
          name="surface"
          value={filters.surface}
          onChange={e => setFilters({ surface: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {surfaceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Round</label>
        <select
          name="round"
          value={filters.round}
          onChange={e => setFilters({ round: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {roundOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {!hideTourney && (
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Tournament</label>
        <select
          name="tourney"
          value={filters.tourney_name}
          onChange={e => setFilters({ tourney_name: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {tournamentOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      )}

      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Best of</label>
        <select
          name="best_of"
          value={filters.best_of ?? 'All'}
          onChange={e => setFilters({ best_of: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {bestOfOptions.map(b => <option key={b} value={String(b)}>{`Best of ${b}`}</option>)}
        </select>
      </div>
    </div>
  );
}