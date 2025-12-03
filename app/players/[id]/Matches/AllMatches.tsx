"use client";

import { useEffect, useState, useMemo } from "react";
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

  const initialFilters: Record<string, string> = useMemo(() => {
    const obj: Record<string, string> = {};
    search.forEach((value, key) => {
      if (key !== "tab") obj[key] = value;
    });
    return obj;
  }, [search]);

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
      if (!value || value === "All" || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    });
    router.replace(url.toString(), { scroll: false });
  };

  return (
    <div className="flex flex-row w-full h-full overflow-hidden">

      {/* Filtri */}
      <div className="w-[220px] h-full bg-gray-900 border-r border-gray-700 overflow-y-auto">
        <MatchesFilterPanel
          playerId={playerId}
          matches={matches}
          allMatches={allMatches}
          updateUrl={updateUrl}
        />
      </div>

      {/* Tabella */}
      <div className="flex-1 h-full min-h-0 bg-gray-800 overflow-hidden p-0">
        <MatchTable
          matches={sortedMatches}
          sortKey={sortKey}
          sortDir={sortDir}
          setSortKey={setSortKey}
          setSortDir={setSortDir}
          playerId={playerId}
        />
      </div>

    </div>
  );
}
