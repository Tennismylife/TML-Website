'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { iocToIso2, flagEmoji } from "../../../utils/flags";
import Pagination from "../../../components/Pagination";

interface RoundsProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  minEntries: number;
}

interface PlayerStat {
  id: string;
  name: string;
  ioc?: string;
  wins: number;
  entries: number;
  percentage: number;
}

export default function Rounds({ selectedSurfaces, selectedLevels, selectedRounds, minEntries }: RoundsProps) {
  const [data, setData] = useState<PlayerStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 10;

  useEffect(() => {
    if (!selectedRounds) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));

        const queryString = query.toString();
        const url =
          `/api/records/roundsonentries/rounds?round=${selectedRounds}` +
          (queryString ? `&${queryString}` : "");

        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json.FinalWins || []);
        setPage(1); // reset pagina
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRounds, Array.from(selectedSurfaces).join(","), Array.from(selectedLevels).join(",")]);

  // Filter data based on minEntries
  const filteredData = data.filter(p => p.entries >= minEntries);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!filteredData.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentData = filteredData.slice(start, start + perPage);

  const renderTable = (players: PlayerStat[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Entries</th>
            <th className="border border-white/30 px-4 py-2 text-right text-lg text-gray-200">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={`/players/${p.id}`} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.entries}</td>
                <td className="border border-white/10 px-4 py-2 text-right text-lg text-gray-200">
                  {p.percentage.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div
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
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="All Players">
        {renderTable(filteredData)}
      </Modal>
    </section>
  );
}
