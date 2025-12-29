"use client";

import { useEffect, useState } from "react";
import {getLevelFullName, extractUniqueSurfaces} from "@/lib/utils";
import {
  getSurfaceColor,
  getLevelColor,
  getTextColorForRound,
} from "@/lib/colors";

interface TournamentHeaderProps {
  id?: number;
}

interface TournamentData {
  id: number;
  name: string | string[];
  surfaces: string[];
  indoor: boolean | null;
  city?: string;
  country?: string;
  atp_category?: any;
  editions?: number[];
}

// Funzione helper per edizioni
function formatEditionRanges(years: number[]): string[] {
  if (!years || years.length === 0) return [];
  const sorted = [...years].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    if (current === prev + 1) {
      prev = current;
      continue;
    }
    ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
    start = current;
    prev = current;
  }

  ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
  return ranges;
}

export default function TournamentHeader({ id }: TournamentHeaderProps) {
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Fallback: per-edition categories (kept as a hook to preserve hook order)
  const [fallbackLevels, setFallbackLevels] = useState<any[] | null>(null);

  useEffect(() => {
    if (typeof id === 'undefined' || id === null) return;
    const controller = new AbortController();

    const fetchHeader = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}/header`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Failed to fetch tournament header");
        const data: TournamentData = await res.json();
        setTournament(data);
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHeader();
    return () => controller.abort();
  }, [id]);

  // Fallback: if tournament has no atp_category, derive categories from editions
  useEffect(() => {
    if (!tournament) return;
    if (levels && levels.length > 0) return; // already have categories
    // fetch editions and extract per-edition categories
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}?source=matches`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const ed = Array.isArray(data?.editionsData) ? data.editionsData : [];
        const cats = ed.map((e: any) => e?.atpCategory).filter(Boolean);
        if (cats.length > 0) setFallbackLevels(cats);
      } catch (err) {
        // ignore
      }
    })();
    return () => controller.abort();
  }, [tournament, id]);

  if (loading)
    return (
      <div
        className="text-center p-4 text-xl animate-pulse text-gray-400"
        aria-busy="true"
      >
        Loading tournament info…
      </div>
    );

  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
  if (!tournament) return null;

  // Nome torneo
  const displayName = Array.isArray(tournament.name)
    ? tournament.name.at(-1) || "n/d"
    : tournament.name || "n/d";

  // Livelli normalizzati in array
  const levels = Array.isArray(tournament.atp_category)
    ? tournament.atp_category
    : tournament.atp_category
    ? [tournament.atp_category]
    : [];



  // Deduplicate and format level labels (use fallback when needed)
  const sourceLevels = (levels && levels.length > 0) ? levels : (fallbackLevels ?? []);
  const levelLabels = sourceLevels.map((l) => getLevelFullName(l));
  const uniqueLevelLabels = Array.from(new Set(levelLabels)).filter(Boolean);

  // Superfici (normalize and remove any 'indoor' tokens)
  const surfaces = extractUniqueSurfaces(tournament.surfaces);

  // Edizioni
  const editionRanges =
    tournament.editions && tournament.editions.length > 0
      ? formatEditionRanges(tournament.editions)
      : [];

  return (
    <header className="relative bg-gradient-to-r from-green-700 via-green-500 to-yellow-400 text-white p-8 rounded-2xl mb-8 w-full shadow-xl overflow-hidden">
      {/* Livelli (badge multipli) */}
      <div className="absolute top-4 right-6 flex flex-wrap gap-2">
        {uniqueLevelLabels.map((label, i) => {
          const color = getLevelColor(label) ?? "#555";
          const textColor = getTextColorForRound(color);
          return (
            <span
              key={i}
              className="px-4 py-1 rounded-full text-sm font-semibold shadow-md"
              style={{ backgroundColor: color, color: textColor }}
            >
              {label}
            </span>
          );
        })}
      </div>

      {/* Nome torneo */}
      <div className="flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold drop-shadow-lg break-words whitespace-normal">
          {displayName}
        </h1>

        {/* Other historical names (smaller, deduped, exclude displayName) */}
        {(() => {
          const allNames = Array.isArray(tournament.name) ? tournament.name : [String(tournament.name)];
          const displayNorm = String(displayName).trim().toLowerCase();
          const seen = new Set<string>();
          const others: string[] = [];
          for (const raw of allNames) {
            const n = (typeof raw === 'string' ? raw.trim() : String(raw)).trim();
            if (!n) continue;
            const norm = n.toLowerCase();
            if (norm === displayNorm) continue; // exclude main display name (case-insensitive)
            if (seen.has(norm)) continue; // dedupe
            seen.add(norm);
            others.push(n);
          }
          if (others.length === 0) return null;
          return (
            <p className="mt-1 text-sm md:text-base text-white/80">
              {others.join(', ')}
            </p>
          );
        })()}

        {editionRanges.length > 0 && (
          <p className="mt-3 text-lg md:text-xl font-medium text-white/90">
            {editionRanges.join(", ")}
          </p>
        )}
      </div>

      {/* Superfici */}
      <div className="absolute bottom-4 left-6 flex flex-wrap gap-2">
        {surfaces.map((surface, i) => {
          const color = getSurfaceColor(surface) ?? "#888";
          const textColor = getTextColorForRound(color);
          return (
            <span
              key={i}
              className="text-base md:text-lg font-medium px-3 py-1 rounded-full shadow-md"
              style={{ backgroundColor: color, color: textColor }}
            >
              {surface}
            </span>
          );
        })}
      </div>
    </header>
  );
}
