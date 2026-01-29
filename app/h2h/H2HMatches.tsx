"use client";

import Link from "next/link";
import { Match, SortKey, SortDirection } from "@/types";
import Flag from '@/components/Flag';
import { getTourneyHref, extractUniqueSurfaces, getPlayerHref } from "@/lib/utils";
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

  // Sorting client-side (con gestione corretta della data!) — extended to handle stat columns
  const sortedMatches = useMemo(() => {
    if (!matches?.length) return [];
    if (sortKey === null) return [...matches];

    const dir = sortDir === 'asc' ? 1 : -1;

    const getVal = (m: Match, key: string | null) => {
      if (!key) return null;

      if (key === 'tourney_date') return m.tourney_date ? new Date(m.tourney_date).getTime() : null;

      switch (key) {
        case 'w_1stPct':
          return numPct(m.w_1stWon, m.w_1stIn) ?? -1;
        case 'w_2ndPct':
          return numPct(m.w_2ndWon, m.w_svpt && m.w_1stIn ? m.w_svpt - m.w_1stIn : null) ?? -1;
        case 'w_1stIn':
          return numPct(m.w_1stIn, m.w_svpt) ?? -1;
        case 'w_bpSaved':
          return m.w_bpSaved ?? -1;

        case 'l_1stPct':
          return numPct(m.l_1stWon, m.l_1stIn) ?? -1;
        case 'l_2ndPct':
          return numPct(m.l_2ndWon, m.l_svpt && m.l_1stIn ? m.l_svpt - m.l_1stIn : null) ?? -1;
        case 'l_1stIn':
          return numPct(m.l_1stIn, m.l_svpt) ?? -1;
        case 'l_bpSaved':
          return m.l_bpSaved ?? -1;

        default:
          const v = (m as any)[String(key)];
          return v == null ? null : v;
      }
    };

    return [...matches].sort((a, b) => {
      const aVal = getVal(a, sortKey as string);
      const bVal = getVal(b, sortKey as string);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1 * dir;
      if (bVal == null) return -1 * dir;

      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
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
      const bottomInner = bottomInnerRef.current;
      try {
        if (!bottomInner || !top) return;
        bottomInner.style.width = `${top.scrollWidth}px`;
      } catch (err) {
        console.debug('[H2HMatches] syncWidth failed', err);
      }
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

  // Colonne statistiche (winner / loser) — ora con chiavi usabili per il sorting
  const statsColumns = useMemo(() => {
    return showWinnerStats
      ? [
          { id: "w_ace", label: "WA", title: "Winner Aces: number of aces served by the winner", key: "w_ace" as SortKey },
          { id: "w_df", label: "WDF", title: "Winner Double Faults: number of double faults by the winner", key: "w_df" as SortKey },
          { id: "w_1stIn", label: "W1stIn", title: "Winner 1st Serve In: 1st serves in / total service points", key: "w_1stIn" as SortKey },
          { id: "w_1stPct", label: "W1st%", title: "Winner 1st Serve Won %: 1st serves won / 1st serves in", key: "w_1stPct" as SortKey },
          { id: "w_2ndPct", label: "W2nd%", title: "Winner 2nd Serve Won %: 2nd serves won / 2nd serve points", key: "w_2ndPct" as SortKey },
          { id: "w_bpSaved", label: "BPSvd", title: "Winner Break Points Saved / Break Points Faced", key: "w_bpSaved" as SortKey },
        ]
      : [
          { id: "l_ace", label: "LA", title: "Loser Aces: number of aces served by the loser", key: "l_ace" as SortKey },
          { id: "l_df", label: "LDF", title: "Loser Double Faults: number of double faults by the loser", key: "l_df" as SortKey },
          { id: "l_1stIn", label: "L1stIn", title: "Loser 1st Serve In: 1st serves in / total service points", key: "l_1stIn" as SortKey },
          { id: "l_1stPct", label: "L1st%", title: "Loser 1st Serve Won %: 1st serves won / 1st serves in", key: "l_1stPct" as SortKey },
          { id: "l_2ndPct", label: "L2nd%", title: "Loser 2nd Serve Won %: 2nd serves won / 2nd serve points", key: "l_2ndPct" as SortKey },
          { id: "l_bpSaved", label: "BPSvd", title: "Loser Break Points Saved / Break Points Faced", key: "l_bpSaved" as SortKey },
        ];
  }, [showWinnerStats]);

  // Numeric percentage helper for sorting
  function numPct(num?: number | null, den?: number | null) {
    if (num == null || den == null || den <= 0) return null;
    const val = (num / den) * 100;
    return Number.isFinite(val) ? val : null;
  }

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
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-black/80">
              {[...baseColumns, ...statsColumns].map((col) => {
                const anyCol = col as any;
                const isSortable = Boolean(anyCol.key);
                const currentSort = isSortable && sortKey === anyCol.key;
                const colTitle = anyCol.title ?? anyCol.label;
                const align = anyCol.align ?? "center";
                const keyId = anyCol.key ?? anyCol.id ?? String(anyCol.label);

                return (
                  <th
                    key={keyId}
                    scope="col"
                    className={`border border-white/20 px-3 py-2 text-${align} font-medium text-gray-200 select-none ${
                      isSortable ? "cursor-pointer hover:bg-gray-800" : ""
                    }`}
                    onClick={() => (isSortable ? handleSort(anyCol.key) : undefined)}
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
                      {anyCol.label}
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
                    {m.tourney_date ? new Date(m.tourney_date).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    }) : "-"}
                  </td>
                  <td className="px-3 py-2">
                    <Link
                      href={getTourneyHref({ id: m.tourney_id, name: m.tourney_name, year: m.year })}
                      className="text-blue-400 hover:underline"
                    >
                      {m.tourney_name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{extractUniqueSurfaces(m.surface).join(', ') || (m.surface ?? "-")}</td>
                  <td className="px-3 py-2 text-center">{m.round}</td>
                  <td className="px-3 py-2 text-center">{m.winner_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Flag ioc={m.winner_ioc ?? undefined} className="w-4 h-3 inline-block mr-1" />
                    <Link
                      href={getPlayerHref((m as any).winner_slug ?? String(m.winner_id ?? ''))}
                      className={isPlayerWinner ? "font-bold text-green-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(m.winner_name ?? '', m.winner_seed, m.winner_entry)}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-center">{m.loser_rank ?? "-"}</td>
                  <td className="px-3 py-2">
                    <Flag ioc={m.loser_ioc ?? undefined} className="w-4 h-3 inline-block mr-1" />
                    <Link
                      href={getPlayerHref((m as any).loser_slug ?? String(m.loser_id ?? ''))}
                      className={isPlayerLoser ? "font-bold text-red-400" : "text-gray-100 hover:text-white"}
                    >
                      {renderNameWithSeedEntry(m.loser_name ?? '', m.loser_seed, m.loser_entry)}
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