'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface WinsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
}

type WinRecord = {
  winner_id: string;
  player_name: string;
  ioc: string | null;
  total_wins: number;
  year: number;
};

export default function WinsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description }: WinsSectionProps) {
  const [topSameTournamentWins, setTopSameTournamentWins] = useState<WinRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    console.debug('[Seasons Wins] effect', { fetchEnabled, showModal, fetchRequestId, selectedSurfaces: Array.from(selectedSurfaces), selectedLevels: Array.from(selectedLevels), selectedRounds, selectedBestOf });
    const enabled = !!fetchEnabled;
    if (!enabled && !showModal) { console.debug('[Seasons Wins] skipped: not enabled and not modal'); return; }

    if (fetchRequestId) {
      if (lastRequestRef.current === fetchRequestId) {
        console.debug('[Seasons Wins] duplicate fetchRequestId, ignoring', fetchRequestId);
        return;
      }
      console.debug('[Seasons Wins] accepting fetchRequestId', fetchRequestId);
      lastRequestRef.current = fetchRequestId;
    }

    const fetchData = async () => {
      console.debug('[Seasons Wins] fetch start', { fetchRequestId });
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');

        const url = `/api/records/seasons/wins?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch wins')

        const data: WinRecord[] = await res.json();
        console.debug('[Seasons Wins] fetched count', data?.length ?? 0);
        setTopSameTournamentWins(data || []);
      } catch (err) {
        console.error('[Seasons Wins] error fetching', err);
        setTopSameTournamentWins([]);
      } finally {
        setLoading(false);
        console.debug('[Seasons Wins] fetch complete, clearing fetchEnabled');
        setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, showModal]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSameTournamentWins.length) return <div className="text-center py-8 text-gray-300 text-lg">No wins found.</div>;

  const totalPages = Math.ceil(topSameTournamentWins.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSameTournamentWins.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'tab') continue;
      params[key] = value;
    }
    const query = new URLSearchParams(params).toString();
    return `/players/${playerId}/matches${query ? `?${query}` : ''}`;
  };

  const renderTable = (data: WinRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? '';
            return (
              <tr key={`${p.winner_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-grayy-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.winner_id)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{p.year}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {description && (
        <div className="text-center text-4xl font-bold text-gray-200 mb-6">
          {description}
        </div>
      )}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {!showModal && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Top Wins in the Same Season"
      >
        {renderTable(topSameTournamentWins)}
      </Modal>
    </section>
  );
}
