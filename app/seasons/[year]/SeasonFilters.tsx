"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getLevelFullName } from "@/lib/utils";

type TourneyTile = {
  key: string;
  extractedId: string;
  surface?: string | null;
  name: string;
  date: string;
  draw_size: string;
  winner_ioc: string;
  winner: string;
  loser_ioc: string;
  loser: string;
  score: string;
  round?: string;
  level?: string;
  hasFinal?: boolean;
};

interface Props {
  tournaments: TourneyTile[];
  onFiltered: (filtered: TourneyTile[]) => void;
}

export default function SeasonFilters({ tournaments, onFiltered }: Props) {
  // Internal state for filters
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("all");
  const [nameQuery, setNameQuery] = useState<string>("");

  // Derive options from tournaments and map values to readable labels
  type LevelOption = { value: string; label: string };
  const levelOptions = useMemo<LevelOption[]>(() => {
    const set = new Set<string>();
    for (const t of tournaments) {
      if (t.level) set.add(String(t.level));
    }
    const arr = Array.from(set);
    // Sort by readable label
    arr.sort((a, b) => getLevelFullName(a).localeCompare(getLevelFullName(b)));
    return arr.map((v) => ({ value: v, label: getLevelFullName(v) || v }));
  }, [tournaments]);

  const surfaceOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of tournaments) {
      const s = t.surface ?? "Unknown";
      set.add(String(s));
    }
    return Array.from(set).sort();
  }, [tournaments]);

  // Compute filtered list
  const filtered = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (levelFilter !== "all") {
        if (!t.level || String(t.level).toLowerCase() !== levelFilter.toLowerCase()) return false;
      }
      if (surfaceFilter !== "all") {
        const s = (t.surface ?? "Unknown").toString().toLowerCase();
        if (s !== surfaceFilter.toLowerCase()) return false;
      }
      if (q) {
        if (!t.name || !String(t.name).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tournaments, levelFilter, surfaceFilter, nameQuery]);

  // Emit filtered list when it changes
  useEffect(() => {
    onFiltered(filtered);
  }, [filtered, onFiltered]);

  return (
    <div className="mt-6 mb-6 flex flex-col md:flex-row md:items-center md:gap-4 gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium mr-2 text-gray-300">Level</label>
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="all" className="bg-gray-800 text-white">All</option>
          {levelOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-gray-800 text-white">{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium mr-2 text-gray-300">Surface</label>
        <select
          value={surfaceFilter}
          onChange={(e) => setSurfaceFilter(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
        >
          <option value="all" className="bg-gray-800 text-white">All</option>
          {surfaceOptions.map((s) => (
            <option key={s} value={s} className="bg-gray-800 text-white">{s}</option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label className="sr-only">Search tournaments</label>
        <input
          type="search"
          value={nameQuery}
          onChange={(e) => setNameQuery(e.target.value)}
          placeholder="Search tournament names..."
          className="w-full px-4 py-2 rounded bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
      </div>

      <div className="flex items-center gap-2 md:ml-auto">
        <button
          onClick={() => { setLevelFilter("all"); setSurfaceFilter("all"); setNameQuery(""); }}
          className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
