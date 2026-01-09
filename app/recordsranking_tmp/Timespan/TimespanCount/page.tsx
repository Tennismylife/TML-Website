"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal"; 

interface RankTimespanItem {
  id: string;
  name: string;
  ioc?: string | null;
  firstDate: string;     // YYYY-MM-DD
  lastDate: string;      // YYYY-MM-DD
  timespanDays: number;  // per ordinamento e confronto
  timespanLabel: string; // "4y 3m 29d"
}

export default function RankTimespan() {
  const [rank, setRank] = useState<number>(1);
  const [rows, setRows] = useState<RankTimespanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/timespan/count?rank=${rank}&limit=200`);
      const data: RankTimespanItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching rank timespan:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    setPage(1);
  }, [rank]);

  const totalPages = Math.ceil(rows.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  const renderTable = (list: RankTimespanItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.firstDate}-${r.lastDate}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {r.ioc && <span className="text-base">{getFlagFromIOC(r.ioc)}</span>}
                  <span>{r.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300" title={`${r.timespanDays} days`}>
                {r.timespanLabel}
              </td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.firstDate}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.lastDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <section className="mb-8">
      {/* Header e selettore */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank (exact):</label>
        <select
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600"
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>No. {i + 1}</option>
          ))}
        </select>

        {/* Titolo centrale */}
        <h2 className="flex-1 text-center text-xl font-semibold text-gray-200">
          Timespan at Rank {rank}
        </h2>

        <button
          onClick={() => setShowModal(true)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {/* Table */}
      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && pageRows.length > 0 && renderTable(pageRows, start)}
      {!loading && pageRows.length === 0 && <div className="text-gray-400 py-4 text-center">No data available.</div>}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={`Timespan at Rank ${rank}`}>
        {renderTable(rows)}
      </Modal>
    </section>
  );
}
