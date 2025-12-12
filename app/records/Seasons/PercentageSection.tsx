'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '../Modal';

interface PercentageSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

type PercentageRecord = {
  Player: string;
  PlayerId: string | number;
  ioc: string | null;
  Percentage: string;
  Wins: number;
  Total: number;
  Year: number;
};

export default function PercentageSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: PercentageSectionProps) {
  const [seasonPercentageData, setSeasonPercentageData] = useState<PercentageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const fetchSeasonPercentage = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('tourney_level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');

        const res = await fetch(`/api/records/seasons/percentage?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch season percentage');

        const data: PercentageRecord[] = await res.json();
        setSeasonPercentageData(data);
      } catch (err) {
        console.error(err);
        setSeasonPercentageData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSeasonPercentage();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!seasonPercentageData.length) return <div className="text-center py-8 text-gray-300 text-lg">No data found.</div>;

  const totalPages = Math.ceil(seasonPercentageData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = seasonPercentageData.slice(start, start + perPage);

  const getPlayerLink = (playerId: string | number) => `/players/${playerId}?tab=matches`;

  const renderTable = (data: PercentageRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Percentage</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Total</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(player.ioc) ?? '';
            return (
              <tr key={`${player.Player}-${player.Year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(player.PlayerId)} className="hover:underline">
                    {player.Player}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Percentage}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{player.Total}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/seasons/${player.Year}`} className="hover:underline">{player.Year}</Link>
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

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Top Win Percentage in a Single Season"
      >
        {renderTable(seasonPercentageData)}
      </Modal>
    </section>
  );
}
