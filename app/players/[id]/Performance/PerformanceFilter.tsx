"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Match } from "@/types";
import { getLevelFullName } from "@/lib/utils";

const LEVEL_ORDER = ["G", "M", "A", "O", "D", "Unknown"];
const ROUND_ORDER = ["R128","R64","R32","R16","QF","SF","F","W","RR","BR","Unknown"];
const SURFACE_ORDER = ["Hard","Clay","Grass","Carpet","Unknown"];

// Default filters to avoid runtime crash when parent doesn't pass filters
const DEFAULT_FILTERS: { year: number | "All"; level: string; surface: string; round: string; tournament: string; } = {
  year: "All",
  level: "All",
  surface: "All",
  round: "All",
  tournament: "All",
};

interface PerformanceFilterProps {
  allMatches: Match[];
  loading?: boolean;
  error?: string | null;

  filters?: {
    year: number | "All";
    level: string;
    surface: string;
    round: string;
    tournament: string;
  };
  setFilters?: (partial: Partial<PerformanceFilterProps["filters"]>) => void;

  onFilteredChange?: (filtered: Match[]) => void;
}

export default function PerformanceFilter({
  allMatches,
  loading,
  error,
  filters: controlledFilters,
  setFilters: controlledSetFilters,
  onFilteredChange = () => {},
}: PerformanceFilterProps) {
  const [localFilters, setLocalFilters] = useState<PerformanceFilterProps['filters']>(DEFAULT_FILTERS);

  const filters = controlledFilters ?? localFilters;
  const setFilters = controlledSetFilters ?? ((partial: Partial<PerformanceFilterProps['filters']>) => {
    setLocalFilters(prev => ({ ...prev, ...partial }));
  });

  // Compute filter options
  const yearOptions = useMemo(() => {
    const ys = new Set<number>();
    allMatches.forEach(m => ys.add(m.year));
    return Array.from(ys).sort((a, b) => b - a);
  }, [allMatches]);

  const levelOptions = useMemo(() => {
    const s = new Set(allMatches.map(m => m.tourney_level ?? "Unknown"));
    return LEVEL_ORDER.filter(l => s.has(l));
  }, [allMatches]);

  const surfaceOptions = useMemo(() => {
    const s = new Set(allMatches.map(m => m.surface ?? "Unknown"));
    return SURFACE_ORDER.filter(surf => s.has(surf));
  }, [allMatches]);

  const roundOptions = useMemo(() => {
    const s = new Set(allMatches.map(m => m.round ?? "Unknown"));
    return ROUND_ORDER.filter(r => s.has(r));
  }, [allMatches]);

  const tournamentOptions = useMemo(() => {
    const s = new Set<string>();
    allMatches.forEach(m => {
      if (m.tourney_name && !m.tourney_name.toLowerCase().includes("davis")) {
        s.add(m.tourney_name);
      }
    });
    return Array.from(s).sort();
  }, [allMatches]);

  // Filter matches and notify parent
  const filteredMatches = useMemo(() => {
    return allMatches.filter(m => {
      if (filters.year !== "All" && m.year !== filters.year) return false;
      if (filters.level !== "All" && (m.tourney_level ?? "Unknown") !== filters.level) return false;
      if (filters.surface !== "All" && (m.surface ?? "Unknown") !== filters.surface) return false;
      if (filters.round !== "All" && (m.round ?? "Unknown") !== filters.round) return false;
      if (filters.tournament !== "All" && (m.tourney_name ?? "") !== filters.tournament) return false;
      return true;
    });
  }, [allMatches, filters]);

  useEffect(() => {
    onFilteredChange(filteredMatches);
  }, [filteredMatches, onFilteredChange]);

  const selectClass = "border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50";

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Season */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Season</label>
        <select
          value={filters.year === "All" ? "All" : String(filters.year)}
          onChange={(e) => setFilters({ year: e.target.value === "All" ? "All" : Number(e.target.value) })}
          className={selectClass}
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Level */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Level</label>
        <select
          value={filters.level}
          onChange={(e) => setFilters({ level: e.target.value })}
          className={selectClass}
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {levelOptions.map(lv => <option key={lv} value={lv}>{getLevelFullName(lv)}</option>)}
        </select>
      </div>

      {/* Surface */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Surface</label>
        <select
          value={filters.surface}
          onChange={(e) => setFilters({ surface: e.target.value })}
          className={selectClass}
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {surfaceOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Round */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Round</label>
        <select
          value={filters.round}
          onChange={(e) => setFilters({ round: e.target.value })}
          className={selectClass}
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {roundOptions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Tournament */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Tournament</label>
        <select
          value={filters.tournament}
          onChange={(e) => setFilters({ tournament: e.target.value })}
          className={selectClass}
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {tournamentOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}
