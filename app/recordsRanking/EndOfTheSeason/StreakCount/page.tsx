"use client";

import { useState, useEffect } from "react";
import { flagEmoji, iocToIso2 } from "@/utils/flags";
import Pagination from "@/components/Pagination";

interface PlayerStreak {
  id: string;
  name: string;
  ioc?: string | null;
  longestStreak: number;
  seasons: number[]; // anni della striscia più lunga
  // streaks?: { length: number; seasons: number[] }[]; // se in futuro usi includeAll=1
}

export default function EoyRankStreaks() {
  const [players, setPlayers] = useState<PlayerStreak[]>([]);
  const [rank, setRank] = useState<number>(1); // numero esatto
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  const fetchPlayers = async (selectedRank: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/endofseason/streakcount?rank=${selectedRank}`);
      const data = await res.json();
      setPlayers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching EOY streaks:", err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers(rank);
    setPage(1);
  }, [rank]);

  const totalCount = players.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = players.slice(start, start + perPage);

  const renderTable = (list: PlayerStreak[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Longest Streak at No. {rank}
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Years
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {p.ioc && <span className="text-base">{flagEmoji(iocToIso2(p.ioc))}</span>}
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {p.longestStreak}
              </td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">
                {p.seasons?.length ? p.seasons.join(", ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const Modal = ({
    show,
    onClose,
    title,
    children,
  }: {
    show: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!show) return null;
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          {children}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
      {/* Selezione Rank esatto */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank (exact):</label>
        <select
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600"
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              No. {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* View All */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {/* Tabella */}
      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && paginatedPlayers.length > 0 && renderTable(paginatedPlayers, start)}
      {!loading && paginatedPlayers.length === 0 && (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal View All */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={`EOY Streaks at No. ${rank}`}>
        {renderTable(players)}
      </Modal>
    </section>
  );
}