"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import MatchesFilterPanel from "./MatchesFilterPanel";
import MatchTable from "@/components/MatchTable";
import { Match, SortKey, SortDirection } from "@/types";
import { getRoundIndex } from "@/lib/utils";

interface AllMatchesProps {
  playerId: string;
  playerSlug?: string | null;
  initialMatches?: Match[];
  initialHeading?: string;
  initialTotals?: { totalWins?: number; totalLosses?: number };
  initialFacets?: any;
}

export default function AllMatches({ playerId, playerSlug, initialMatches, initialHeading, initialTotals, initialFacets }: AllMatchesProps) {
  const search = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const surfaceTab = (() => {
    const seg = pathname?.split('/')?.[3]?.toLowerCase();
    return seg === 'clay' || seg === 'hard' || seg === 'grass' ? seg : 'matches';
  })();

  // When SSR provides initialMatches (10 matches), keep allMatches empty until full data is fetched
  // This ensures filters are populated with all options, not just from initial 10 matches
  // If SSR provided an initial slice (e.g., 10 matches), populate `allMatches` with it so
  // the filter panel can use available options immediately. The full career list will still
  // be fetched only when the user requests "Show All matches".
  const [allMatches, setAllMatches] = useState<Match[]>(initialMatches ?? []);
  const [matches, setMatches] = useState<Match[]>(initialMatches ?? []);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(!initialMatches);
  const [mounted, setMounted] = useState<boolean>(!initialMatches);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");  // Changed from "asc" to "desc" to show latest matches first
  const [showAll, setShowAll] = useState<boolean>(false);
  const [loadingAllMatches, setLoadingAllMatches] = useState<boolean>(false);
  const [allMatchesFetched, setAllMatchesFetched] = useState<boolean>(false);
  // Client-fetched facets (used to populate filters when server-side facets are not present)
  const [clientFacets, setClientFacets] = useState<any>(initialFacets ?? null);
  // Guard to avoid duplicate concurrent full-match fetches
  const fetchingAllRef = useRef<boolean>(false);
  // show all matches by default (allow table to overflow if needed)

  const initialFilters: Record<string, string> = useMemo(() => {
    const obj: Record<string, string> = {};
    if (!search) return obj;
    search.forEach((value, key) => {
      if (key !== "tab") obj[key] = value;
    });
    return obj;
  }, [search]);

  // Track current filters selected in the filter panel (updated via onFiltersChange callback)
  const [currentFilters, setCurrentFilters] = useState<Record<string,string>>(initialFilters);

  // Use currentFilters (from UI) when available, and drop empty/All values
  const sanitizedFilters = useMemo(() => {
    const source = currentFilters ?? initialFilters;
    return Object.fromEntries(
      Object.entries(source)
        .filter(([, v]) => v != null && String(v) !== '' && String(v) !== 'All')
        .map(([k, v]) => [k, String(v)])
    ) as Record<string,string>;
  }, [currentFilters, initialFilters]);

  // Compute heading from current filters (client-side) or fall back to SSR initialHeading

  const heading = useMemo(() => {
    const filters = currentFilters ?? initialFilters;
    const isAll = (v?: string) => !v || String(v).trim() === '' || String(v).toLowerCase() === 'all';
    const parts: string[] = [];
    const levelMap: Record<string, string> = {
      G: 'Grand Slams',
      M: 'Masters 1000',
      '500': 'ATP 500',
      '250': 'ATP 250',
      A: 'Other',
      F: 'Finals',
      D: 'Davis Cup',
      O: 'Olympics'
    };
    const roundMap: Record<string, string> = {
      R128: 'Round of 128',
      R64: 'Round of 64',
      R32: 'Round of 32',
      R16: 'Round of 16',
      QF: 'Quarterfinals',
      SF: 'Semifinals',
      F: 'Final',
      RR: 'Round Robin',
      '3rd/4th': '3rd/4th Place',
      BR: 'Bronze Match'
    };
    const rankLabel = (v?: string) => {
      if (!v) return '';
      if (v === 'Top1') return '#1';
      if (v === 'Top5') return 'Top 5';
      if (v === 'Top10') return 'Top 10';
      if (v === 'Top20') return 'Top 20';
      if (v === 'Top50') return 'Top 50';
      if (v === 'Top100') return 'Top 100';
      if (v === '11+') return '11+';
      if (v === '21+') return '21+';
      if (v === '51+') return '51+';
      if (v === '101+') return '101+';
      if (v === 'Higher') return 'Higher than opponent';
      if (v === 'Lower') return 'Lower than opponent';
      return v;
    };

    const year = filters.year;
    const level = filters.level;
    const surface = filters.surface;
    const round = filters.round;
    const firstSet = filters.firstSet;
    const result = filters.result;
    const tourney = filters.tourney;
    const vsRank = filters.vsRank;
    const asRank = filters.asRank;
    const vsAge = filters.vsAge;
    const vsHand = filters.vsHand;
    const vsBackhand = filters.vsBackhand;
    const vsEntry = filters.vsEntry;
    const asEntry = filters.asEntry;
    const set = filters.set;
    const score = filters.score;

    if (!isAll(year)) parts.push(`Year: ${year}`);
    if (!isAll(level)) parts.push(`Level: ${levelMap[level] ?? level}`);
    if (!isAll(tourney)) {
      let tn = String(tourney);
      const m = (allMatches || []).find(x => String(x.tourney_id) === String(tourney) && x.tourney_name);
      if (m && m.tourney_name) tn = m.tourney_name;
      parts.push(`Tournament: ${tn}`);
    }
    if (!isAll(surface)) parts.push(`Surface: ${surface}`);
    if (!isAll(round)) parts.push(`Round: ${roundMap[round] ?? round}`);
    if (!isAll(result)) parts.push(`Result: ${result}`);
    if (!isAll(set)) parts.push(`Sets: ${set}`);
    if (!isAll(firstSet)) parts.push(`First Set: ${firstSet}`);
    if (!isAll(score)) parts.push(`Score: ${score}`);
    if (!isAll(vsRank)) parts.push(`Opp Rank: ${rankLabel(vsRank)}`);
    if (!isAll(asRank)) parts.push(`Player Rank: ${rankLabel(asRank)}`);
    if (!isAll(vsAge)) parts.push(`Opp Age: ${vsAge}`);
    if (!isAll(vsHand)) parts.push(`Opp Hand: ${vsHand}`);
    if (!isAll(vsBackhand)) parts.push(`Opp Backhand: ${vsBackhand}`);
    if (!isAll(vsEntry)) parts.push(`Opp Entry: ${vsEntry}`);
    if (!isAll(asEntry)) parts.push(`Player Entry: ${asEntry}`);

    const activeKeys = Object.keys(filters).filter(k => !isAll(filters[k]));
    if (activeKeys.length === 1 && !isAll(year)) {
      return `Matches in ${year}`;
    }
    if (activeKeys.length === 1 && !isAll(tourney)) {
      const tname = parts.find(p => p.startsWith('Tournament: '))?.replace('Tournament: ', '') || String(tourney);
      return `Matches at ${tname}`;
    }
    if (activeKeys.length === 1 && !isAll(surface)) {
      return `Matches on ${surface}`;
    }

    if (parts.length === 0) return initialHeading ?? 'Matches';
    return `Matches — ${parts.join(' · ')}`;
  }, [currentFilters, initialFilters, allMatches, initialHeading]);

  // Keep document title synchronized with the H1 on client interactions
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const playerName = (document.querySelector('header h1')?.textContent || '').trim();
    if (playerName) document.title = `${playerName} – ${heading}`;
  }, [heading]);

  // Track which query keys were present when the page was opened (external links)
  // Supported filters that we seed from URL
  const SUPPORTED_FILTER_KEYS = [
    'year','tourney','level','surface','round','result','vsRank','vsAge','vsHand','vsBackhand','vsEntry','asRank','asEntry','set','firstSet','score'
  ];

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const u = new URL(window.location.href);
      const seeds: Record<string,string> = {};
      SUPPORTED_FILTER_KEYS.forEach(k => {
        const v = u.searchParams.get(k);
        if (v && String(v).toLowerCase() !== 'all') seeds[k] = v;
      });

      if (Object.keys(currentFilters || {}).length === 0 && Object.keys(seeds).length > 0) {
        setCurrentFilters(seeds);
      }
    } catch (e) {
      // noop
    }
  }, []);


  // DEV DEBUG: history wrapper removed to reduce noisy stack traces in test logs
  // (previously wrapped history.replaceState/pushState to print stacks during development)
  useMemo(() => {
    // intentionally no-op in browser to keep Playwright/CI logs clean
    if (typeof window === 'undefined') return;
  }, []);

  // Mount immediately and hide the SSR server table (it was visible before JS loaded)
  useEffect(() => {
    setMounted(true);
    // Hide the server-rendered table now that the interactive client component has taken over
    if (typeof document !== 'undefined') {
      const serverTable = document.getElementById('server-all-matches');
      if (serverTable) serverTable.style.display = 'none';
    }
  }, []);

  // NOTE: removed unconditional full fetch on mount to avoid downloading the entire match history
  // when the user lands on the page. We now request a limited set (DEFAULT_INITIAL_COUNT) when
  // there are no filters and no SSR-provided initial data, and only fetch the full set on demand
  // (Show All) or in the background for W-L and filter options.

  // show only last N matches by default
  const DEFAULT_INITIAL_COUNT = 10;

  // Build endpoint and include a `limit` param when we want only the latest N matches
  const endpoint = useMemo(() => {
    const params = new URLSearchParams(sanitizedFilters);
    // If there are no server-provided initial matches and no filters and we're not in showAll mode,
    // fetch only the latest DEFAULT_INITIAL_COUNT matches to avoid loading the whole history.
    if (!initialMatches && Object.keys(sanitizedFilters).length === 0 && !showAll) {
      params.set('limit', String(DEFAULT_INITIAL_COUNT));
    }
    const paramsString = params.toString();
    return `/api/players/allmatches?id=${playerId}${paramsString ? `&${paramsString}` : ''}`;
  }, [playerId, sanitizedFilters, initialMatches, showAll]);

  useEffect(() => {
    if (initialMatches) return; // Skip fetch if we have SSR data
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingMatches(true);
        
        const res = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setMatches(data);
      } catch (err: any) {
        if (!controller.signal.aborted) console.error(err);
      } finally {
        setLoadingMatches(false);
      }
    })();
    return () => controller.abort();
  }, [endpoint, initialMatches, sanitizedFilters]);

  // Helpful debug: surface the currently active endpoint and why

  // Debug when `matches` or `allMatches` change so we can see unexpected replacements
  useEffect(() => {
    
  }, [matches, showAll, initialMatches]);

  useEffect(() => {
    
  }, [allMatches, allMatchesFetched]);

  // If the page was SSR-rendered with an initial slice (initialMatches) but the
  // URL contains filters (e.g., ?year=2026 or ?surface=Hard), fetch the filtered matches on the
  // client and replace the displayed `matches` so external links work as expected.
  useEffect(() => {
    // RIMOSSO: if (!initialMatches) return; // only relevant when SSR provided a slice

    // Prefer the sanitizedFilters (UI state). If none present (race on mount),
    // sniff window.location.search directly to detect external links.
    let filtersToApply: Record<string,string> = Object.keys(sanitizedFilters).length ? sanitizedFilters : {};
    if (Object.keys(filtersToApply).length === 0) {
      try {
        if (typeof window !== 'undefined') {
          const u = new URL(window.location.href);
          u.searchParams.forEach((v, k) => { if (k !== 'tab') (filtersToApply as any)[k] = v; });
        }
      } catch (e) {
        // noop
      }
    }

    if (Object.keys(filtersToApply).length === 0) return; // nothing to apply

    const controller = new AbortController();
    let aborted = false;

    (async () => {
      try {
        setLoadingMatches(true);
        
        const params = new URLSearchParams(filtersToApply);
        const url = `/api/players/allmatches?id=${playerId}${params.toString() ? '&' + params.toString() : ''}`;
        const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        if (!aborted) {
          // Log quick diagnostics: number of matches and unique surfaces
          const surfaces = Array.from(new Set((data || []).flatMap(m => Array.isArray(m.surface) ? m.surface : [m.surface]).map(s => (s||'').trim()).filter(Boolean)));
          

          setMatches(data);
          // Also seed `allMatches` with the filtered payload so filters populate when
          // arriving via external link (e.g. ?year=2025). This does not mark the
          // full set as fetched — it's just a seed to populate filter options.
          setAllMatches(data);

          // After seeding from a filtered initial payload, fetch lightweight facets
          // in background so filter panels can show all possible options without downloading
          // the player's full match history.
          if (!allMatchesFetched && !fetchingAllRef.current) {
            fetchingAllRef.current = true;
            (async () => {
              try {
                
                const resFacets = await fetch(`/api/players/match-facets?id=${playerId}`, { cache: 'force-cache' });
                if (resFacets.ok) {
                  const j = await resFacets.json();
                  setClientFacets(j);
                }
              } catch (err: any) {
                console.error('[AllMatches] background facets fetch failed', err);
              } finally {
                fetchingAllRef.current = false;
              }
            })();
          }
        }
      } catch (err: any) {
        if (!controller.signal.aborted) console.error(err);
      } finally {
        if (!aborted) setLoadingMatches(false);
      }
    })();

    return () => { aborted = true; controller.abort(); };

  }, [initialMatches, sanitizedFilters, playerId]);

  // RIMOSSO: auto-fetch di tutti i match in background. Ora il caricamento completo avviene solo su richiesta esplicita (Show All Matches).

  // NOTE: endpoint and initial fetch logic have been moved earlier to include optional `limit` support.
  // The active `endpoint` const and its useEffect live higher in this file to allow a `limit` param
  // to be set when requesting only the initial slice of matches.

  // When filters are cleared, we want two behaviors:
  // 1) If the user explicitly asked to Show All (showAll === true), ensure the full set is shown (fetch if needed).
  // 2) Otherwise, keep the visible matches limited (do not replace them) but fetch the full set in background
  //    so W-L totals and filter options can be computed without changing the user's view.
  useEffect(() => {
    if (Object.keys(sanitizedFilters).length !== 0) return;

    // If user requested Show All, ensure we display the full set
    if (showAll) {
      // If we already have the full list in memory, just restore it without a network roundtrip
      if (allMatchesFetched && allMatches.length > 0) {
        setMatches(allMatches);
        return;
      }
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(`/api/players/allmatches?id=${playerId}`, { signal: controller.signal, cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: Match[] = await res.json();
          setAllMatches(data);
          setMatches(data);
          setAllMatchesFetched(true);
        } catch (err: any) {
          if (!controller.signal.aborted) console.error(err);
        }
      })();
      return () => controller.abort();
    }

    // If Show All is NOT active and filters are cleared, reset to preview slice
    if (!showAll) {
      if (initialMatches && initialMatches.length > 0) {
        setMatches(initialMatches);
        return;
      }

      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(`/api/players/allmatches?id=${playerId}&limit=10`, { signal: controller.signal, cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: Match[] = await res.json();
          setMatches(data);
        } catch (err: any) {
          if (!controller.signal.aborted) console.error(err);
        }
      })();
      return () => controller.abort();
    }
  }, [sanitizedFilters, allMatches, allMatchesFetched, playerId, showAll]);

  // Intentionally do NOT perform a background fetch of the full matches list on mount.
  // Fetching the full history is only performed when the user explicitly clicks "Show All".
  // If filter options are needed, we fetch lightweight facets on demand (client or SSR).

  const sortedMatches = useMemo(() => {
    if (sortKey === null) return [...matches];
    return [...matches].sort((a, b) => {
      const valA = a[sortKey as keyof typeof a];
      const valB = b[sortKey as keyof typeof b];

      if (valA == null) return 1;
      if (valB == null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDir === "asc" ? valA - valB : valB - valA;
      }

      const cmp = sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));

      // When sorting by date and two matches share the same date (same tournament week),
      // sort by round descending so the Final appears before SF before QF.
      if (cmp === 0 && sortKey === "tourney_date") {
        return getRoundIndex(b.round, b.tourney_level) - getRoundIndex(a.round, a.tourney_level);
      }

      return cmp;
    });
  }, [matches, sortKey, sortDir]);

  // compute W-L TOTAL (prefer full career totals from allMatches; otherwise fall back to SSR-provided initialTotals or derive from visible matches)
  const { totalWins, totalLosses, totalWinPercentage } = useMemo(() => {
    // If we have the full set in-memory, compute from it
    if (allMatches && allMatches.length > 0) {
      let w = 0; let l = 0;
      (allMatches || []).forEach(m => {
        if (!m.status) return;
        if (String(m.winner_id) === String(playerId)) w++;
        else if (String(m.loser_id) === String(playerId)) l++;
      });
      const pct = (w + l > 0) ? ((w / (w + l)) * 100).toFixed(2) : "0.00";
      return { totalWins: w, totalLosses: l, totalWinPercentage: pct };
    }

    // Fallback: if server provided initial totals, use them
    if (initialTotals && (initialTotals.totalWins !== undefined || initialTotals.totalLosses !== undefined)) {
      const w = Number((initialTotals.totalWins) ?? 0);
      const l = Number((initialTotals.totalLosses) ?? 0);
      const pct = (w + l > 0) ? ((w / (w + l)) * 100).toFixed(2) : "0.00";
      return { totalWins: w, totalLosses: l, totalWinPercentage: pct };
    }

    // last fallback: compute from currently visible matches (may be limited)
    let w = 0; let l = 0;
    (matches || []).forEach(m => {
      if (!m.status) return;
      if (String(m.winner_id) === String(playerId)) w++;
      else if (String(m.loser_id) === String(playerId)) l++;
    });
    const pct = (w + l > 0) ? ((w / (w + l)) * 100).toFixed(2) : "0.00";
    return { totalWins: w, totalLosses: l, totalWinPercentage: pct };
  }, [allMatches, playerId, matches]);

  // compute W-L for FILTERED matches (updates dynamically with filters)
  const { wins, losses, winPercentage } = useMemo(() => {
    let w = 0; let l = 0;
    (matches || []).forEach(m => {
      if (!m.status) return;
      if (String(m.winner_id) === String(playerId)) w++;
      else if (String(m.loser_id) === String(playerId)) l++;
    });
    const pct = (w + l > 0) ? ((w / (w + l)) * 100).toFixed(2) : "0.00";
    return { wins: w, losses: l, winPercentage: pct };
  }, [matches, playerId]);

  // Check if filters are applied (URL has filter params)
  const hasFilters = useMemo(() => {
    return Object.keys(sanitizedFilters).length > 0;
  }, [sanitizedFilters]);

  // Note: we intentionally allow the table to render all rows and overflow the container

  // Measure W-L block and table header to align filters just below the table header
  const wlRef = useRef<HTMLDivElement | null>(null);
  const [wlHeight, setWlHeight] = useState<number>(0);
  useEffect(() => {
    const el = wlRef.current;
    if (!el) return;
    const report = () => setWlHeight(el.getBoundingClientRect().height);
    report();
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [wins, losses, winPercentage]);

  const [tableHeaderHeight, setTableHeaderHeight] = useState<number>(0);
  // extra offset (pixels) to push filters further down; tweak this value if you want larger gap
  const extraOffsetPx = 24;

  // Filters are client-only. We intentionally do not mutate the browser URL for filter changes
  // so the site does not create a large number of indexable query-string URLs.
  // The filter panel still seeds initial state from any incoming search params.

  // Handler to load all matches when user clicks "Show All"
  const handleShowAllClick = async () => {
    const hasFilterParams = Object.keys(sanitizedFilters).length > 0;

    // If filters are active, fetch only the filtered matches and DO NOT overwrite allMatches
    if (hasFilterParams) {
      setLoadingAllMatches(true);
      try {
        const filterParams = new URLSearchParams(sanitizedFilters);
        const url = `/api/players/allmatches?id=${playerId}${filterParams.toString() ? '&' + filterParams.toString() : ''}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setMatches(data);

        // Background-fetch the full unfiltered matches list so filter panels can be populated
        if (!allMatchesFetched && !fetchingAllRef.current) {
          fetchingAllRef.current = true;
          (async () => {
            try {
              
              const resFull = await fetch(`/api/players/allmatches?id=${playerId}`, { cache: 'no-store' });
              if (!resFull.ok) throw new Error(`HTTP ${resFull.status}`);
              const fullData: Match[] = await resFull.json();
              setAllMatches(fullData);
              setAllMatchesFetched(true);
            } catch (err: any) {
              console.error('[AllMatches] background full-fetch after Show All failed', err);
            } finally {
              fetchingAllRef.current = false;
            }
          })();
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingAllMatches(false);
      }
      setShowAll(true);
      return;
    }

    // No filters: show ALL matches (unfiltered)
    if (!allMatchesFetched && allMatches.length <= DEFAULT_INITIAL_COUNT) {
      if (!fetchingAllRef.current) {
        fetchingAllRef.current = true;
        setLoadingAllMatches(true);
        try {
          // Fetch the full unfiltered matches list (user explicitly requested Show All)
          const res = await fetch(`/api/players/allmatches?id=${playerId}`, { cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: Match[] = await res.json();
          setAllMatches(data);
          setMatches(data);
          // Mark fetched: full list is in memory
          setAllMatchesFetched(true);
        } catch (err: any) {
          console.error('[AllMatches] full fetch after Show All failed', err);
        } finally {
          setLoadingAllMatches(false);
          fetchingAllRef.current = false;
        }
      }
    } else if (allMatches.length > DEFAULT_INITIAL_COUNT) {
      setMatches(allMatches);
    }

    setShowAll(true);
  };

  return (
    <div className="w-full h-full">
      <div className="w-full bg-gray-900/80 rounded-md p-0 flex gap-0 min-h-0 overflow-x-hidden overflow-y-visible">

        {/* Filtri: left panel always visible inside unified container */}
        <aside className="flex-shrink-0 overflow-visible p-0 pr-0 w-[160px]" style={{ marginTop: (wlHeight + tableHeaderHeight) ? (wlHeight + tableHeaderHeight + extraOffsetPx) + 'px' : undefined }}>
          <div className="flex flex-col items-stretch w-full pr-0">
            <div className="w-full pr-0">
              <MatchesFilterPanel
                playerId={playerId}
                matches={matches}
                allMatches={allMatches}
                allMatchesFetched={allMatchesFetched}
                displayedMatches={sortedMatches}
                onFiltersChange={setCurrentFilters}
                serverFacets={initialFacets ?? clientFacets}
              />
            </div>
          </div>
        </aside>

        {/* Tabella inside the same unified container (no internal scroll) */}
        <div className="flex-1 min-w-0 p-0">
          <div className="w-full">
            <div ref={wlRef} className="w-full text-center mb-2">
              <div className="font-semibold text-xl sm:text-2xl leading-none">
                W-L: {hasFilters ? `${wins}-${losses} (${winPercentage}%)` : `${totalWins}-${totalLosses} (${totalWinPercentage}%)`}
              </div>
              {/* Heading: prefer client-side dynamic heading (updates immediately), fall back to SSR-provided heading */}
              {(heading) && (
                <div className="mt-2">
                  <h1 className="text-base sm:text-lg font-semibold text-gray-200" suppressHydrationWarning>
                    {heading}
                  </h1>
                </div>
              )}
            </div>
            <MatchTable
              matches={showAll ? sortedMatches : sortedMatches.slice(0, DEFAULT_INITIAL_COUNT)}
              loading={loadingMatches}
              sortKey={sortKey}
              sortDir={sortDir}
              setSortKey={(key) => setSortKey(key)}
              setSortDir={setSortDir}
              playerId={playerId}
              playerSlug={playerSlug}
              onHeaderHeightChange={setTableHeaderHeight}
              currentTab={surfaceTab}
            />
            {/* table may overflow the viewport so all rows remain visible */}
            {/* Show the button when: page not yet in "show all" mode AND either
                - we have at least DEFAULT_INITIAL_COUNT visible rows (likely more exist), OR
                - SSR provided exactly a preview slice of DEFAULT_INITIAL_COUNT, OR
                - filters are active (there may be more pages of filtered results not yet loaded) */}
            {!showAll && (sortedMatches.length >= DEFAULT_INITIAL_COUNT || (initialMatches && initialMatches.length === DEFAULT_INITIAL_COUNT) || Object.keys(sanitizedFilters).length > 0) && (
              <div className="w-full flex justify-center mt-2">
                <button
                  className="px-3 py-1 bg-gray-800 border border-gray-700 text-sm text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={handleShowAllClick}
                  disabled={loadingAllMatches}
                >
                  {loadingAllMatches ? 'Loading...' : 'Show All matches'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
