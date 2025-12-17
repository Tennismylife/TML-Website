"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal";

interface No1MaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  date: string;
}

export default function No1MaxPointsRanking() {
  const [rows, setRows] = useState<No1MaxPointsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/mostpoints/overall`);
      const data: No1MaxPointsItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching No.1 max points ranking:", err);
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

  const renderTable = (list: No1MaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.name}-${r.date}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {r.country && <span className="text-base">{getFlagFromIOC(r.country)}</span>}
                  <span>{r.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {r.points.toLocaleString()}
              </td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">
        Most ATP Points
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
      <Modal show={showModal} onClose={() => setShowModal(false)} title={`Full Ranking`}>
        {renderTable(rows)}
      </Modal>
    </section>
  );
}