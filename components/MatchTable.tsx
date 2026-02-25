"use client";

import React from "react";
import Link from "next/link";
import { Match, SortDirection, SortKey } from "@/types";
import Flag from '@/components/Flag';
import { getTourneyHref, extractUniqueSurfaces, getPlayerHref, getPlayerHrefWithTab, formatDateISO, createH2HUrl, getRoundIndex } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";

interface MatchTableProps {
  matches: Match[];
  loading?: boolean;
  sortKey: SortKey;
  sortDir: SortDirection;
  setSortKey: (key: SortKey) => void;
  setSortDir: (dir: SortDirection) => void;
  playerId: string;
  playerSlug?: string | null;
  onHeaderHeightChange?: (h: number) => void;
  // If provided, player links will include this tab (e.g. 'matches')
  currentTab?: string | null;
}

function renderNameWithSeedEntry(name: string, seed?: number | null, entry?: string | null) {
  const hasSeed = typeof seed === "number" && !Number.isNaN(seed);
  return (
    <>
      {name}
      {hasSeed ? <span className="text-xs text-gray-500"> ({seed})</span> :
       entry ? <span className="text-xs text-gray-500"> ({entry})</span> : null}
    </>
  );
}

function pct(num?: number | null, den?: number | null, digits = 1) {
  if (num == null || den == null || den <= 0) return "-";
  const val = (num / den) * 100;
  return Number.isFinite(val) ? `${val.toFixed(digits)}%` : "-";
}

function ratio(num?: number | null, den?: number | null) {
  if (num == null && den == null) return "-";
  return `${num ?? 0}/${den ?? 0}`;
}

export default function MatchTable({
  matches,
  loading = false,
  sortKey,
  sortDir,
  setSortKey,
  setSortDir,
  playerId,
  playerSlug,
  onHeaderHeightChange,
  currentTab = null,
}: MatchTableProps) {
  const [showWinnerStats, setShowWinnerStats] = useState(true);

  const theadRef = useRef<HTMLTableSectionElement | null>(null);
  useEffect(() => {
    if (!onHeaderHeightChange) return;
    const el = theadRef.current;
    if (!el) return;
    const report = () => onHeaderHeightChange(el.getBoundingClientRect().height);
    report();
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [onHeaderHeightChange, matches]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }; 

  useEffect(() => {
    // no-op: kept for parity if needed later
  }, [matches]);

  const statsColumns = useMemo(() => showWinnerStats
    ? [
        { id: "w_ace", label: "WA", title: "Winner Aces: number of aces served by the winner" },
        { id: "w_df", label: "WDF", title: "Winner Double Faults: number of double faults by the winner" },
        { id: "w_1stIn", label: "W1stIn", title: "Winner 1st Serve In: 1st serves in / total service points" },
        { id: "w_1stPct", label: "W1st%", title: "Winner 1st Serve Won %: 1st serves won / 1st serves in" },
        { id: "w_2ndPct", label: "W2nd%", title: "Winner 2nd Serve Won %: 2nd serves won / 2nd serve points" },
        { id: "w_bpSaved", label: "BPSvd", title: "Winner Break Points Saved / Break Points Faced" },
      ]
    : [
        { id: "l_ace", label: "LA", title: "Loser Aces: number of aces served by the loser" },
        { id: "l_df", label: "LDF", title: "Loser Double Faults: number of double faults by the loser" },
        { id: "l_1stIn", label: "L1stIn", title: "Loser 1st Serve In: 1st serves in / total service points" },
        { id: "l_1stPct", label: "L1st%", title: "Loser 1st Serve Won %: 1st serves won / 1st serves in" },
        { id: "l_2ndPct", label: "L2nd%", title: "Loser 2nd Serve Won %: 2nd serves won / 2nd serve points" },
        { id: "l_bpSaved", label: "BPSvd", title: "Loser Break Points Saved / Break Points Faced" },
      ], [showWinnerStats]);


  // For round-based ordering we now delegate to the shared utility.  That
  // helper has the special ATP-Finals logic (RR before SF/F and QF pushed
  // to the end) so tournament and player pages behave consistently.
  function localRoundIndex(round?: string | null, tourneyLevel?: string | null) {
    return getRoundIndex(round, tourneyLevel);
  }

  const sortedMatches = useMemo(() => {
    const arr = [...matches];
    const dir = sortDir === 'asc' ? 1 : -1;

    const numPct = (num?: number | null, den?: number | null) => {
      if (num == null || den == null || den <= 0) return null;
      const v = (num / den) * 100;
      return Number.isFinite(v) ? v : null;
    };

    arr.sort((a, b) => {
      // Special handling when sorting by tourney_date: keep rounds ordering within same tournament
      if (sortKey === 'tourney_date') {
        if (a.tourney_id === b.tourney_id && a.year === b.year) {
          const ai = localRoundIndex(a.round, a.tourney_level ?? null);
          const bi = localRoundIndex(b.round, b.tourney_level ?? null);
          // Respect sort direction so rounds are reversed when date sort is descending
          return (ai - bi) * dir;
        }
        const ad = new Date(a.tourney_date as unknown as string).getTime();
        const bd = new Date(b.tourney_date as unknown as string).getTime();
        return (ad - bd) * dir;
      }

      // If sorting by round directly, use explicit round order
      if (sortKey === 'round') {
        const ai = localRoundIndex(a.round, a.tourney_level ?? null);
        const bi = localRoundIndex(b.round, b.tourney_level ?? null);
        if (ai !== bi) return (ai - bi) * dir;
        // tie-break by date
        const ad = new Date(a.tourney_date as unknown as string).getTime();
        const bd = new Date(b.tourney_date as unknown as string).getTime();
        return (ad - bd) * dir;
      }

      // Handle stat-derived keys specially
      const getVal = (m: Match, key: string | null) => {
        if (!key) return null;
        switch (key) {
          case 'w_1stPct':
            return numPct(m.w_1stWon ?? null, m.w_1stIn ?? null) ?? -1;
          case 'w_2ndPct':
            return numPct(m.w_2ndWon ?? null, (m.w_svpt ?? 0) - (m.w_1stIn ?? 0)) ?? -1;
          case 'l_1stPct':
            return numPct(m.l_1stWon ?? null, m.l_1stIn ?? null) ?? -1;
          case 'l_2ndPct':
            return numPct(m.l_2ndWon ?? null, (m.l_svpt ?? 0) - (m.l_1stIn ?? 0)) ?? -1;
          case 'w_1stIn':
            return numPct(m.w_1stIn ?? null, m.w_svpt ?? null) ?? -1;
          case 'l_1stIn':
            return numPct(m.l_1stIn ?? null, m.l_svpt ?? null) ?? -1;
          case 'w_bpSaved':
            return m.w_bpSaved ?? -1;
          case 'l_bpSaved':
            return m.l_bpSaved ?? -1;
          default:
            return (m as any)[String(key)];
        }
      };

      const aVal = getVal(a, sortKey as string);
      const bVal = getVal(b, sortKey as string);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1 * dir;
      if (bVal == null) return -1 * dir;

      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      return String(aVal).localeCompare(String(bVal)) * dir;
    });

    return arr;
  }, [matches, sortKey, sortDir]);

  if (loading) return <p className="m-0 p-0 text-gray-400">Loading...</p>;
  if (!sortedMatches || sortedMatches.length === 0) return <p className="m-0 p-0 text-gray-400">No matches found.</p>;

  // Compact mobile styles: tiny paddings and font so the full table can fit in one viewport
  const thBase = "first:pl-0 px-1 py-0.5 text-gray-200 text-[10px] text-center whitespace-nowrap sm:first:pl-0 sm:px-2 sm:py-1 sm:text-sm";
  const tdBase = "first:pl-0 px-1 py-0.5 text-[10px] text-center whitespace-nowrap sm:first:pl-0 sm:px-2 sm:py-1 sm:text-sm";

  return (
    <div className="w-full flex flex-col">
      {/* Toggle Winner/Loser stats (no extra button) */}
      <div className="flex justify-end p-0">
        <button
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowWinnerStats(!showWinnerStats)}
        >
          {showWinnerStats ? "Show Loser Stats" : "Show Winner Stats"}
        </button>
      </div> 

      {/* Table (no internal scrollbars) */}
      <div className="min-w-0">
        <table className="min-w-full border-collapse w-full">
          <thead ref={theadRef}>
            <tr>
              {
                [
                  { id: "tourney_date", label: "Date", key: "tourney_date" as SortKey },
                  { id: "tourney_name", label: "Tourney", key: "tourney_name" as SortKey },
                  { id: "surface", label: "Surface", key: "surface" as SortKey },
                  { id: "round", label: "Round", key: "round" as SortKey },
                  { id: "winner_rank", label: "Wrk", key: "winner_rank" as SortKey },
                  { id: "winner_name", label: "Winner", key: "winner_name" as SortKey },
                  { id: "loser_rank", label: "Lrk", key: "loser_rank" as SortKey },
                  { id: "loser_name", label: "Loser", key: "loser_name" as SortKey },
                  { id: "score", label: "Score", key: "score" as SortKey },
                  { id: "h2h", label: "H2H", key: null as unknown as SortKey },
                  { id: "best_of", label: "BoF", key: "best_of" as SortKey },
                  { id: "minutes", label: "Min", key: "minutes" as SortKey },
                  ...statsColumns.map(c => ({ ...c, key: c.id as SortKey })),
                ].map(col => {
                  return (
                    <th
                      key={col.id}
                      className={`${thBase} cursor-pointer select-none`}
                      onClick={() => col.key && handleSort(col.key)}
                      title={'title' in col ? col.title : col.label}
                    >
                      {col.label} {sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : ""}
                    </th>
                  );
                })
              }
            </tr>
          </thead>

          <tbody>
            {sortedMatches.map((m, index) => {
              const wSvpt = m.w_svpt ?? null;
              const w1stIn = m.w_1stIn ?? null;
              const w2ndPts = wSvpt != null && w1stIn != null ? wSvpt - w1stIn : null;

              const lSvpt = m.l_svpt ?? null;
              const l1stIn = m.l_1stIn ?? null;
              const l2ndPts = lSvpt != null && l1stIn != null ? lSvpt - l1stIn : null;

              return (
                <tr key={index} className="hover:bg-gray-800/50">
                  <td className={tdBase}>
                    {m.year && playerSlug ? (
                      <Link href={`/players/${playerSlug}/season/${m.year}`} className="hover:underline">
                        {formatDateISO(m.tourney_date)}
                      </Link>
                    ) : formatDateISO(m.tourney_date)}
                  </td>
                  <td className={tdBase}>
                    <Link href={getTourneyHref({ slug: (m as any).tourney_slug ?? undefined, id: m.tourney_id, name: m.tourney_name, year: m.year })} className="text-white hover:underline">
                      {m.tourney_name}
                    </Link>
                  </td>
                  <td className={tdBase}>{extractUniqueSurfaces(m.surface).join(', ') || m.surface || "-"}</td>
                  <td className={tdBase}>{m.round}</td>
                  <td className={tdBase}>{m.winner_rank ?? "-"}</td>
                  <td className={tdBase}>
                    {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-4 h-3 mr-1" />}
                    <Link
                      href={(currentTab ? getPlayerHrefWithTab((m as any).winner_slug ?? String(m.winner_id), currentTab) : getPlayerHref((m as any).winner_slug ?? String(m.winner_id)))}
                      className={m.winner_id === playerId ? "font-bold text-green-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.winner_name ?? "", m.winner_seed, m.winner_entry)}
                    </Link>
                  </td>
                  <td className={tdBase}>{m.loser_rank ?? "-"}</td>
                  <td className={tdBase}>
                    {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-4 h-3 mr-1" />}
                    <Link
                      href={(currentTab ? getPlayerHrefWithTab((m as any).loser_slug ?? String(m.loser_id), currentTab) : getPlayerHref((m as any).loser_slug ?? String(m.loser_id)))}
                      className={m.loser_id === playerId ? "font-bold text-red-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.loser_name ?? "", m.loser_seed, m.loser_entry)}
                    </Link>
                  </td>
                  <td className={tdBase}>{m.score}</td>
                  <td className={tdBase}>
                    {m.winner_name && m.loser_name && (
                      <Link
                        href={createH2HUrl(m.winner_name, m.loser_name)}
                        className="text-yellow-400 hover:underline text-xs font-semibold"
                        title={`${m.winner_name} vs ${m.loser_name} H2H`}
                      >
                        H2H
                      </Link>
                    )}
                  </td>
                  <td className={`${tdBase}`}>{m.best_of ?? "-"}</td>
                  <td className={`${tdBase}`}>{m.minutes ?? "-"}</td>

                  {showWinnerStats ? (
                    <>
                      <td className={`${tdBase}`}>{m.w_ace ?? "-"}</td>
                      <td className={`${tdBase}`}>{m.w_df ?? "-"}</td>
                      <td className={`${tdBase}`}>{pct(w1stIn, wSvpt)}</td>
                      <td className={`${tdBase}`}>{pct(m.w_1stWon ?? null, w1stIn)}</td>
                      <td className={`${tdBase}`}>{pct(m.w_2ndWon ?? null, w2ndPts)}</td>
                      <td className={`${tdBase}`}>{ratio(m.w_bpSaved ?? null, m.w_bpFaced ?? null)}</td>
                    </>
                  ) : (
                    <>
                      <td className={`${tdBase}`}>{m.l_ace ?? "-"}</td>
                      <td className={`${tdBase}`}>{m.l_df ?? "-"}</td>
                      <td className={`${tdBase}`}>{pct(l1stIn, lSvpt)}</td>
                      <td className={`${tdBase}`}>{pct(m.l_1stWon ?? null, l1stIn)}</td>
                      <td className={`${tdBase}`}>{pct(m.l_2ndWon ?? null, l2ndPts)}</td>
                      <td className={`${tdBase}`}>{ratio(m.l_bpSaved ?? null, m.l_bpFaced ?? null)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
 
      </div>

      {/* no internal scrollbar - page will scroll if needed */}
    </div>
  );
}
