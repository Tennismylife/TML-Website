"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import PlayerSearch from "../PlayerSearch";
import H2HHeader from "../H2HHeader";
import H2HBars from "../H2HBars";
import H2HMatches from "../H2HMatches";
import H2HPageFilters from "../H2HPageFilters";
import { Player, Match, SortKey, SortDirection } from "@/types";
import { useRouter, usePathname } from "next/navigation";

export default function H2HPage() {
  const router = useRouter();
  const pathname = usePathname();
  const initAppliedRef = useRef(false);

  const [searchParamsClient, setSearchParamsClient] = useState<URLSearchParams | null>(null);
  const [player1, setPlayer1] = useState<Player | null>(null);
  const [player2, setPlayer2] = useState<Player | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
  });

  // --- Leggi URL params lato client ---
  useEffect(() => setSearchParamsClient(new URLSearchParams(window.location.search)), []);

  // --- Parse slugs from URL ---
  useEffect(() => {
    const loadPlayersFromSlugs = async () => {
      try {
        // Extract slugs from pathname: /h2h/player1-vs-player2 -> ['player1-vs-player2']
        const pathParts = pathname.split('/').filter(Boolean);
        if (pathParts.length < 2 || pathParts[0] !== 'h2h') return;
        
        const slugString = pathParts.slice(1).join('/');
        const slugMatch = slugString.match(/^(.+)-vs-(.+)$/);

        if (!slugMatch) {
          // Invalid slug format, redirect to main H2H page
          router.replace('/h2h');
          return;
        }

        const player1Slug = slugMatch[1];
        const player2Slug = slugMatch[2];

        // Find players by slug
        const [p1Data, p2Data] = await Promise.all([
          fetch(`/api/players/search?slug=${encodeURIComponent(player1Slug)}`).then(res => res.ok ? res.json() : null),
          fetch(`/api/players/search?slug=${encodeURIComponent(player2Slug)}`).then(res => res.ok ? res.json() : null)
        ]);

        if (p1Data?.player) setPlayer1(p1Data.player);
        if (p2Data?.player) setPlayer2(p2Data.player);

      } catch (error) {
        console.error('Error parsing H2H URL:', error);
        router.replace('/h2h');
      }
    };

    loadPlayersFromSlugs();
  }, [pathname, router]);

  useEffect(() => {
    if (!searchParamsClient) return;

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

    initAppliedRef.current = true;
  }, [searchParamsClient]);

  // --- Clean URL by removing default parameters ---
  useEffect(() => {
    if (!pathname.startsWith('/h2h/')) return;
    
    const currentParams = new URLSearchParams(window.location.search);
    let hasChanges = false;
    
    // Always remove default sort parameters
    if (currentParams.has('sort') || currentParams.has('sortDir')) {
      currentParams.delete('sort');
      currentParams.delete('sortDir');
      hasChanges = true;
    }
    
    if (hasChanges) {
      const newSearch = currentParams.toString();
      const newUrl = newSearch ? `${pathname}?${newSearch}` : pathname;
      
      console.log('Cleaning URL from:', window.location.href, 'to:', newUrl);
      router.replace(newUrl, { scroll: false });
    }
  }, [pathname, router, sortKey, sortDir]);

  // --- Avversari disponibili per Player 1 ---
  useEffect(() => {
    if (!player1) {
      return;
    }
    fetch(`/api/h2h/opponents?playerId=${player1.id}`)
      .then((res) => res.json())
      .then((data: { opponents: string[] }) => {
        // Opponents data available but not used in this simplified version
      })
      .catch(() => {
        // Handle error silently
      });
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
      .then((data: Match[]) => {
        setMatches(data);
        setLoading(false);
      })
      .catch(() => {
        setMatches([]);
        setLoading(false);
      });
  }, [player1, player2]);

  // --- Gestione selezione giocatori ---
  const handlePlayer1Select = (player: Player) => {
    setPlayer1(player);
  };

  const handlePlayer2Select = (player: Player) => {
    setPlayer2(player);
  };
  const sortedMatches = useMemo(() => {
    if (!matches.length) return [];

    return [...matches].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      if (sortKey === "tourney_date") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [matches, sortKey, sortDir]);

  // --- Filtri applicati ---
  const filteredMatches = useMemo(() => {
    return sortedMatches.filter((match) => {
      if (filters.year !== "All" && match.year !== filters.year) return false;
      if (filters.level !== "All" && match.tourney_level !== filters.level) return false;
      if (filters.surface !== "All" && match.surface !== filters.surface) return false;
      if (filters.round !== "All" && match.round !== filters.round) return false;
      if (filters.tourney_name !== "All" && match.tourney_name !== filters.tourney_name) return false;
      return true;
    });
  }, [sortedMatches, filters]);

  // --- Calcola statistiche ---
  const wins1 = filteredMatches.filter((m) => m.winner_name === player1?.atpname).length;
  const wins2 = filteredMatches.filter((m) => m.winner_name === player2?.atpname).length;
  const total = wins1 + wins2;
  const perc1 = total > 0 ? (wins1 / total) * 100 : 0;
  const perc2 = total > 0 ? (wins2 / total) * 100 : 0;

  // --- Aggiorna URL quando cambiano i giocatori o i filtri ---
  useEffect(() => {
    if (!player1 || !player2 || !initAppliedRef.current) return;

    const params = new URLSearchParams();
    if (filters.year !== "All") params.set("year", String(filters.year));
    if (filters.level !== "All") params.set("level", filters.level);
    if (filters.surface !== "All") params.set("surface", filters.surface);
    if (filters.round !== "All") params.set("round", filters.round);
    if (filters.tourney_name !== "All") params.set("tourney", filters.tourney_name);
    if (sortKey) params.set("sort", sortKey);
    if (sortDir) params.set("sortDir", sortDir);

    const baseUrl = `/h2h/${player1.slug}-vs-${player2.slug}`;
    const newUrl = baseUrl + (params.toString() ? `?${params.toString()}` : "");
    router.replace(newUrl, { scroll: false });
  }, [player1, player2, filters, sortKey, sortDir, router]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold mb-8 text-center">Head-to-Head</h1>

      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
        <PlayerSearch label="Player 1" onSelect={handlePlayer1Select} />
        <PlayerSearch label="Player 2" onSelect={handlePlayer2Select} />
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