"use client";

import { useState } from "react";
import Link from "next/link";
import { iocToIso2, flagEmoji } from "@/utils/flags";
import Pagination from "@/components/Pagination";

export interface Ranking {
  id: string;
  name: string;
  ioc?: string;
  points: number;
  rank: number;
}

interface RankingTableProps {
  rankings: Ranking[];
  perPage?: number;
}

export default function RankingTable({ rankings, perPage = 20 }: RankingTableProps) {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  if (!rankings.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = rankings.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const currentPage = rankings.slice(start, end);

  const renderTable = (list: Ranking[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={`/players/${p.id}`} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {p.points}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="mb-4 flex justify-end">
        {rankings.length > perPage && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        )}
      </div>

      {renderTable(currentPage, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal Full List */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Full Ranking</h2>
            {renderTable(rankings)}
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
