"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Match } from "@/types";
import TournamentFilters from "./TournamentFilters";
import TournamentGrid from "../TournamentGrid";
import TournamentSummary from "./TournamentSummary";

const ROUND_ORDER = ["R256","R128","R64","R32","R16","QF","SF","BR","F","W"];
const LEVEL_ORDER = ["G","M","500","250","A","O","D","F"];
const SURFACE_ORDER = ["Hard","Clay","Grass","Carpet"];

const LEVEL_LABELS: Record<string, string> = {
  "G": "Grand Slam",
  "M": "Masters 1000",
  "A": "Others",
  "250": "ATP 250",
  "500": "ATP 500",
  "O": "Olympics",
  "F": "Finals",
};

const CODE_TO_LABEL = LEVEL_LABELS;
const LABEL_TO_CODE = Object.fromEntries(Object.entries(LEVEL_LABELS).map(([k, v]) => [v, k]));

function toDate(d?: string | null): Date | null {
  if (!d) return null;
  const dt = new Date(d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function roundWeight(r?: string) {
  const idx = ROUND_ORDER.indexOf(r ?? "Unknown");
  return idx >= 0 ? idx : -1;
}

type Row = {
  key: string;
  year: number;
  tourney_name: string;
  level: string;
  surface: string;
  tourney_id: string | null;
  matches: number;
  W: number;
  L: number;
  bestRound: string;
  champion: boolean;
  order: number;
  tourney_date?: Date;
};

function getM(m: Match): number {
  // support different shapes the API may return (M or matches)
  return Number((m as any).M ?? (m as any).matches ?? 1);
}
function getW(m: Match): number {
  return Number((m as any).W ?? (m as any).wins ?? 0);
}
function getL(m: Match): number {
  return Number((m as any).L ?? (m as any).losses ?? 0);
}

interface TournamentOption {
  id: string;
  name: string;
}

interface TournamentsProps {
  playerId: string;
}

export default function Tournaments({ playerId }: TournamentsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTourney, setSelectedTourney] = useState<string>("");
  const [level, setLevel] = useState<string>(CODE_TO_LABEL[searchParams.get('level') || "All"] || "All");
  const [surface, setSurface] = useState<string>(searchParams.get('surface') || "All");
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || "");
  const [round, setRound] = useState<string>(searchParams.get('round') || "All");
  const [season, setSeason] = useState<string>(searchParams.get('season') || "All");

  const [subTab, setSubTab] = useState<"events" | "summary">(
    (searchParams.get("sub") as "events" | "summary") || "events"
  );

  // --- Fetch matches ---
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/players/tournaments?id=${encodeURIComponent(playerId)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (!abort) setAllMatches(data);
      } catch (e) {
        if (!abort) setError((e as Error).message || "Error loading tournaments.");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, [playerId]);

  // --- Tournament Options ---
  const tournamentOptions: TournamentOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of allMatches) {
      if (!m.tourney_id || !m.tourney_name) continue;
      map.set(m.tourney_id, m.tourney_name);
    }

    const tourneys = Array.from(map.entries()).map(([id, name]) => ({ id, name }))
      .filter(t => t.name !== "All");

    const priorityOrder: Record<string, number> = { "580": 0, "520": 1, "540": 2, "560": 3, "605": 4 };
    tourneys.sort((a, b) => {
      const pa = priorityOrder[a.id] ?? 1000;
      const pb = priorityOrder[b.id] ?? 1000;
      if (pa !== pb) return pa - pb;
      return a.name.localeCompare(b.name);
    });

    return tourneys;
  }, [allMatches]);

  const levelOptions = useMemo(
    () => Array.from(new Set(allMatches.map(m => CODE_TO_LABEL[m.tourney_level || "Unknown"] || "Unknown")))
          .filter(label => label !== "Unknown")
          .sort((a, b) => LEVEL_ORDER.indexOf(LABEL_TO_CODE[a]) - LEVEL_ORDER.indexOf(LABEL_TO_CODE[b])),
    [allMatches]
  );

  // 1️⃣ Tutte le surfaces (surfaceOptions)
  const surfaceOptions = useMemo(
    () =>
    Array.from(new Set(allMatches.map(m => m.surface || "Unknown")))
      .filter(s => s !== "Unknown")
      .sort((a, b) => SURFACE_ORDER.indexOf(a) - SURFACE_ORDER.indexOf(b)),
    [allMatches]
  );

  // 2️⃣ Elenco degli anni (seasonOptions) come number[]
  const seasonOptions = useMemo<number[]>(() => {
    const years = new Set<number>();
    for (const m of allMatches) {
      if (typeof m.year === "number" && !Number.isNaN(m.year)) {
        years.add(m.year);
      } else if (typeof m.year === "string") {
        const n = Number(m.year);
        if (!Number.isNaN(n)) years.add(n);
      }
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [allMatches]);


  // --- Rows aggregati (usando M/W/L dal backend) ---
  const rows = useMemo<Row[]>(() => {
    const map = new Map<string, Row>();
    let order = 0;

    for (const m of allMatches) {
      const y = m.year;
      const lvl = m.tourney_level || "Unknown";
      const surf = m.surface || "Unknown";
      const name = m.tourney_name || "Unknown";
      const key = `${y}__${m.tourney_id || name}`;

      const r = map.get(key) ?? {
        key,
        year: y,
        tourney_name: name,
        level: lvl,
        surface: surf,
        tourney_id: m.tourney_id || null,
        matches: 0,
        W: 0,
        L: 0,
        bestRound: "Unknown",
        champion: false,
        order: order++,
        tourney_date: m.tourney_date,
      };

      // Use helpers to support both formats
      r.matches += getM(m);
      r.W += getW(m);
      r.L += getL(m);

      const curR = m.round || "Unknown";
      if (roundWeight(curR) > roundWeight(r.bestRound)) r.bestRound = curR;
      if ((curR === "F" && getW(m) === 1) || curR === "W") {
        r.champion = true;
        r.bestRound = "W";
      }

      map.set(key, r);
    }

    return Array.from(map.values())
      .filter(r => r.level !== "D")
      .filter(r =>
        (selectedTourney === "" ? true : r.tourney_id === selectedTourney) &&
        (level === "All" ? true : r.level === LABEL_TO_CODE[level]) &&
        (surface === "All" ? true : r.surface === surface) &&
        (round === "All" ? true : round === "W" ? r.champion : roundWeight(r.bestRound) >= roundWeight(round)) &&
        (season === "All" ? true : r.year.toString() === season) &&
        (searchTerm.trim() === "" ? true : r.tourney_name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      .sort((a, b) => b.year - a.year || a.order - b.order);

  }, [allMatches, selectedTourney, level, surface, round, season, searchTerm]);

  const roundOptions = ROUND_ORDER;

  const getTourneyLink = (tourneyId?: string, year?: number) => {
    if (!tourneyId || !year) return "#";
    return `/tournaments/${encodeURIComponent(tourneyId)}/${year}`;
  };

  const filteredMatches = useMemo(() => {
    const tourneyIds = new Set(rows.map(r => r.tourney_id).filter(Boolean));
    return allMatches.filter(m => m.tourney_id && tourneyIds.has(m.tourney_id));
  }, [allMatches, rows]);

  // --- Sync URL ---
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tourney', selectedTourney);
    if (level !== "All") url.searchParams.set('level', LABEL_TO_CODE[level] || level); else url.searchParams.delete('level');
    if (surface !== "All") url.searchParams.set('surface', surface); else url.searchParams.delete('surface');
    if (round !== "All") url.searchParams.set('round', round); else url.searchParams.delete('round');
    if (season !== "All") url.searchParams.set('season', season); else url.searchParams.delete('season');
    if (searchTerm.trim()) url.searchParams.set('search', searchTerm); else url.searchParams.delete('search');
    url.searchParams.set('sub', subTab);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [selectedTourney, level, surface, round, season, searchTerm, subTab, router]);

  return (
    <div className="h-full w-full p-4 overflow-auto section" style={{ backgroundColor: "rgba(31,41,55,0.95)", backdropFilter: "blur(4px)" }}>
      <div className="mb-4">
        <TournamentFilters
          tournament={selectedTourney}
          setTournament={setSelectedTourney}
          tournamentOptions={[{id:"", name:"All"}, ...tournamentOptions]}
          level={level}
          setLevel={setLevel}
          levelOptions={levelOptions}
          surface={surface}
          setSurface={setSurface}
          surfaceOptions={surfaceOptions}
          round={round}
          setRound={setRound}
          roundOptions={roundOptions}
          season={season}
          setSeason={setSeason}
          seasonOptions={seasonOptions}
          search={searchTerm}
          setSearch={setSearchTerm}
          loading={loading}
          error={error}
        />
      </div>

      {/* Subtab buttons */}
      <div className="flex gap-4 mb-4 border-b border-gray-700 pb-2">
        <button
          onClick={() => setSubTab("events")}
          className={`px-3 py-1 rounded-md ${subTab === "events" ? "text-white border-b-2 border-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
        >Events</button>
        <button
          onClick={() => setSubTab("summary")}
          className={`px-3 py-1 rounded-md ${subTab === "summary" ? "text-white border-b-2 border-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
        >Summary</button>
      </div>

      {loading && <div className="text-gray-400">Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && rows.length === 0 && <div className="text-gray-400">No tournaments found.</div>}

      {!loading && !error && rows.length > 0 && (
        <>
          {subTab === "events" && (
            <TournamentGrid
              tourneys={rows.map(r => ({
                key: r.key,
                name: r.tourney_name,
                date: r.tourney_date,
                surface: r.surface,
                level: CODE_TO_LABEL[r.level] || r.level,
                tourney_id: r.tourney_id,
                matches: r.matches,
                wins: r.W,
                losses: r.L,
                bestRound: r.bestRound,
                champion: r.champion,
                year: r.year,
              }))}
              getTourneyLink={getTourneyLink}
            />
          )}

          {subTab === "summary" && <TournamentSummary filteredMatches={filteredMatches} />}
        </>
      )}
    </div>
  );
}
