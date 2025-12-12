'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Pagination from "../../../components/Pagination";
import Modal from "../Modal";
import { getFlagFromIOC } from "@/lib/utils";

interface WinsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

interface Winner {
  winner_id: string;
  player_name: string;
  ioc?: string;
  total_wins: number;
  tourney_id: string;
  tourney_name: string;
}

export default function WinsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: WinsSectionProps) {
  const [allWinners, setAllWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');

        const url = `/api/records/same/wins?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch wins');
        const data = await res.json();
        setAllWinners(data || []);
      } catch (err) {
        console.error(err);
        setAllWinners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!allWinners.length) return <div className="text-center py-8 text-gray-300 text-lg">No wins found.</div>;

  const totalPages = Math.ceil(allWinners.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allWinners.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => `/players/${playerId}?tab=matches`;

  const renderTable = (data: Winner[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = p.ioc ? getFlagFromIOC(p.ioc) : null;
            return (
              <tr key={`${p.winner_id}-${p.tourney_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.winner_id)} className="hover:underline">
                    {p.player_name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={`/tournaments/${p.tourney_id}`} className="hover:underline">{p.tourney_name}</Link>
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
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Wins in the Same Tournament">
        {renderTable(allWinners)}
      </Modal>
    </section>
  );
}
