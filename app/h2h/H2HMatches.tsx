"use client";

import Link from "next/link";
import { Match, SortKey, SortDirection } from "@/types";
import { getFlagFromIOC } from "@/lib/utils";
import { useEffect, useRef, useState, useMemo } from "react";

interface H2HMatchesProps {
  matches: Match[];
  sortKey: SortKey;
  sortDir: SortDirection;
  setSortKey: (key: SortKey) => void;
  setSortDir: (dir: SortDirection) => void;
  playerId: string;
}

// Helper per seed / entry
function renderNameWithSeedEntry(
  name: string,
  seed?: number | null,
  entry?: string | null
) {
  const hasSeed = typeof seed === "number" && !Number.isNaN(seed);
  return (
    <>
      {name}
      {hasSeed ? (
        <span className="text-[0.65rem] text-gray-400"> ({seed})</span>
      ) : entry ? (
        <span className="text-[0.65rem] text-gray-400"> ({entry})</span>
      ) : null}
    </>
  );
}

// Percentuali e ratio
function pct(num?: number | null, den?: number | null, digits = 1) {
  if (!num || !den || den <= 0) return "-";
  const val = (num / den) * 100;
  return Number.isFinite(val) ? `${val.toFixed(digits)}%` : "-";
}

function ratio(num?: number | null, den?: number | null) {
  return `${num ?? 0}/${den ?? 0}`;
}

export default function H2HMatches({
  matches,
  sortKey,
  sortDir,
  setSortKey,
  setSortDir,
  playerId,
}: H2HMatchesProps) {
  const [showWinnerStats, setShowWinnerStats] = useState(true);

  // Sorting client-side (con gestione corretta della data!)
  const sortedMatches = useMemo(() => {
    if (!matches?.length) return [];

    return [...matches].sort((a, b) => {
      let aVal: any = a[sortKey];
      let bVal: any = b[sortKey];

      // Gestione speciale per la data
      if (sortKey === "tourney_date") {
        aVal = new Date(a.tourney_date).getTime();
        bVal = new Date(b.tourney_date).getTime();
      }

      if (aVal == null) return sortDir === "asc" ? -1 : 1;
      if (bVal == null) return sortDir === "asc" ? 1 : -1;

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [matches, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Scroll sync fluido e senza jitter
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const bottomInnerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom || !bottomInnerRef.current) return;

    let ticking = false;
    const sync = (source: HTMLElement, target: HTMLElement) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          target.scrollLeft = source.scrollLeft;
          ticking = false;
        });
        ticking = true;
      }
    };

    const onScroll = (e: Event) => {
      const el = e.target as HTMLElement;
      if (el === top) sync(top, bottom);
      if (el === bottom) sync(bottom, top);
    };

    const syncWidth = () => {
      bottomInnerRef.current!.style.width = `${top.scrollWidth}px`;
    };

    top.addEventListener("scroll", onScroll);
    bottom.addEventListener("scroll", onScroll);
    syncWidth();

    const ro = new ResizeObserver(syncWidth);
    ro.observe(top);
    window.addEventListener("resize", syncWidth);

    return () => {
      top.removeEventListener("scroll", onScroll);
      bottom.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", syncWidth);
    };
  }, [sortedMatches]);

  // Colonne statistiche (winner / loser)
  const statsColumns = useMemo(() => {
    return showWinnerStats
      ? [
          { id: "WA", label: "WA", title: "Winner Aces" },
          { id: "WDF", label: "WDF", title: "Winner Double Faults" },
          { id: "W1stIn", label: "W1stIn", title: "W 1st Serve In %" },
          { id: "W1stPct", label: "W1st%", title: "W 1st Serve Won %" },
          { id: "W2ndPct", label: "W2nd%", title: "W 2nd Serve Won %" },
          { id: "WBPSvd", label: "BPSvd", title: "W Break Points Saved" },
        ]
      : [
          { id: "LA", label: "LA", title: "Loser Aces" },
          { id: "LDF", label: "LDF", title: "Loser Double Faults" },
          { id: "L1stIn", label: "L1stIn", title: "L 1st Serve In %" },
          { id: "L1stPct", label: "L1st%", title: "L 1st Serve Won %" },
          { id: "L2ndPct", label: "L2nd%", title: "L 2nd Serve Won %" },
          { id: "LBPSvd", label: "BPSvd", title: "L Break Points Saved" },
        ];
  }, [showWinnerStats]);

  // Colonne base della tabella
  const baseColumns = [
    { key: "tourney_date" as const, label: "Date", align: "center" },
    { key: "tourney_name" as const, label: "Tourney", align: "left" },
    { key: "surface" as const, label: "Surface", align: "center" },
    { key: "round" as const, label: "Round", align: "center" },
    { key: "winner_rank" as const, label: "Wrk", align: "center" },
    { key: "winner_name" as const, label: "Winner", align: "left" },
    { key: "loser_rank" as const, label: "Lrk", align: "center" },
    { key: "loser_name" as const, label: "Loser", align: "left" },
    { key: "score" as const, label: "Score", align: "center" },
    { key: "best_of" as const, label: "BoF", align: "center" },
    { key: "minutes" as const, label: "Min", align: "center" },
  ];

  if (!matches || matches.length === 0) {
    return <p className="text-gray-400 text-sm">No matches found.</p>;
  }

  return (
    <div className="mt-4 text-gray-100">
      {/* Toggle Winner / Loser stats */}
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setShowWinnerStats(!showWinnerStats)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium transition"
        >
          {showWinnerStats ? "Show Loser Stats" : "Show Winner Stats"}
        </button>
      </div>

      {/* Tabella principale */}
      <div
        ref={topScrollRef}
        className="overflow-x-auto rounded border border-white/20 bg-gray-900/90 shadow-xl"
      >
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-black/80">
              {[...baseColumns, ...statsColumns].map((col) => {
                const isSortable = "key" in col;
                const currentSort = isSortable && sortKey === col.key;
                const colTitle = "title" in col ? (col.title ?? col.label) : col.label;
                const align = isSortable && "align" in col ? col.align : "center";
                const keyId = isSortable ? col.key : col.id;

                return (
                  <th
                    key={keyId}
                    scope="col"
                    className={`border border-white/20 px-3 py-2 text-${align} font-medium text-gray-200 select-none ${
                      isSortable ? "cursor-pointer hover:bg-gray-800" : ""
                    }`}
                    onClick={() => (isSortable ? handleSort(col.key) : undefined)}
                    aria-sort={
                      currentSort
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    title={colTitle}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {col.label}
                      {currentSort && (
                        <span className="text-xs">{sortDir === "asc" ? "▲" : "▼"}</span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedMatches.map((m) => {
              const isPlayerWinner = m.winner_id === playerId;
              const isPlayerLoser = m.loser_id === playerId;

              // Calcoli per le percentuali (evitiamo divisioni per zero)
              const w1stInPct = pct(m.w_1stIn, m.w_svpt);
              const w1stWonPct = pct(m.w_1stWon, m.w_1stIn);
              const w2ndWonPct = pct(m.w_2ndWon, m.w_svpt && m.w_1stIn ? m.w_svpt - m.w_1stIn : null);

              const l1stInPct = pct(m.l_1stIn, m.l_svpt);
              const l1stWonPct = pct(m.l_1stWon, m.l_1stIn);
              const l2ndWonPct = pct(m.l_2ndWon, m.l_svpt && m.l_1stIn ? m.l_svpt - m.l_1stIn : null);

              return (
                <tr
                  key={`${m.id ?? m.tourney_id}-${m.tourney_date}`}
                  className={`border-b border-white/10 transition-colors ${
                    isPlayerWinner
                      ? "bg-green-900/20"
                      : isPlayerLoser
                      ? "bg-red-900/20"
                      : "hover:bg-gray-800/50"
                  }`}
                >
                  <td className="px-3 py-2 text-center">
                    {new Date(m.tourney_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/tournaments/${m.tourney_id}/${m.year}`}
                      className="text-blue-400 hover:underline"
                    >
                      {m.tourney_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{m.surface ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{m.round}</td>
                  <td className="px-3 py-2 text-center">{m.winner_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className="mr-1">{getFlagFromIOC(m.winner_ioc)}</span>
                    <Link
                      href={`/players/${m.winner_id}`}
                      className={isPlayerWinner ? "font-bold text-green-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(m.winner_name, m.winner_seed, m.winner_entry)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{m.loser_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <span className="mr-1">{getFlagFromIOC(m.loser_ioc)}</span>
                    <Link
                      href={`/players/${m.loser_id}`}
                      className={isPlayerLoser ? "font-bold text-red-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(m.loser_name, m.loser_seed, m.loser_entry)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center font-medium">{m.score}</td>
                  <td className="px-3 py-2 text-center">{m.best_of ?? "-"}</td>
                  <td className="px-3 py-2 text-center">{m.minutes ?? "-"}</td>

                  {/* Statistiche Winner / Loser */}
                  {showWinnerStats ? (
                    <>
                      <td className="px-3 py-2 text-center">{m.w_ace ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{m.w_df ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{w1stInPct}</td>
                      <td className="px-3 py-2 text-center">{w1stWonPct}</td>
                      <td className="px-3 py-2 text-center">{w2ndWonPct}</td>
                      <td className="px-3 py-2 text-center">{ratio(m.w_bpSaved, m.w_bpFaced)}</td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-center">{m.l_ace ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{m.l_df ?? "-"}</td>
                      <td className="px-3 py-2 text-center">{l1stInPct}</td>
                      <td className="px-3 py-2 text-center">{l1stWonPct}</td>
                      <td className="px-3 py-2 text-center">{l2ndWonPct}</td>
                      <td className="px-3 py-2 text-center">{ratio(m.l_bpSaved, m.l_bpFaced)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra di scroll inferiore sincronizzata */}
      <div ref={bottomScrollRef} className="mt-2 h-4 overflow-x-auto" aria-hidden="true">
        <div ref={bottomInnerRef} className="h-full" />
      </div>
    </div>
  );
}