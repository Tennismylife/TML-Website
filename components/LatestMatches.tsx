"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getFlagFromIOC, getTourneyHref } from "@/lib/utils";

interface Match {
  id: string | number;
  tourney_id?: string | null;
  tourney_name?: string | null;
  tourney_date?: string | null;
  round?: string | null;
  winner_id?: string | number | null;
  winner_name?: string | null;
  winner_ioc?: string | null;
  loser_id?: string | number | null;
  loser_name?: string | null;
  loser_ioc?: string | null;
  score?: string | null;
  year?: number | null;
}

export default function LatestMatches() {
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMatchesLoading(true);

    fetch("/api/matches/latest")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setRecentMatches(Array.isArray(data) ? data : []);
      })
      .catch((err) => console.error("Error fetching latest matches:", err))
      .finally(() => !cancelled && setMatchesLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-amber-400">📅</span>
          <h2 className="text-base font-semibold text-gray-100">
            Latest Matches
          </h2>
        </div>
        <span className="text-xs text-gray-400">
          Showing last 10 matches
        </span>
      </div>

      {/* Loading */}
      {matchesLoading ? (
        <div className="animate-pulse">
          <div className="h-3 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-black">
                <th className="border border-white/30 px-3 py-1.5 text-left text-gray-200">
                  Date
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-left text-gray-200">
                  Tournament
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Round
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-left text-gray-200">
                  Winner
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-left text-gray-200">
                  Loser
                </th>
                <th className="border border-white/30 px-3 py-1.5 text-center text-gray-200">
                  Score
                </th>
              </tr>
            </thead>

            <tbody>
              {recentMatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-4 text-center text-sm text-gray-400"
                  >
                    No recent matches available
                  </td>
                </tr>
              ) : (
                recentMatches.map((m) => {
                  const tourneyId = m.tourney_id ?? null;
                  const winnerFlag = getFlagFromIOC(m.winner_ioc) ?? "";
                  const loserFlag = getFlagFromIOC(m.loser_ioc) ?? "";

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-gray-800 border-b border-white/10"
                    >
                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.tourney_date
                          ? new Date(m.tourney_date).toLocaleDateString()
                          : "-"}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-gray-200">
                        {m.tourney_name ? (
                          tourneyId ? (
                            <Link
                              href={getTourneyHref({ id: tourneyId, year: m.year })}
                              className="text-indigo-300 hover:underline"
                            >
                              {m.tourney_name}
                            </Link>
                          ) : (
                            m.tourney_name
                          )
                        ) : (
                          "-"
                        )}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.round || "-"}
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-gray-200">
                        <div className="flex items-center gap-2">
                          {winnerFlag && (
                            <span
                              className="text-xs"
                              title={m.winner_ioc || undefined}
                            >
                              {winnerFlag}
                            </span>
                          )}
                          {m.winner_name ? (
                            <Link
                              href={`/players/${encodeURIComponent(
                                String(m.winner_id || m.winner_name)
                              )}`}
                              className="text-indigo-300 hover:underline"
                            >
                              {m.winner_name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-gray-200">
                        <div className="flex items-center gap-2">
                          {loserFlag && (
                            <span
                              className="text-xs"
                              title={m.loser_ioc || undefined}
                            >
                              {loserFlag}
                            </span>
                          )}
                          {m.loser_name ? (
                            <Link
                              href={`/players/${encodeURIComponent(
                                String(m.loser_id || m.loser_name)
                              )}`}
                              className="text-indigo-300 hover:underline"
                            >
                              {m.loser_name}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </div>
                      </td>

                      <td className="border border-white/10 px-3 py-1.5 text-center text-gray-200">
                        {m.score || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
