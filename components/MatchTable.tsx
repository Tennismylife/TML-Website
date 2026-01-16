"use client";

import React from "react";
import Link from "next/link";
import { Match, SortDirection, SortKey } from "@/types";
import Flag from '@/components/Flag';
import { getTourneyHref, extractUniqueSurfaces } from "@/lib/utils";
import { useEffect, useState, useMemo, useRef } from "react";

interface MatchTableProps {
  matches: Match[];
  sortKey: SortKey;
  sortDir: SortDirection;
  setSortKey: (key: SortKey) => void;
  setSortDir: (dir: SortDirection) => void;
  playerId: string;
  onHeaderHeightChange?: (h: number) => void;
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
  sortKey,
  sortDir,
  setSortKey,
  setSortDir,
  playerId,
  onHeaderHeightChange,
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
        { id: "WA", label: "WA", title: "Winner Aces" },
        { id: "WDF", label: "WDF", title: "Winner Double Faults" },
        { id: "W1stIn", label: "W1stIn", title: "Winner 1st Serve In = 1st Serve In/ Total Service Points" },
        { id: "W1stPct", label: "W1st%", title: "Winner 1st% =  1st Serve Won/ 1st Serve In" },
        { id: "W2ndPct", label: "W2nd%", title: "Winner 2nd% = 2nd Serve Won /(Total Service Points-1st Serve In)" },
        { id: "WBPSvd", label: "BPSvd", title: "Winner Break Points Faced / Break Points Saved" },
      ]
    : [
        { id: "LA", label: "LA", title: "Loser Ace" },
        { id: "LDF", label: "LDF", title: "Loser Double Faults" },
        { id: "L1stIn", label: "L1stIn", title: "Loser 1st Serve In = 1st Serve In/ Total Service Points" },
        { id: "L1stPct", label: "L1st%", title: "Loser 1st% =  1st Serve Won/ 1st Serve In" },
        { id: "L2ndPct", label: "L2nd%", title: "Loser 2nd% = 2nd Serve Won /(Total Service Points-1st Serve In)" },
        { id: "LBPSvd", label: "BPSvd", title: "Loser Break Points Faced / Break Points Saved" },
      ], [showWinnerStats]);


  // Round ordering priority: ensure within the same tournament rounds are always
  // ordered R256, R128, R64, R32, R16, R8, QF, SF, F regardless of date sorting direction.
  const roundOrder = ['R256','R128','R64','R32','R16','R8','QF','SF','F'];
  function getRoundIndex(round?: string | null) {
    if (!round) return Number.MAX_SAFE_INTEGER;
    const r = String(round).toUpperCase().trim();
    // direct match
    const direct = roundOrder.indexOf(r);
    if (direct >= 0) return direct;
    // common patterns: R32, R16, QF, SF, F
    const match = r.match(/R(\d+)/);
    if (match) {
      const n = Number(match[1]);
      // map numeric rounds to approximate slots (smaller number -> later round)
      // we'll try to map 256,128,64,32,16,8
      const map = {
        256: 0, 128: 1, 64: 2, 32: 3, 16: 4, 8: 5
      } as Record<number, number>;
      if (n in map) return map[n];
    }
    if (r.includes('QUARTER') || r === 'Q' || r === 'QF') return roundOrder.indexOf('QF');
    if (r.includes('SEMI') || r === 'SF') return roundOrder.indexOf('SF');
    if (r === 'F' || r.includes('FINAL')) return roundOrder.indexOf('F');
    // fallback: put unknown rounds after known ones
    return Number.MAX_SAFE_INTEGER - 1;
  }

  const sortedMatches = useMemo(() => {
    const arr = [...matches];
    const dir = sortDir === 'asc' ? 1 : -1;

    arr.sort((a, b) => {
      // Special handling when sorting by tourney_date: keep rounds ordering within same tournament
      if (sortKey === 'tourney_date') {
        if (a.tourney_id === b.tourney_id && a.year === b.year) {
          const ai = getRoundIndex(a.round);
          const bi = getRoundIndex(b.round);
          // Respect sort direction so rounds are reversed when date sort is descending
          return (ai - bi) * dir;
        }
        const ad = new Date(a.tourney_date as unknown as string).getTime();
        const bd = new Date(b.tourney_date as unknown as string).getTime();
        return (ad - bd) * dir;
      }

      // If sorting by round directly, use explicit round order
      if (sortKey === 'round') {
        const ai = getRoundIndex(a.round);
        const bi = getRoundIndex(b.round);
        if (ai !== bi) return (ai - bi) * dir;
        // tie-break by date
        const ad = new Date(a.tourney_date as unknown as string).getTime();
        const bd = new Date(b.tourney_date as unknown as string).getTime();
        return (ad - bd) * dir;
      }

      // Generic sort for other keys (string/number fields)
      const av = typeof sortKey === 'string' ? (a as any)[sortKey] : null;
      const bv = typeof sortKey === 'string' ? (b as any)[sortKey] : null;
      if (av == null && bv == null) return 0;
      if (av == null) return 1 * dir;
      if (bv == null) return -1 * dir;
      // numeric comparison
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      // fallback string compare
      return String(av).localeCompare(String(bv)) * dir;
    });

    return arr;
  }, [matches, sortKey, sortDir]);

  if (!sortedMatches || sortedMatches.length === 0) return <p className="m-0 p-0">No matches found.</p>;

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
                  <td className={tdBase}>{new Date(m.tourney_date as unknown as string).toLocaleDateString()}</td>
                  <td className={tdBase}>
                    <Link href={getTourneyHref({ id: m.tourney_id, name: m.tourney_name, year: m.year })} className="text-white hover:underline">
                      {m.tourney_name}
                    </Link>
                  </td>
                  <td className={tdBase}>{extractUniqueSurfaces(m.surface).join(', ') || m.surface || "-"}</td>
                  <td className={tdBase}>{m.round}</td>
                  <td className={tdBase}>{m.winner_rank ?? "-"}</td>
                  <td className={tdBase}>
                    {m.winner_ioc && <Flag ioc={m.winner_ioc} className="w-4 h-3 mr-1" />}
                    <Link
                      href={`/players/${m.winner_id}`}
                      className={m.winner_id === playerId ? "font-bold text-green-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.winner_name ?? "", m.winner_seed, m.winner_entry)}
                    </Link>
                  </td>
                  <td className={tdBase}>{m.loser_rank ?? "-"}</td>
                  <td className={tdBase}>
                    {m.loser_ioc && <Flag ioc={m.loser_ioc} className="w-4 h-3 mr-1" />}
                    <Link
                      href={`/players/${m.loser_id}`}
                      className={m.loser_id === playerId ? "font-bold text-red-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.loser_name ?? "", m.loser_seed, m.loser_entry)}
                    </Link>
                  </td>
                  <td className={tdBase}>{m.score}</td>
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
