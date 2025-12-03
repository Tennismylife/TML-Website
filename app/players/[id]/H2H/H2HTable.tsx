"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getFlagFromIOC } from "@/lib/utils";
import type { Match } from "@/types";
import { useH2HData } from "./useH2HData";
import Pagination from "@/components/Pagination";

interface Filters {
  year: number | "All";
  level: string;
  surface: string;
  round: string;
  tournament: string;
  opponent?: string;
}

interface H2HProps {
  playerId: string;
  allMatches: Match[];
  loading: boolean;
  error: string | null;
  filters: Filters;
}

function H2HIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h12m0 0-3-3m3 3-3 3M21 17H9m0 0 3 3m-3-3 3-3" />
    </svg>
  );
}

function H2HSkeleton() {
  return (
    <div className="space-y-4 py-6">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-800/60 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

export default function H2HTable({ playerId, allMatches, loading, error, filters }: H2HProps) {
  const { rows, lastByOpponent, sortKey, sortDir, handleSort } = useH2HData(allMatches, playerId, filters);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // ORDINAMENTO GLOBALE
  const globalSortedRows = useMemo(() => {
    if (!rows) return [];
    const copy = [...rows];
    copy.sort((a, b) => b.matches - a.matches || a.oppName.localeCompare(b.oppName));
    if (sortKey) {
      copy.sort((a, b) => {
        let aVal: any, bVal: any;
        switch (sortKey) {
          case "oppName": aVal = a.oppName; bVal = b.oppName; break;
          case "lastMatch": aVal = lastByOpponent.get(a.oppId)?.dateMs ?? 0; bVal = lastByOpponent.get(b.oppId)?.dateMs ?? 0; break;
          case "matches": aVal = a.matches; bVal = b.matches; break;
          case "wins": aVal = a.wins; bVal = b.wins; break;
          case "losses": aVal = a.losses; bVal = b.losses; break;
          case "winPct": aVal = a.winPct; bVal = b.winPct; break;
          default: return 0;
        }
        if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        if (typeof aVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        return 0;
      });
    }
    return copy;
  }, [rows, sortKey, sortDir, lastByOpponent]);

  // RESET PAGINA AD OGNI CAMBIO ORDINAMENTO O DATI
  useEffect(() => {
    setCurrentPage(1);
  }, [globalSortedRows.length, sortKey, sortDir]);

  // FILTRO SOLO PER L’OPPONENT
  const filteredRows = useMemo(() => {
    if (!globalSortedRows) return [];
    if (!filters.opponent || filters.opponent === "") return globalSortedRows;
    return globalSortedRows.filter(row =>
      row.oppName.toLowerCase().includes(filters.opponent!.toLowerCase())
    );
  }, [globalSortedRows, filters.opponent]);

  // PAGINAZIONE
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const paginatedRows = useMemo(
    () => filteredRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredRows, currentPage]
  );

  const goToMatchesVs = (oppId: string) => {
    const params = new URLSearchParams();
    params.set("p1", playerId);
    params.set("p2", oppId);
    params.set("sort", "tourney_date");
    params.set("sortDir", "desc");
    router.push(`/h2h?${params.toString()}`, { scroll: false });
  };

  if (loading) return <H2HSkeleton />;
  if (error) return <div className="text-red-500 text-center py-16 text-xl font-medium">{error}</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-black/95 backdrop-blur-sm"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="bg-black">
              {[
                ["oppName", "Opponent"],
                ["lastMatch", "Last match"],
                ["matches", "Matches"],
                ["wins", "W"],
                ["losses", "L"],
                ["winPct", "Win%"],
              ].map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={`border border-white/30 px-5 py-4 text-lg font-medium text-gray-200 cursor-pointer select-none transition-all hover:bg-white/5 ${
                    key === "oppName" ? "text-left" : "text-center"
                  }`}
                  aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                >
                  <div className={`flex items-center gap-2 ${key !== "oppName" ? "justify-center" : ""}`}>
                    {label}
                    {sortKey === key && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        {sortDir === "asc" ? "Up" : "Down"}
                      </motion.span>
                    )}
                  </div>
                </th>
              ))}
              <th className="border border-white/30 px-5 py-4 text-center text-lg text-gray-200">H2H</th>
            </tr>
          </thead>

          <tbody className="text-gray-100">
            {paginatedRows.map((r, idx) => {
              const last = lastByOpponent.get(r.oppId);

              return (
                <motion.tr
                  key={r.oppId}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-b border-white/10 hover:bg-gray-900/60 transition-all duration-300"
                >
                  {/* Opponent */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {r.ioc && <span className="inline-block w-8 h-5">{getFlagFromIOC(r.ioc)}</span>}
                      <Link
                        href={`/players/${r.oppId}`}
                        className="font-semibold text-white hover:text-purple-400 hover:underline transition"
                      >
                        {r.oppName}
                      </Link>
                    </div>
                  </td>

                  {/* Last Match */}
                  <td className="px-5 py-4 truncate max-w-xs">
                    {last ? (
                      <div className="flex items-center flex-wrap gap-2">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-white text-xs ${
                          last.won ? "bg-emerald-600" : "bg-red-600"
                        }`}>
                          {last.won ? "Won" : "Lost"}
                        </span>
                        <span className="text-gray-400 text-sm">
                          {last.year ?? "-"} • {last.tourney_name ?? "-"} • {last.surface ?? "-"} • {last.round ?? "-"} • {last.score ?? "-"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>

                  <td className="px-5 py-4 text-center font-medium text-xl text-gray-300">{r.matches}</td>

                  {/* WINS */}
                  <td className="px-5 py-4 text-center">
                    <motion.span
                      key={r.wins}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 + r.wins / 50 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="inline-block font-black text-4xl drop-shadow-lg text-emerald-500"
                      style={{ transformOrigin: "center center" }}
                    >
                      {r.wins}
                    </motion.span>
                  </td>

                  {/* LOSSES */}
                  <td className="px-5 py-4 text-center">
                    <motion.span
                      key={r.losses}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 + r.losses / 50 }}
                      transition={{ type: "spring", stiffness: 400 }}
                      className="inline-block font-black text-4xl drop-shadow-lg text-red-600"
                      style={{ transformOrigin: "center center" }}
                    >
                      {r.losses}
                    </motion.span>
                  </td>

                  {/* WIN% BAR */}
                  <td className="px-5 py-4">
                    <div className="flex justify-center">
                      <div className="relative w-36 h-11 bg-gray-800/90 rounded-full overflow-hidden border border-white/20 shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${r.winPct}%` }}
                          transition={{ duration: 1, delay: idx * 0.04, ease: "easeOut" }}
                          className={`h-full ${
                            r.winPct < 50 ? "bg-red-600" :
                            r.winPct > 50 ? "bg-emerald-500" :
                            "bg-amber-500"
                          }`}
                        />
                        <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-white/25 to-transparent pointer-events-none" />
                        <span className="absolute inset-0 flex items-center justify-center font-bold text-white text-base drop-shadow-md">
                          {r.winPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* H2H Button */}
                  <td className="px-5 py-4 text-center">
                    <button
                      onClick={() => goToMatchesVs(r.oppId)}
                      className="group relative inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 rounded-lg font-bold text-white overflow-hidden transition-all duration-300 hover:bg-purple-500 hover:scale-105 hover:shadow-lg hover:shadow-purple-500/40"
                      aria-label={`View matches vs ${r.oppName}`}
                    >
                      <H2HIcon className="w-5 h-5 group-hover:animate-pulse" />
                      <span>H2H</span>
                      <div className="absolute inset-0 bg-white/20 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>

        {paginatedRows.length === 0 && (
          <div className="py-20 text-center text-gray-400 text-lg">
            No opponents found with the selected filters.
          </div>
        )}
      </div>

      <div className="border-t border-white/20 bg-black/80 px-6 py-4">
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>
    </motion.div>
  );
}
