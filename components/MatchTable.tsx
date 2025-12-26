"use client";

import Link from "next/link";
import { Match, SortKey, SortDirection } from "@/types";
import { getFlagFromIOC, getTourneyHref, extractUniqueSurfaces } from "@/lib/utils";
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

  if (!matches || matches.length === 0) return <p className="m-0 p-0">No matches found.</p>;

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
            {matches.map((m, index) => {
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
                    <Link href={getTourneyHref({ id: m.tourney_id, name: m.tourney_name, year: m.year })} className="text-blue-600 hover:underline">
                      {m.tourney_name}
                    </Link>
                  </td>
                  <td className={tdBase}>{extractUniqueSurfaces(m.surface).join(', ') || m.surface || "-"}</td>
                  <td className={tdBase}>{m.round}</td>
                  <td className={tdBase}>{m.winner_rank ?? "-"}</td>
                  <td className={tdBase}>
                    <span className="mr-1">{getFlagFromIOC(m.winner_ioc)}</span>
                    <Link
                      href={`/players/${m.winner_id}`}
                      className={m.winner_id === playerId ? "font-bold text-green-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.winner_name, m.winner_seed, m.winner_entry)}
                    </Link>
                  </td>
                  <td className={tdBase}>{m.loser_rank ?? "-"}</td>
                  <td className={tdBase}>
                    <span className="mr-1">{getFlagFromIOC(m.loser_ioc)}</span>
                    <Link
                      href={`/players/${m.loser_id}`}
                      className={m.loser_id === playerId ? "font-bold text-red-600" : ""}
                    >
                      {renderNameWithSeedEntry(m.loser_name, m.loser_seed, m.loser_entry)}
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
