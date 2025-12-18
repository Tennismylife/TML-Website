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
  // show only first 10 matches by default; toggle to show all
  const [showAll, setShowAll] = useState<boolean>(false);

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
    console.debug('[AllMatches] replace ->', url.toString());
    router.replace(url.toString(), { scroll: false });
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
    <div className="w-full flex flex-row h-full">

      {/* Filtri */}
      <aside className="w-[260px] h-full overflow-y-auto p-4">
        <MatchesFilterPanel
          playerId={playerId}
          matches={matches}
          allMatches={allMatches}
          displayedMatches={showAll ? sortedMatches : sortedMatches.slice(0, 10)}
          updateUrl={updateUrl}
          onExplicitChange={updateUrlExplicit}
        />
      </aside>

      {/* Tabella */}
      <div className="flex-1 h-full min-h-0 overflow-hidden p-4">
        <div className="w-full h-full">
          <MatchTable
            matches={showAll ? sortedMatches : sortedMatches.slice(0, 10)}
            sortKey={sortKey}
            sortDir={sortDir}
            setSortKey={setSortKey}
            setSortDir={setSortDir}
            playerId={playerId}
          />
          {!showAll && sortedMatches.length > 10 && (
            <div className="p-4 text-center">
              <button
                onClick={() => setShowAll(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Show all matches ({sortedMatches.length})
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}