"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { flagEmoji, iocToIso2 } from "@/utils/flags";

interface YearEndMaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  year: number | string;
}

export default function No1YearEndMaxPointsRanking() {
  const [rows, setRows] = useState<YearEndMaxPointsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  const fetchRows = async () => {
    setLoading(true);
    try {
      // ✅ chiama la nuova API year-end
      const res = await fetch(`/api/recordsranking/mostpoints/endoftheseason`);
      const data: YearEndMaxPointsItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching year-end max points ranking:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const totalCount = rows.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = rows.slice(start, start + perPage);

  const renderTable = (list: YearEndMaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.name}-${r.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {r.country && <span className="text-base">{flagEmoji(iocToIso2(r.country))}</span>}
                  <span>{r.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {r.points.toLocaleString()}
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">
        Most ATP Points (Year-End)
      </h2>

      {/* Pulsante View All */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && paginatedRows.length > 0 && renderTable(paginatedRows, start)}
      {!loading && paginatedRows.length === 0 && (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Full Year-End Ranking</h2>
            {renderTable(rows)}
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
