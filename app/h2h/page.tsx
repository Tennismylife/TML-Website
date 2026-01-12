"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import PlayerSearch from "./PlayerSearch";
import H2HHeader from "./H2HHeader";
import H2HBars from "./H2HBars";
import H2HMatches from "./H2HMatches";
import H2HPageFilters from "./H2HPageFilters";
import { Player, Match, SortKey, SortDirection } from "@/types";
import { useRouter, usePathname } from "next/navigation";
import { createH2HUrl } from "@/lib/utils";

export default function H2HPage() {
  const router = useRouter();
  const pathname = usePathname();
  const initAppliedRef = useRef(false);
  const redirectRef = useRef<string | null>(null);

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
  useEffect(() => setSearchParamsClient(new URLSearchParams(window.location.search)), []);

  // --- Auto-redirect to slug URL when players are selected ---
  useEffect(() => {
    if (!player1 || !player2 || !pathname) return;
    
    // Only redirect if we're on the base /h2h page (not on a slug URL)
    if (pathname !== '/h2h') return;
    
    // Don't redirect if we already have p1/p2 params (legacy redirect will handle it)
    if (searchParamsClient?.has('p1') || searchParamsClient?.has('p2')) return;
    
    const slugUrl = createH2HUrl(player1.atpname ?? '', player2.atpname ?? '');
    const currentSlug = `${player1.atpname ?? ''}-vs-${player2.atpname ?? ''}`;
    
    // Avoid redirect loop by checking if we've already redirected for this combination
    if (redirectRef.current === currentSlug) return;
    
    redirectRef.current = currentSlug;
    
    // Don't include default sort parameters in the slug URL
    const currentParams = new URLSearchParams(window.location.search);
    // Remove default sort parameters
    currentParams.delete('sort');
    currentParams.delete('sortDir');
    
    const queryString = currentParams.toString();
    const finalUrl = queryString ? `${slugUrl}?${queryString}` : slugUrl;
    
    router.replace(finalUrl);
  }, [player1, player2, pathname, searchParamsClient, router]);

  // --- Redirect to slug URL if p1 and p2 are present ---
  useEffect(() => {
    if (!searchParamsClient) return;

    const p1id = searchParamsClient.get("p1");
    const p2id = searchParamsClient.get("p2");

    if (p1id && p2id) {
      // Fetch both players to get their names for the slug
      const fetchPlayers = async () => {
        try {
          const [res1, res2] = await Promise.all([
            fetch(`/api/players?id=${encodeURIComponent(p1id)}`),
            fetch(`/api/players?id=${encodeURIComponent(p2id)}`)
          ]);

          if (res1.ok && res2.ok) {
            const player1: Player = await res1.json();
            const player2: Player = await res2.json();

            // Create slug URL and redirect
            const slugUrl = createH2HUrl(player1.atpname ?? '', player2.atpname ?? '');
            const currentParams = new URLSearchParams(window.location.search);
            // Remove p1, p2 and default sort parameters
            currentParams.delete('p1');
            currentParams.delete('p2');
            currentParams.delete('sort');
            currentParams.delete('sortDir');
            const queryString = currentParams.toString();
            const finalUrl = queryString ? `${slugUrl}?${queryString}` : slugUrl;

            router.replace(finalUrl);
          }
        } catch (error) {
          console.error('Error fetching players for redirect:', error);
        }
      };

      fetchPlayers();
    }
  }, [searchParamsClient, router]);

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

    setFilters((prev) => ({
      year: qYear ? (isNaN(Number(qYear)) ? "All" : Number(qYear)) : prev.year,
      level: qLevel ?? prev.level,
      surface: qSurface ?? prev.surface,
      round: qRound ?? prev.round,
      tourney_name: qTourney ?? prev.tourney_name,
    }));

    if (qSort && !(qSort === 'tourney_date' && qSortDir === 'desc')) setSortKey(qSort as SortKey);
    if (qSortDir && (qSortDir === "asc" || qSortDir === "desc") && !(qSort === 'tourney_date' && qSortDir === 'desc')) setSortDir(qSortDir as SortDirection);

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

  const wins1 = filteredMatches.filter((m) => m.winner_name === player1?.atpname).length;
  const wins2 = filteredMatches.filter((m) => m.winner_name === player2?.atpname).length;
  const total = wins1 + wins2;
  const perc1 = total > 0 ? (wins1 / total) * 100 : 0;
  const perc2 = total > 0 ? (wins2 / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Head-to-Head</h1>

      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
        <PlayerSearch label="Player 1" onSelect={setPlayer1} />
        <PlayerSearch label="Player 2" onSelect={setPlayer2} />
      </div>

      {player1 && player2 && (
        <>
          <H2HPageFilters
            allMatches={matches}
            loading={loading}
            error={null}
            filters={filters}
            setFilters={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
          />

          <H2HHeader
            wins1={wins1}
            wins2={wins2}
            perc1={perc1}
            perc2={perc2}
            player1={player1}
            player2={player2}
            matches={filteredMatches}
          />

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
