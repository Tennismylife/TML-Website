"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MatchesFilterPanel from "./MatchesFilterPanel";
import MatchTable from "@/components/MatchTable";
import { Match, SortKey, SortDirection } from "@/types";

interface AllMatchesProps {
  playerId: string;
  initialMatches?: Match[];
  initialHeading?: string;
}

export default function AllMatches({ playerId, initialMatches, initialHeading }: AllMatchesProps) {
  const search = useSearchParams();
  const router = useRouter();

  // When SSR provides initialMatches (10 matches), keep allMatches empty until full data is fetched
  // This ensures filters are populated with all options, not just from initial 10 matches
  const [allMatches, setAllMatches] = useState<Match[]>(!initialMatches || initialMatches.length !== 10 ? (initialMatches ?? []) : []);
  const [matches, setMatches] = useState<Match[]>(initialMatches ?? []);
  const [loadingMatches, setLoadingMatches] = useState<boolean>(!initialMatches);
  const [mounted, setMounted] = useState<boolean>(!initialMatches);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");  // Changed from "asc" to "desc" to show latest matches first
  const [showAll, setShowAll] = useState<boolean>(false);
  const [loadingAllMatches, setLoadingAllMatches] = useState<boolean>(false);
  const [allMatchesFetched, setAllMatchesFetched] = useState<boolean>(false);
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
  const initialQueryKeysRef = useRef<Set<string>>(new Set());
  const initialKeysReadyRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const s = new Set<string>();
    try {
      const u = new URL(window.location.href);
      u.searchParams.forEach((_, k) => { if (k !== 'tab') s.add(k); });
      initialQueryKeysRef.current = s;
      initialKeysReadyRef.current = true;
      console.debug('[AllMatches] initial query keys (client):', Array.from(s));
      // If there was a queued payload during hydration, apply it now
      if (queuedPayloadRef.current) {
        console.debug('[AllMatches] applying queued payload on initialKeysReady', queuedPayloadRef.current);
        // call updateUrl with the queued payload (it will not re-queue because keysReady is true)
        updateUrl(queuedPayloadRef.current as Record<string,string>);
        queuedPayloadRef.current = null;
      }
    } catch (e) {
      // noop
    }
  }, []);

  // Track explicit deletions performed by the user to avoid them being re-added by automatic sync
  const explicitDeletedRef = useRef(new Set<string>());


  // DEV DEBUG: history wrapper removed to reduce noisy stack traces in test logs
  // (previously wrapped history.replaceState/pushState to print stacks during development)
  useMemo(() => {
    // intentionally no-op in browser to keep Playwright/CI logs clean
    if (typeof window === 'undefined') return;
  }, []);

  // Mount immediately (server render is already hidden with CSS)
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialMatches) return; // Skip fetch if we have SSR data
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/players/allmatches?id=${playerId}`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setAllMatches(data);
      } catch (err: any) {
        if (!controller.signal.aborted) console.error(err);
      }
    })();
    return () => controller.abort();
  }, [playerId, initialMatches]);

  // If we have limited initial data (SSR with only 10 matches), fetch ALL matches in background for W-L and filters
  useEffect(() => {
    if (!initialMatches || initialMatches.length !== DEFAULT_INITIAL_COUNT) return;
    if (allMatchesFetched) return;

    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/players/allmatches?id=${playerId}`, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setAllMatches(data);
        setAllMatchesFetched(true);
      } catch (err: any) {
        if (!controller.signal.aborted) console.error(err);
      }
    })();
    return () => controller.abort();
  }, [playerId, initialMatches, allMatchesFetched, initialFilters]);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams(sanitizedFilters).toString();
    return `/api/players/allmatches?id=${playerId}${params ? `&${params}` : ''}`;
  }, [playerId, sanitizedFilters]);

  useEffect(() => {
    if (initialMatches && Object.keys(sanitizedFilters).length === 0) return; // Skip filtered fetch if using SSR data without filters
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

  // When filters are cleared, ensure all matches are shown (and fetch full set if needed)
  useEffect(() => {
    if (Object.keys(sanitizedFilters).length !== 0) return;
    if (allMatches && allMatches.length > 0) {
      setMatches(allMatches);
      setShowAll(true);
      return;
    }

    if (!allMatchesFetched) {
      const controller = new AbortController();
      (async () => {
        try {
          const res = await fetch(`/api/players/allmatches?id=${playerId}`, { signal: controller.signal, cache: "no-store" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: Match[] = await res.json();
          setAllMatches(data);
          setMatches(data);
          setAllMatchesFetched(true);
          setShowAll(true);
        } catch (err: any) {
          if (!controller.signal.aborted) console.error(err);
        }
      })();
      return () => controller.abort();
    }
  }, [sanitizedFilters, allMatches, allMatchesFetched, playerId]);

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

      return sortDir === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [matches, sortKey, sortDir]);

  // compute W-L TOTAL (always from allMatches, shown initially)
  const { totalWins, totalLosses, totalWinPercentage } = useMemo(() => {
    let w = 0; let l = 0;
    (allMatches || []).forEach(m => {
      if (!m.status) return;
      if (String(m.winner_id) === String(playerId)) w++;
      else if (String(m.loser_id) === String(playerId)) l++;
    });
    const pct = (w + l > 0) ? ((w / (w + l)) * 100).toFixed(2) : "0.00";
    return { totalWins: w, totalLosses: l, totalWinPercentage: pct };
  }, [allMatches, playerId]);

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

  // show only last N matches by default
  const DEFAULT_INITIAL_COUNT = 10;

  const queuedPayloadRef = useRef<Record<string,string> | null>(null);

  const updateUrl = (filters: Record<string, string | number>) => {
    // If initial keys haven't been captured yet (race on refresh/hydration), queue the payload
    if (!initialKeysReadyRef.current) {
      queuedPayloadRef.current = Object.fromEntries(Object.entries(filters).map(([k,v]) => [k, String(v)]));
      console.debug('[AllMatches] initial keys not ready, queued updateUrl payload', queuedPayloadRef.current);
      return;
    }

    // If the current active tab is not 'matches', abstain from updating the URL to avoid clobbering navigations
    if (typeof window !== 'undefined') {
      const currentTab = window.location.pathname.split('/')[3];
      if (currentTab !== 'matches') {
        console.debug('[AllMatches] updateUrl aborted: not on matches tab (currentTab=', currentTab, ')');
        return;
      }
    }

    const url = new URL(window.location.href);
    // Do NOT force the pathname tab segment here; keep current pathname and only update search params

    Object.entries(filters).forEach(([key, value]) => {
      const currentHas = typeof window !== 'undefined' ? new URL(window.location.href).searchParams.has(key) : false;
      const explicitDeleted = explicitDeletedRef.current.has(key);
      const initialHas = initialKeysReadyRef.current ? initialQueryKeysRef.current.has(key) : false;
      console.debug('[AllMatches] updateUrl handling', { key, value, currentHas, initialHas, explicitDeleted, initialKeysReady: initialKeysReadyRef.current });

      if (!value || value === "All" || value === "") {
        // Respect explicit deletions performed by the user immediately
        if (explicitDeleted) {
          console.debug('[AllMatches] deleting key (explicit):', key);
          url.searchParams.delete(key);
          explicitDeletedRef.current.delete(key);
          initialQueryKeysRef.current.delete(key);
        } else {
          // Since initial keys are ready, we can safely decide whether to remove keys
          if (!currentHas && !initialHas) {
            console.debug('[AllMatches] deleting key (automatic):', key);
            url.searchParams.delete(key);
          } else {
            console.debug('[AllMatches] preserving key (automatic):', key);
          }
        }
      } else {
        url.searchParams.set(key, String(value));
      }
    });
    // Build a relative path and use history.replaceState to avoid a full page reload
    const searchString = url.searchParams.toString();
    const newPath = url.pathname + (searchString ? '?' + searchString : '');
    console.debug('[AllMatches] replace ->', newPath, '(using history.replaceState)');
    if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', newPath);
    } else {
      router.replace(newPath, { scroll: false });
    }
  };

  // explicit change handler: used when user explicitly clicks a filter (will force delete even if it existed initially)
  const updateUrlExplicit = (key: string, value: string | number) => {
    // If not on matches tab, ignore explicit updates to avoid clobbering navigation
    if (typeof window !== 'undefined') {
      const currentTab = window.location.pathname.split('/')[3];
      if (currentTab !== 'matches') {
        console.debug('[AllMatches] updateUrlExplicit aborted: not on matches tab (currentTab=', currentTab, ')');
        return;
      }
    }

    const searchParams = new URLSearchParams(window.location.search);

    if (!value || value === "All" || value === "") {
      console.debug('[AllMatches] explicit delete:', key);
      searchParams.delete(key);
      // If user explicitly removed a filter, mark it so automatic updates respect it
      explicitDeletedRef.current.add(key);
      // also remove it from the initial-key set so subsequent updateUrl calls can delete it as well.
      initialQueryKeysRef.current.delete(key);
    } else {
      console.debug('[AllMatches] explicit set:', key, String(value));
      searchParams.set(key, String(value));
      // ensure the key is considered present going forward
      initialQueryKeysRef.current.add(key);
      // clear explicit deletion flag if present
      explicitDeletedRef.current.delete(key);
    }
    // Keep local filter state in sync for immediate H1/title updates
    setCurrentFilters(prev => ({
      ...(prev || {}),
      [key]: !value || value === "All" || value === "" ? "All" : String(value)
    }));
    const newSearch = searchParams.toString();
    const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
    if (typeof window !== 'undefined' && window.history && typeof window.history.replaceState === 'function') {
      window.history.replaceState(null, '', newUrl);
    } else {
      router.replace(newUrl, { scroll: false });
    }
  };

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
      setLoadingAllMatches(true);
      try {
        const res = await fetch(`/api/players/allmatches?id=${playerId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setAllMatches(data);
        setMatches(data);
        setAllMatchesFetched(true);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoadingAllMatches(false);
      }
    } else if (allMatches.length > DEFAULT_INITIAL_COUNT) {
      setMatches(allMatches);
    }

    setShowAll(true);
  };

  return (
    <div className="w-full h-full">
      <div className="w-full bg-gray-900/80 rounded-md p-0 flex gap-0 min-h-0 overflow-visible">

        {/* Filtri: left panel always visible inside unified container */}
        <aside className="flex-shrink-0 overflow-visible p-0 pr-0 w-[160px]" style={{ marginTop: (wlHeight + tableHeaderHeight) ? (wlHeight + tableHeaderHeight + extraOffsetPx) + 'px' : undefined }}>
          <div className="flex flex-col items-stretch w-full pr-0">
            <div className="w-full pr-0">
              <MatchesFilterPanel
                playerId={playerId}
                matches={matches}
                allMatches={allMatches}
                displayedMatches={sortedMatches}
                updateUrl={updateUrl}
                onExplicitChange={updateUrlExplicit}
                onFiltersChange={setCurrentFilters}
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
              onHeaderHeightChange={setTableHeaderHeight}
            />
            {/* table may overflow the viewport so all rows remain visible */}
            {!showAll && (sortedMatches.length > DEFAULT_INITIAL_COUNT || (initialMatches && initialMatches.length === DEFAULT_INITIAL_COUNT)) && (
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