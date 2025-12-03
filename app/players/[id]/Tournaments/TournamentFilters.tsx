"use client";

import React, { useEffect, useState } from "react";

interface TournamentOption {
  id: string;
  name: string;
}

interface TournamentFiltersProps {
  tournament: string;
  setTournament: (t: string) => void;
  tournamentOptions: TournamentOption[];
  level: string;
  setLevel: (lv: string) => void;
  levelOptions: string[];
  surface: string;
  setSurface: (s: string) => void;
  surfaceOptions: string[];
  round: string;
  setRound: (r: string) => void;
  roundOptions: string[];
  season: string;
  setSeason: (s: string) => void;
  seasonOptions: number[];
  search: string;
  setSearch: (s: string) => void;
  loading?: boolean;
  error?: string | null;
}

export default function TournamentFilters({
  tournament,
  setTournament,
  tournamentOptions,
  level,
  setLevel,
  levelOptions,
  surface,
  setSurface,
  surfaceOptions,
  round,
  setRound,
  roundOptions,
  season,
  setSeason,
  seasonOptions,
  search,
  setSearch,
  loading,
  error
}: TournamentFiltersProps) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // 🔧 Elimina eventuali duplicati dell'opzione "All"
  const cleanTournamentOptions = tournamentOptions.filter(
    (t) => t.id.trim() !== "" && t.name.trim().toLowerCase() !== "all"
  );

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(debouncedSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [debouncedSearch, setSearch]);

  return (
    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      
      {/* Tournament selector */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="tournament-select">Tournament</label>
        <select
          id="tournament-select"
          value={tournament || ""}
          onChange={(e) => setTournament(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="">All</option>
          {cleanTournamentOptions.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Season selector */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="season-select">Season</label>
        <select
          id="season-select"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {seasonOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Level selector */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="level-select">Level</label>
        <select
          id="level-select"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {levelOptions.map((lv) => (
            <option key={lv} value={lv}>{lv}</option>
          ))}
        </select>
      </div>

      {/* Surface selector */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="surface-select">Surface</label>
        <select
          id="surface-select"
          value={surface}
          onChange={(e) => setSurface(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {surfaceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Round selector */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="round-select">Round</label>
        <select
          id="round-select"
          value={round}
          onChange={(e) => setRound(e.target.value)}
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        >
          <option value="All">All</option>
          {roundOptions.map((r) => (
            <option key={r} value={r}>{r === "W" ? "Won Tournament" : r}</option>
          ))}
        </select>
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2">
        <label className="w-28 font-semibold text-white" htmlFor="search-input">Search</label>
        <input
          id="search-input"
          value={debouncedSearch}
          onChange={(e) => setDebouncedSearch(e.target.value)}
          placeholder="Tournament..."
          className="border border-gray-600 bg-gray-800 text-white px-2 py-1 rounded w-full focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
          disabled={loading || !!error}
        />
      </div>
    </div>
  );
}
