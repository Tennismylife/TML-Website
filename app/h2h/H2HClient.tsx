"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import PlayerSearch from "./PlayerSearch";
import H2HHeader from "./H2HHeader";
import H2HBars from "./H2HBars";
import H2HMatchFormatBars from "./H2HMatchFormatBars";
import H2HComebackBars from "./H2HComebackBars";
import H2HMatches from "./H2HMatches";
import H2HPageFilters from "./H2HPageFilters";
import { Player, Match, SortKey, SortDirection } from "@/types";
import { useRouter, usePathname } from "next/navigation";
import { createH2HUrl, createSlug } from "@/lib/utils";

export default function H2HClient({ 
  initialPlayer1 = null, 
  initialPlayer2 = null,
  initialMatches = [],
  initialOpponents = []
}: { 
  initialPlayer1?: Player | null; 
  initialPlayer2?: Player | null;
  initialMatches?: Match[];
  initialOpponents?: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const initAppliedRef = useRef(false);
  const redirectRef = useRef<string | null>(null);

  const [searchParamsClient, setSearchParamsClient] = useState<URLSearchParams | null>(null);
  const [player1, setPlayer1] = useState<Player | null>(initialPlayer1 ?? null);
  const [player2, setPlayer2] = useState<Player | null>(initialPlayer2 ?? null);
  const [matches, setMatches] = useState<Match[]>(initialMatches ?? []);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");
  const [availableOpponents, setAvailableOpponents] = useState<string[]>(initialOpponents ?? []);
  const [filters, setFilters] = useState({
    year: "All" as number | "All",
    level: "All",
    surface: "All",
    round: "All",
    tourney_name: "All",
    best_of: 'All' as string | 'All',
  });

  // --- Leggi URL params lato client ---
  useEffect(() => setSearchParamsClient(new URLSearchParams(window.location.search)), []);

  // --- Parse slugs from URL when initial players are not provided ---
  useEffect(() => {
    if (initialPlayer1 || initialPlayer2) return; // server already provided players

    const loadPlayersFromSlugs = async () => {
      try {
        if (!pathname) return;
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

        if (p1Data?.player) setPlayer1({ ...p1Data.player, atpname: p1Data.player.atpname ?? '' });
        if (p2Data?.player) setPlayer2({ ...p2Data.player, atpname: p2Data.player.atpname ?? '' });

      } catch (error) {
        console.error('Error parsing H2H URL:', error);
        router.replace('/h2h');
      }
    };

    loadPlayersFromSlugs();
  }, [pathname, router, initialPlayer1, initialPlayer2]);

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
    const qBestOf = searchParamsClient.get("bestOf") ?? searchParamsClient.get('best_of');
    const qSort = searchParamsClient.get("sort");
    const qSortDir = searchParamsClient.get("sortDir");

    setFilters((prev) => ({
      year: qYear ? (isNaN(Number(qYear)) ? "All" : Number(qYear)) : prev.year,
      level: qLevel ?? prev.level,
      surface: qSurface ?? prev.surface,
      round: qRound ?? prev.round,
      tourney_name: qTourney ?? prev.tourney_name,
      best_of: qBestOf ?? (prev as any).best_of ?? 'All',
    }));

    if (qSort && !(qSort === 'tourney_date' && qSortDir === 'desc')) setSortKey(qSort as SortKey);
    if (qSortDir && (qSortDir === "asc" || qSortDir === 'desc') && !(qSort === 'tourney_date' && qSortDir === 'desc')) setSortDir(qSortDir as SortDirection);

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
    // Skip fetch if we already have initial opponents from SSR
    if (initialOpponents && initialOpponents.length > 0) return;

    if (!player1) {
      setAvailableOpponents([]);
      return;
    }
    fetch(`/api/h2h/opponents?playerId=${player1.id}`)
      .then((res) => res.json())
      .then((data: { opponents: string[] }) => setAvailableOpponents(data.opponents))
      .catch(() => setAvailableOpponents([]));
  }, [player1, initialOpponents]);

  // --- Carica match H2H ---
  useEffect(() => {
    // Skip fetch if we already have initial matches from SSR
    if (initialMatches && initialMatches.length > 0) return;

    if (!player1 || !player2) {
      setMatches([]);
      return;
    }

    setLoading(true);
    const pageParams = new URLSearchParams(window.location.search);
    const qBestOf = pageParams.get('best_of') ?? pageParams.get('bestOf');
    const bestOfParam = qBestOf && qBestOf.toLowerCase() !== 'all' ? `&best_of=${encodeURIComponent(qBestOf)}` : '';

    fetch(`/api/h2h?player1=${player1.id}&player2=${player2.id}${bestOfParam}`)
      .then((res) => res.json())
      .then((data: Match[]) => setMatches(data))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false));
  }, [player1, player2, initialMatches]);

  // --- Filtra match ---
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      if (filters.year !== "All" && m.year !== filters.year) return false;
      if (filters.level !== "All" && (m.tourney_level ?? "Unknown") !== filters.level) return false;
      if (filters.surface !== "All" && (m.surface ?? "Unknown") !== filters.surface) return false;
      if (filters.round !== "All" && (m.round ?? "Unknown") !== filters.round) return false;
      if (filters.tourney_name !== "All" && m.tourney_name !== filters.tourney_name) return false;

      // Apply best_of filter (client-side)
      if (filters.best_of !== "All") {
        const bof = Number(filters.best_of);
        if (!Number.isNaN(bof)) {
          if (m.best_of !== bof) return false;
        } else {
          // support a possible 'Unknown' / 'null' option: keep only matches without best_of
          if (filters.best_of === 'Unknown' || filters.best_of === 'null') {
            if (m.best_of != null) return false;
          }
        }
      }

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
      {/* Page title is rendered server-side for SEO */}

      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
        <PlayerSearch label="Player 1" onSelect={setPlayer1} />
        <PlayerSearch label="Player 2" onSelect={setPlayer2} />
      </div>

      {player1 && player2 && (
        <>
          {matches.length > 0 && <H2HPageFilters
            allMatches={matches}
            loading={loading}
            error={null}
            filters={filters}
            setFilters={(partial) => {
              // update state and sync immediately to URL using the user's partial values when present
              setFilters((prev) => {
                const next = { ...prev, ...partial } as typeof prev;

                try {
                  const params = new URLSearchParams(window.location.search);

                  // Prefer reading visible control values from the DOM (more robust in tests and when UI updates are immediate)
                  const container = document.querySelector('[data-testid="h2h-filters"]');
                  const domYear = container?.querySelector('select[name="year"]') as HTMLSelectElement | null;
                  const domLevel = container?.querySelector('select[name="level"]') as HTMLSelectElement | null;
                  const domSurface = container?.querySelector('select[name="surface"]') as HTMLSelectElement | null;
                  const domRound = container?.querySelector('select[name="round"]') as HTMLSelectElement | null;
                  const domTourney = container?.querySelector('select[name="tourney"]') as HTMLSelectElement | null;
                  const domBestOf = container?.querySelector('select[name="best_of"]') as HTMLSelectElement | null;

                  const resolvedYear = domYear ? domYear.value : ((partial as any).year ?? next.year);
                  const resolvedLevel = domLevel ? domLevel.value : ((partial as any).level ?? next.level);
                  const resolvedSurface = domSurface ? domSurface.value : ((partial as any).surface ?? next.surface);
                  const resolvedRound = domRound ? domRound.value : ((partial as any).round ?? next.round);
                  const resolvedTourney = domTourney ? domTourney.value : ((partial as any).tourney_name ?? next.tourney_name);
                  const resolvedBestOf = domBestOf ? domBestOf.value : ((partial as any).best_of ?? next.best_of);

                  if (resolvedYear === 'All') params.delete('year'); else params.set('year', String(resolvedYear));
                  if (resolvedLevel === 'All') params.delete('level'); else params.set('level', String(resolvedLevel));
                  if (resolvedSurface === 'All') params.delete('surface'); else params.set('surface', String(resolvedSurface));
                  if (resolvedRound === 'All') params.delete('round'); else params.set('round', String(resolvedRound));
                  if (resolvedTourney === 'All') params.delete('tourney'); else params.set('tourney', String(resolvedTourney));
                  if (resolvedBestOf === 'All') params.delete('best_of'); else params.set('best_of', String(resolvedBestOf));

                  const qs = params.toString();
                  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;

                  // update Next router (mocked in tests) and browser history so URL is shareable immediately
                  try {
                    router.replace(url);
                  } catch (err) {
                    /* ignore */
                  }
                  try {
                    window.history.replaceState({}, '', url);
                  } catch (err) {
                    /* ignore */
                  }
                } catch (err) {
                  console.debug('[H2HClient] failed to sync filters to URL', err);
                }

                return next;
              });
            }}
          />}

          <H2HHeader
            wins1={wins1}
            wins2={wins2}
            perc1={perc1}
            perc2={perc2}
            player1={player1}
            player2={player2}
            matches={filteredMatches}
          />

          {matches.length > 0 && <div className="mt-8">
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
          </div>}

          {total > 0 && (
          <div className="flex flex-col gap-10 mt-10">
            {/* Wins + Match Format + Comebacks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Wins</h2>
                <H2HBars matches={filteredMatches} player1={player1} player2={player2} category="wins" />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Sets Format</h2>
                <H2HMatchFormatBars matches={filteredMatches} player1={player1} player2={player2} />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Deciding</h2>
                <H2HComebackBars matches={filteredMatches} player1={player1} player2={player2} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {(['sets', 'games'] as const).map((category) => (
                <div key={category} className="bg-gray-800 p-6 rounded-lg shadow-lg">
                  <h2 className="text-xl font-semibold mb-4 text-center">
                    {category[0].toUpperCase() + category.slice(1)}
                  </h2>
                  <H2HBars
                    matches={filteredMatches}
                    player1={player1}
                    player2={player2}
                    category={category}
                  />
                </div>
              ))}
            </div>
          </div>
          )}
        </>
      )}
    </div>
  );
}
