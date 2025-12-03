"use client";

import { useMemo, useState } from "react";
import MatchTable from "@/components/MatchTable";
import type { Match, SortKey, SortDirection } from "@/types";

function asNum(v: any) {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function EditionMatches({
  matches,
  playerId = "",
  defaultSortKey = "tourney_date",
  defaultSortDir = "asc",
}: {
  matches: Match[];
  playerId?: string;
  defaultSortKey?: SortKey;
  defaultSortDir?: SortDirection;
}) {
  const [sortKey, setSortKey] = useState<SortKey>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir);

  const sorted = useMemo(() => {
    if (!sortKey) return matches;
    const arr = [...matches];
    arr.sort((a: any, b: any) => {
      let av = a[sortKey as string];
      let bv = b[sortKey as string];

      // Date handling
      if (sortKey === "tourney_date") {
        const at = av ? new Date(av).getTime() : 0;
        const bt = bv ? new Date(bv).getTime() : 0;
        return at - bt;
      }

      // Numeric if possible
      const an = asNum(av);
      const bn = asNum(bv);
      if (an != null && bn != null) return an - bn;

      // Fallback to string compare
      const as = av == null ? "" : String(av);
      const bs = bv == null ? "" : String(bv);
      return as.localeCompare(bs);
    });
    if (sortDir === "desc") arr.reverse();
    return arr;
  }, [matches, sortKey, sortDir]);

  return (
    <MatchTable
      matches={sorted}
      sortKey={sortKey}
      sortDir={sortDir}
      setSortKey={setSortKey}
      setSortDir={setSortDir}
      playerId={playerId}
    />
  );
}