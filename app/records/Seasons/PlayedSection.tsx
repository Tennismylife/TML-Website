'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '..//Modal';

interface PlayedSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

type PlayedRecord = {
  id: string;
  player_name: string;
  ioc: string | null;
  total_played: number;
  year: number;
};

export default function PlayedSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: PlayedSectionProps) {
  const [topSeasonMatches, setTopSeasonMatches] = useState<PlayedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalMatches, setShowModalMatches] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

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
        const res = await fetch(`/api/records/seasons/played?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch matches');
        const data: PlayedRecord[] = await res.json();
        setTopSeasonMatches(data || []);
      } catch (err) {
        console.error(err);
        setTopSeasonMatches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonMatches.length) return <div className="text-center py-8 text-gray-300 text-lg">No matches found.</div>;

  const totalPages = Math.ceil(topSeasonMatches.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonMatches.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => `/players/${playerId}?tab=matches`;

  const renderTable = (data: PlayedRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Played</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? '';
            return (
              <tr key={`${p.id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.id)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_played}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                  <Link href={`/seasons/${p.year}`} className="hover:underline">{p.year}</Link>
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
          onClick={() => setShowModalMatches(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalMatches}
        onClose={() => setShowModalMatches(false)}
        title="Top Matches Played in a Single Season"
      >
        {renderTable(topSeasonMatches)}
      </Modal>
    </section>
  );
}
