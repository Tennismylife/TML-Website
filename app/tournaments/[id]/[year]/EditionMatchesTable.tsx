"use client";

import Link from "next/link";
import { Match, SortKey, SortDirection } from "@/types";
import { getFlagFromIOC } from "@/lib/utils";
import { useState, useMemo } from "react";

interface MatchTableProps {
  matches: Match[];
  sortKey: SortKey;
  sortDir: SortDirection;
  setSortKey: (key: SortKey) => void;
  setSortDir: (dir: SortDirection) => void;
  playerId: string;
}

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
        <span className="text-xs text-gray-500"> ({seed})</span>
      ) : entry ? (
        <span className="text-xs text-gray-500"> ({entry})</span>
      ) : null}
    </>
  );
}

function pct(num?: number | null, den?: number | null, digits = 1) {
  if (num == null || den == null || den <= 0) return null;
  const val = (num / den) * 100;
  return Number.isFinite(val) ? Number(val.toFixed(digits)) : null;
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
}: MatchTableProps) {
  const [showWinnerStats, setShowWinnerStats] = useState(true);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // Priorità dei round
  const roundOrder: Record<string, number> = {
    "R256": 0,
    "R128": 1,
    "R64":  2,
    "R32":  3,
    "R16":  4,
    "QF":   5,
    "SF":   6,
    "F":    7,
  };

  const statsColumns = useMemo(() => {
    return showWinnerStats
      ? [
          { id: "w_ace", label: "WA", title: "Winner Ace", key: "w_ace" as SortKey },
          { id: "w_df", label: "WDF", title: "Winner Double Faults", key: "w_df" as SortKey },
          { id: "w_1stIn", label: "W1st In", title: "W 1st In", key: "w_1stIn" as SortKey },
          { id: "w_1stPct", label: "W1st%", title: "W 1st%", key: "w_1stPct" as SortKey },
          { id: "w_2ndPct", label: "W2nd%", title: "W 2nd%", key: "w_2ndPct" as SortKey },
          { id: "w_bp", label: "BPSvd", title: "W BP Saved / BP Faced", key: "w_bp" as SortKey },
        ]
      : [
          { id: "l_ace", label: "LA", title: "Loser Ace", key: "l_ace" as SortKey },
          { id: "l_df", label: "LDF", title: "Loser Double Faults", key: "l_df" as SortKey },
          { id: "l_1stIn", label: "L1st In", title: "L 1st In", key: "l_1stIn" as SortKey },
          { id: "l_1stPct", label: "L1st%", title: "L 1st%", key: "l_1stPct" as SortKey },
          { id: "l_2ndPct", label: "L2nd%", title: "L 2nd%", key: "l_2ndPct" as SortKey },
          { id: "l_bp", label: "BPSvd", title: "L BP Saved / BP Faced", key: "l_bp" as SortKey },
        ];
  }, [showWinnerStats]);

  const sortedMatches = useMemo(() => {
    if (!matches) return [];

    return [...matches].sort((a, b) => {
      if (sortKey === "round") {
        const aRank = roundOrder[a.round] ?? Infinity;
        const bRank = roundOrder[b.round] ?? Infinity;
        return sortDir === "asc" ? aRank - bRank : bRank - aRank;
      }

      const getVal = (
        m: Match,
        key:
          | SortKey
          | "w_1stPct"
          | "w_2ndPct"
          | "l_1stPct"
          | "l_2ndPct"
          | "w_bp"
          | "l_bp"
      ) => {
        switch (key) {
          case "w_1stPct":
            return pct(m.w_1stWon ?? null, m.w_1stIn ?? null) ?? -1;
          case "w_2ndPct":
            return pct(
              m.w_2ndWon ?? null,
              (m.w_svpt ?? 0) - (m.w_1stIn ?? 0)
            ) ?? -1;
          case "l_1stPct":
            return pct(m.l_1stWon ?? null, m.l_1stIn ?? null) ?? -1;
          case "l_2ndPct":
            return pct(
              m.l_2ndWon ?? null,
              (m.l_svpt ?? 0) - (m.l_1stIn ?? 0)
            ) ?? -1;
          case "w_bp":
            return m.w_bpSaved ?? 0;
          case "l_bp":
            return m.l_bpSaved ?? 0;
          default:
            return (m as any)[key as SortKey];
        }
      };

      const aVal = getVal(a, sortKey);
      const bVal = getVal(b, sortKey);

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [matches, sortKey, sortDir, showWinnerStats]);

  if (!matches || matches.length === 0) return <p className="text-gray-300">No matches found.</p>;

  return (
    <div className="overflow-x-auto rounded bg-gray-900 shadow mt-4">
      <div className="flex justify-end mb-2 px-4 pt-4">
        <button
          className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          onClick={() => setShowWinnerStats(!showWinnerStats)}
        >
          {showWinnerStats ? "Show Loser Stats" : "Show Winner Stats"}
        </button>
      </div>

      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            {[
              { id: "round", label: "Round", title: "Round", key: "round" as SortKey },
              { id: "winner_rank", label: "Wrk", title: "Winner Rank", key: "winner_rank" as SortKey },
              { id: "winner_name", label: "Winner", title: "Winner", key: "winner_name" as SortKey },
              { id: "loser_rank", label: "Lrk", title: "Loser Rank", key: "loser_rank" as SortKey },
              { id: "loser_name", label: "Loser", title: "Loser", key: "loser_name" as SortKey },
              { id: "score", label: "Score", title: "Score", key: "score" as SortKey },
              { id: "best_of", label: "BoF", title: "Best of", key: "best_of" as SortKey },
              { id: "minutes", label: "Min", title: "Minutes", key: "minutes" as SortKey },
              ...statsColumns,
            ].map((col) => (
              <th
                key={col.id}
                className="px-4 py-2 text-center text-gray-200 text-base cursor-pointer select-none"
                onClick={() => col.key && handleSort(col.key)}
                title={col.title || col.label}
              >
                {col.label} {col.key === sortKey ? (sortDir === "asc" ? "▲" : "▼") : ""}
              </th>
            ))}
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

            const isRecentMatch = index === 0;
            return (
              <tr
                key={index}
                className={`hover:bg-white/5 transition ${
                  isRecentMatch ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10" : ""
                }`}
              >
                <td className="px-4 py-2 text-center text-sm">{m.round}</td>
                <td className="px-4 py-2 text-center text-sm">{m.winner_rank ?? "-"}</td>
                <td className="px-4 py-2 flex items-center justify-center gap-2 text-sm">
                  <span className="text-xl">{getFlagFromIOC(m.winner_ioc)}</span>
                  <Link
                    href={`/players/${m.winner_id}`}
                    className={m.winner_id === playerId ? "font-bold text-green-400 hover:text-green-300" : "text-gray-200 hover:text-yellow-400 transition"}
                  >
                    {renderNameWithSeedEntry(m.winner_name, m.winner_seed, m.winner_entry)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center text-sm">{m.loser_rank ?? "-"}</td>
                <td className="px-4 py-2 flex items-center justify-center gap-2 text-sm">
                  <span className="text-xl">{getFlagFromIOC(m.loser_ioc)}</span>
                  <Link
                    href={`/players/${m.loser_id}`}
                    className={m.loser_id === playerId ? "font-bold text-red-400 hover:text-red-300" : "text-gray-400 hover:text-gray-200 transition"}
                  >
                    {renderNameWithSeedEntry(m.loser_name, m.loser_seed, m.loser_entry)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-center font-mono text-sm">{m.score}</td>
                <td className="px-4 py-2 text-center text-sm">{m.best_of ?? "-"}</td>
                <td className="px-4 py-2 text-center text-sm">{m.minutes ?? "-"}</td>

                {showWinnerStats ? (
                  <>
                    <td className="px-4 py-2 text-center text-sm">{m.w_ace ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{m.w_df ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(w1stIn, wSvpt) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(m.w_1stWon ?? null, w1stIn) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(m.w_2ndWon ?? null, w2ndPts) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{ratio(m.w_bpSaved ?? null, m.w_bpFaced ?? null)}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2 text-center text-sm">{m.l_ace ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{m.l_df ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(l1stIn, lSvpt) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(m.l_1stWon ?? null, l1stIn) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{pct(m.l_2ndWon ?? null, l2ndPts) ?? "-"}</td>
                    <td className="px-4 py-2 text-center text-sm">{ratio(m.l_bpSaved ?? null, m.l_bpFaced ?? null)}</td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
