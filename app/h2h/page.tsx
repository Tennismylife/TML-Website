"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import PlayerSearch from "./PlayerSearch";
import H2HHeader from "./H2HHeader";
import H2HBars from "./H2HBars";
import H2HMatches from "./H2HMatches";
import H2HPageFilters from "./H2HPageFilters";
import { Player, Match, SortKey, SortDirection } from "@/types";
import { useRouter, usePathname } from "next/navigation";

export default function H2HPage() {
  const router = useRouter();
  const pathname = usePathname();
  const initAppliedRef = useRef(false);

  // Stato per URL params lato client
  const [searchParamsClient, setSearchParamsClient] = useState<URLSearchParams | null>(null);

  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [availableOpponents, setAvailableOpponents] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
  });

  // --- Leggi URL params lato client ---
  useEffect(() => {
    setSearchParamsClient(new URLSearchParams(window.location.search));
  }, []);

  useEffect(() => {
    if (!searchParamsClient) return;

    const p1id = searchParamsClient.get("p1");
    const p2id = searchParamsClient.get("p2");

    const qYear = searchParamsClient.get("year");
    const qLevel = searchParamsClient.get("level");
    const qSurface = searchParamsClient.get("surface");
    const qRound = searchParamsClient.get("round");
    const qTourney = searchParamsClient.get("tourney");

    const qSort = searchParamsClient.get("sort");
    const qSortDir = searchParamsClient.get("sortDir");

    // --- Imposta filtri ---
    setFilters((prev) => ({
      year: qYear ? (isNaN(Number(qYear)) ? "All" : Number(qYear)) : prev.year,
      level: qLevel ?? prev.level,
      surface: qSurface ?? prev.surface,
      round: qRound ?? prev.round,
      tourney_name: qTourney ?? prev.tourney_name,
    }));

    // --- Imposta sort ---
    if (qSort) setSortKey(qSort as SortKey);
    if (qSortDir && (qSortDir === "asc" || qSortDir === "desc")) setSortDir(qSortDir as SortDirection);

    // --- Fetch player dai rispettivi ID ---
    const fetchPlayerById = async (id?: string | null) => {
      if (!id) return null;
      try {
        const res = await fetch(`/api/players?id=${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        const data: Player = await res.json();
        return data;
      } catch {
        return null;
      }
    };

    (async () => {
      if (p1id) {
        const p = await fetchPlayerById(p1id);
        if (p) setPlayer1(p);
      }
      if (p2id) {
        const p = await fetchPlayerById(p2id);
        if (p) setPlayer2(p);
      }
    })();

    initAppliedRef.current = true;
  }, [searchParamsClient]);

  // --- Avversari disponibili per Player 1 ---
  useEffect(() => {
    if (!player1) {
      setAvailableOpponents([]);
      return;
    }
    fetch(`/api/h2h/opponents?playerId=${player1.id}`)
      .then((res) => res.json())
      .then((data: { opponents: string[] }) => setAvailableOpponents(data.opponents))
      .catch(() => setAvailableOpponents([]));
  }, [player1]);

  // --- Carica match H2H ---
  useEffect(() => {
    if (!player1 || !player2) {
      setMatches([]);
      return;
    }

    setLoading(true);
    fetch(`/api/h2h?player1=${player1.id}&player2=${player2.id}`)
      .then((res) => res.json())
      .then((data: Match[]) => setMatches(data))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [player1, player2]);

  // --- Aggiorna URL quando cambiano player, filtri o sort ---
  useEffect(() => {
    if (!initAppliedRef.current) return;
    if (!pathname) return;

    const params = new URLSearchParams();

    if (player1) params.set("p1", String(player1.id));
    if (player2) params.set("p2", String(player2.id));

    if (filters.year !== "All") params.set("year", String(filters.year));
    if (filters.level !== "All") params.set("level", filters.level);
    if (filters.surface !== "All") params.set("surface", filters.surface);
    if (filters.round !== "All") params.set("round", filters.round);
    if (filters.tourney_name !== "All") params.set("tourney", filters.tourney_name);

    if (sortKey) params.set("sort", sortKey);
    if (sortDir) params.set("sortDir", sortDir);

    const newUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [player1, player2, filters, sortKey, sortDir, router, pathname]);

  // --- Filtra match ---
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filters.year !== "All" && m.year !== filters.year) return false;
      if (filters.level !== "All" && (m.tourney_level ?? "Unknown") !== filters.level) return false;
      if (filters.surface !== "All" && (m.surface ?? "Unknown") !== filters.surface) return false;
      if (filters.round !== "All" && (m.round ?? "Unknown") !== filters.round) return false;
      if (filters.tourney_name !== "All" && m.tourney_name !== filters.tourney_name) return false;
      return true;
    });
  }, [matches, filters]);

  // --- Calcolo H2H ---
  const wins1 = filteredMatches.filter((m) => m.winner_name === player1?.atpname).length;
  const wins2 = filteredMatches.filter((m) => m.winner_name === player2?.atpname).length;
  const total = wins1 + wins2;
  const perc1 = total > 0 ? (wins1 / total) * 100 : 0;
  const perc2 = total > 0 ? (wins2 / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-8 text-center">Head-to-Head</h1>

      {/* SEARCHERS */}
      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
        <PlayerSearch label="Player 1" onSelect={(player) => setPlayer1(player)} />
        <PlayerSearch label="Player 2" onSelect={(player) => setPlayer2(player)} />
      </div>

      {player1 && player2 && (
        <>
          {/* FILTRI */}
          <H2HPageFilters
            allMatches={matches}
            loading={loading}
            error={null}
            filters={filters}
            setFilters={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          />

          {/* HEADER */}
          <H2HHeader
            wins1={wins1}
            wins2={wins2}
            perc1={perc1}
            perc2={perc2}
            player1={player1}
            player2={player2}
            matches={filteredMatches}
          />

          {/* MATCHES TABLE */}
          <div className="mt-8">
            {loading ? (
              <p className="text-center text-gray-400">Loading matches...</p>
            ) : (
              <H2HMatches
                matches={filteredMatches}
                sortKey={sortKey}
                sortDir={sortDir}
                setSortKey={setSortKey}
                setSortDir={setSortDir}
                playerId={player1.id}
              />
            )}
          </div>

          {/* H2H BARS */}
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {["wins", "sets", "games"].map((category) => (
              <div key={category} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">
                  {category[0].toUpperCase() + category.slice(1)}
                </h2>
                <H2HBars
                  matches={filteredMatches}
                  player1={player1}
                  player2={player2}
                  category={category as "wins" | "sets" | "games"}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
