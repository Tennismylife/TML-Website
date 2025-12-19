"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import MatchesFilterPanel from "./MatchesFilterPanel";
import MatchTable from "@/components/MatchTable";
import { Match, SortKey, SortDirection } from "@/types";

interface AllMatchesProps {
  playerId: string;
}

export default function AllMatches({ playerId }: AllMatchesProps) {
  const search = useSearchParams();
  const router = useRouter();

  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("tourney_date");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  // show all matches by default (allow table to overflow if needed)

  const initialFilters: Record<string, string> = useMemo(() => {
    const obj: Record<string, string> = {};
    search.forEach((value, key) => {
      if (key !== "tab") obj[key] = value;
    });
    return obj;
  }, [search]);

  // Track which query keys were present when the page was opened (external links)
  const initialQueryKeysRef = useMemo(() => {
    const s = new Set<string>();
    try {
      const u = new URL(window.location.href);
      u.searchParams.forEach((_, k) => { if (k !== 'tab') s.add(k); });
      console.debug('[AllMatches] initial query keys:', Array.from(s));
    } catch (e) {
      // noop in SSR or environments without window
    }
    return s;
  }, []);

  // Track explicit deletions performed by the user to avoid them being re-added by automatic sync
  const explicitDeletedRef = useRef(new Set<string>());


  // DEV DEBUG: wrap history.replaceState/pushState to log who calls them (stack trace)
  useMemo(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
    const origReplace = window.history.replaceState;
    const origPush = window.history.pushState;
    window.history.replaceState = function (...args: any[]) {
      console.debug('[AllMatches] history.replaceState called', { args });
      console.debug(new Error('replaceState stack').stack);
      return origReplace.apply(this, args as any);
    } as any;
    window.history.pushState = function (...args: any[]) {
      console.debug('[AllMatches] history.pushState called', { args });
      console.debug(new Error('pushState stack').stack);
      return origPush.apply(this, args as any);
    } as any;
    return () => {
      window.history.replaceState = origReplace;
      window.history.pushState = origPush;
    };
  }, []);

  useEffect(() => {
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
  }, [playerId]);

  const endpoint = useMemo(
    () => `/api/players/allmatches?id=${playerId}&${new URLSearchParams(initialFilters)}`,
    [playerId, initialFilters]
  );

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: Match[] = await res.json();
        setMatches(data);
      } catch (err: any) {
        if (!controller.signal.aborted) console.error(err);
      }
    })();
    return () => controller.abort();
  }, [endpoint]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];

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

  // compute W-L for display above the table
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
  const [showAll, setShowAll] = useState<boolean>(false);

  const updateUrl = (filters: Record<string, string | number>) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "matches");
    Object.entries(filters).forEach(([key, value]) => {
      const currentHas = new URL(window.location.href).searchParams.has(key);
      const explicitDeleted = explicitDeletedRef.current.has(key);
      console.debug('[AllMatches] updateUrl handling', { key, value, currentHas, initialHas: initialQueryKeysRef.has(key), explicitDeleted });
      if (!value || value === "All" || value === "") {
        // Respect explicit deletions performed by the user immediately
        if (explicitDeleted) {
          console.debug('[AllMatches] deleting key (explicit):', key);
          url.searchParams.delete(key);
          explicitDeletedRef.current.delete(key);
          initialQueryKeysRef.delete(key);
        } else {
          // If the key exists in the current URL (e.g. opened via external link), do not remove it automatically.
          // Use explicit user changes (updateUrlExplicit) to remove keys.
          if (!currentHas && !initialQueryKeysRef.has(key)) {
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
    // Use a relative path (pathname + search) to avoid full-page reloads
    const pathname = window.location.pathname;
    const searchString = url.searchParams.toString();
    const newPath = pathname + (searchString ? '?' + searchString : '');
    console.debug('[AllMatches] replace ->', newPath);
    router.replace(newPath, { scroll: false });
  };

  // explicit change handler: used when user explicitly clicks a filter (will force delete even if it existed initially)
  const updateUrlExplicit = (key: string, value: string | number) => {
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", "matches");
    if (!value || value === "All" || value === "") {
      console.debug('[AllMatches] explicit delete:', key);
      searchParams.delete(key);
      // If user explicitly removed a filter, mark it so automatic updates respect it
      explicitDeletedRef.current.add(key);
      // also remove it from the initial-key set so subsequent updateUrl calls can delete it as well.
      initialQueryKeysRef.delete(key);
    } else {
      console.debug('[AllMatches] explicit set:', key, String(value));
      searchParams.set(key, String(value));
      // ensure the key is considered present going forward
      initialQueryKeysRef.add(key);
      // clear explicit deletion flag if present
      explicitDeletedRef.current.delete(key);
    }
    const newSearch = searchParams.toString();
    const newUrl = pathname + (newSearch ? '?' + newSearch : '');
    router.replace(newUrl, { scroll: false });
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
              />
            </div>
          </div>
        </aside>

        {/* Tabella inside the same unified container (no internal scroll) */}
        <div className="flex-1 min-w-0 p-0">
          <div className="w-full">
            <div ref={wlRef} className="w-full text-center mb-2">
              <div className="font-semibold text-xl sm:text-2xl leading-none">W-L: {wins}-{losses} ({winPercentage}%)</div>
            </div>
            <MatchTable
              matches={showAll ? sortedMatches : sortedMatches.slice(0, DEFAULT_INITIAL_COUNT)}
              sortKey={sortKey}
              sortDir={sortDir}
              setSortKey={setSortKey}
              setSortDir={setSortDir}
              playerId={playerId}
              onHeaderHeightChange={setTableHeaderHeight}
            />
            {/* table may overflow the viewport so all rows remain visible */}
            {sortedMatches.length > DEFAULT_INITIAL_COUNT && (
              <div className="w-full flex justify-center mt-2">
                <button
                  className="px-3 py-1 bg-gray-800 border border-gray-700 text-sm text-white rounded hover:bg-gray-700"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? `Show latest ${DEFAULT_INITIAL_COUNT}` : `Show All matches`}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}