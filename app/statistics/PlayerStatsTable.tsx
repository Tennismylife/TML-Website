"use client";

import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { iocToIso2, flagEmoji } from "../../utils/flags";
interface PlayerStatsTableProps {
  stat: string;
  playerStats: any[];
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  limit: number;
  minMatches: number;
}

const percentStats = [
  "1stserve",
  "1stservewon",
  "2ndservewon",
  "servicewon",
  "bpsaved",
  "1streturnwon",
  "2ndreturnwon",
  "returnwon",
  "bpwon",
  "totalpointswonpct",
  "gameswonpct",
  "tiebreakswonpct",
  "setswonpct",
];

export default function PlayerStatsTable({
  stat,
  playerStats,
  page,
  setPage,
  limit,
  minMatches,
}: PlayerStatsTableProps) {
  const filteredPlayers = playerStats.filter((p) => p.matches >= minMatches);
  const totalPages = Math.max(1, Math.ceil(filteredPlayers.length / limit));
  const paginatedPlayers = filteredPlayers.slice((page - 1) * limit, page * limit);

  const formatStat = (stat: string, value: number) =>
    percentStats.includes(stat) ? `${value.toFixed(1)}%` : value;

  return (
    <section className="mt-8">
      <div className="overflow-x-auto rounded border border-gray-700 bg-gray-800">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="border border-gray-600 px-2 py-2 text-left w-16 text-white">Rank</th>
              <th className="border border-gray-600 px-2 py-2 text-left w-64 text-white">Player</th>
              <th className="border border-gray-600 px-2 py-2 text-right w-20 text-white">Matches</th>
              <th className="border border-gray-600 px-2 py-2 text-right w-20 text-white">{stat}</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPlayers.map((p, idx) => {
              const flag = flagEmoji(iocToIso2(p.ioc)) ?? "🏳️";
              return (
                <tr key={p.id} className="hover:bg-gray-700 border-b border-gray-600">
                  <td className="border border-gray-600 px-2 py-2 text-center w-16 text-white">
                    {(page - 1) * limit + idx + 1}
                  </td>
                  <td className="border border-gray-600 px-2 py-2 w-64 text-white">
                    <div className="flex items-center gap-1">
                      <span className="text-sm">{flag}</span>
                      <Link
                        href={`/players/${encodeURIComponent(p.id)}`}
                        className="text-blue-400 hover:underline text-sm truncate"
                      >
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-gray-600 px-2 py-2 text-right w-20 text-white">{p.matches}</td>
                  <td className="border border-gray-600 px-2 py-2 text-right w-20 text-white">
                    {formatStat(stat, p.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
          className="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
        >
          Prev
        </button>
        <span className="text-white">
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page === totalPages}
          className="px-3 py-1 border border-gray-600 rounded bg-gray-700 text-white disabled:opacity-50 hover:bg-gray-600"
        >
          Next
        </button>
      </div>
    </section>
  );
}
