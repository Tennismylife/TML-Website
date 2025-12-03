"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { Match } from "@/types";
import { getLevelFullName } from "@/lib/utils";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface H2HFiltersProps {
  mainPlayer: string;
  allMatches: Match[];
  loading: boolean;
  error: string | null;
  filters: {
    year: number | "All";
    level: string;
    surface: string;
    round: string;
    tournament: string;
    opponent: string;
  };
  setFilters: (filters: Partial<H2HFiltersProps["filters"]>) => void;
}

const LEVEL_ORDER = ["G", "M", "A", "O", "D", "Unknown"];
const ROUND_ORDER = ["R128","R64","R32","R16","QF","SF","F","W","RR","BR","Unknown"];
const SURFACE_ORDER = ["Hard","Clay","Grass","Carpet","Unknown"];

export default function H2HFilters({ mainPlayer, allMatches, loading, error, filters, setFilters }: H2HFiltersProps) {
  const [searchOpponent, setSearchOpponent] = useState(filters.opponent || "");
  const [debouncedOpponent, setDebouncedOpponent] = useState(searchOpponent);

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Debounce opponent search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedOpponent(searchOpponent);
      setFilters({ opponent: searchOpponent });
    }, 300);
    return () => clearTimeout(handler);
  }, [searchOpponent, setFilters]);

  // Sync URL params
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams?.toString() ?? "");

      if (filters.year !== "All") params.set("year", String(filters.year)); else params.delete("year");
      if (filters.level !== "All") params.set("level", filters.level); else params.delete("level");
      if (filters.surface !== "All") params.set("surface", filters.surface); else params.delete("surface");
      if (filters.round !== "All") params.set("round", filters.round); else params.delete("round");
      if (filters.tournament !== "All") params.set("tourney", filters.tournament); else params.delete("tourney");
      if (debouncedOpponent && debouncedOpponent.trim() !== "") params.set("opponent", debouncedOpponent); else params.delete("opponent");

      router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
    }, 200);
    return () => { clearTimeout(timeout); };
  }, [filters.year, filters.level, filters.surface, filters.round, filters.tournament, debouncedOpponent, router, pathname, searchParams]);

  // Filtra i match in base all'opponent, considerando sia vittorie che sconfitte
  const filteredMatches = useMemo(() => {
    if (!debouncedOpponent) return allMatches;
    return allMatches.filter(m =>
      (m.winner_name === mainPlayer && m.loser_name.toLowerCase().includes(debouncedOpponent.toLowerCase())) ||
      (m.loser_name === mainPlayer && m.winner_name.toLowerCase().includes(debouncedOpponent.toLowerCase()))
    );
  }, [allMatches, mainPlayer, debouncedOpponent]);

  // Aggiunge l'opponent dinamicamente per la visualizzazione
  const allMatchesWithOpponent = useMemo(() => {
    return filteredMatches.map(m => {
      const opponent = m.winner_name === mainPlayer ? m.loser_name : m.winner_name;
      return { ...m, opponent };
    });
  }, [filteredMatches, mainPlayer]);

  // Opzioni dinamiche dei filtri
  const yearOptions = useMemo(() => Array.from(new Set(filteredMatches.map(m => m.year))).sort((a,b)=>b-a), [filteredMatches]);
  const levelOptions = useMemo(() => Array.from(new Set(filteredMatches.map(m => m.tourney_level ?? "Unknown")))
    .sort((a,b)=>LEVEL_ORDER.indexOf(a)-LEVEL_ORDER.indexOf(b)), [filteredMatches]);
  const surfaceOptions = useMemo(() => Array.from(new Set(filteredMatches.map(m => m.surface ?? "Unknown")))
    .sort((a,b)=>SURFACE_ORDER.indexOf(a)-SURFACE_ORDER.indexOf(b)), [filteredMatches]);
  const roundOptions = useMemo(() => Array.from(new Set(filteredMatches.map(m => m.round ?? "Unknown")))
    .sort((a,b)=>ROUND_ORDER.indexOf(a)-ROUND_ORDER.indexOf(b)), [filteredMatches]);
  const tournamentOptions = useMemo(() => Array.from(new Set(filteredMatches
    .filter(m => m.tourney_name && !m.tourney_name.toLowerCase().includes("davis"))
    .map(m => m.tourney_name)))
    .sort(), [filteredMatches]);

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      {/* Season */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Season</label>
        <select
          value={filters.year === "All" ? "All" : String(filters.year)}
          onChange={e => setFilters({ year: e.target.value === "All" ? "All" : Number(e.target.value) })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Level */}
      <div className="flex items-center gap-2">
        <label className="w-32 font-semibold text-white">Level</label>
        <select
          value={filters.level}
          onChange={e => setFilters({ level: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
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
          onChange={e => setFilters({ surface: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
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
          onChange={e => setFilters({ round: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
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
          onChange={e => setFilters({ tournament: e.target.value })}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {tournamentOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Opponent search */}
      <div className="flex items-center gap-2">
        <label className="w-24 font-semibold text-white">Opponent</label>
        <input
          type="text"
          value={searchOpponent}
          onChange={e => setSearchOpponent(e.target.value)}
          placeholder="Search opponent..."
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        />
      </div>
    </div>
  );
}
