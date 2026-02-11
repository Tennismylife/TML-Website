'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';
import { playerMatchesUrl } from '../nav';
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
  initialData?: WinRecord[];
}

type WinRecord = {
  winner_id: string;
  player_name: string;
  ioc: string | null;
  total_wins: number;
  year: number;
};

export default function WinsSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: WinsSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSameTournamentWins, setTopSameTournamentWins] = useState<WinRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSameTournamentWins(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
        query.set('limit', showModal ? '1000' : '100');

        const url = `/api/records/seasons/wins?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch wins')

        const data: WinRecord[] = await res.json();
        setTopSameTournamentWins(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error('[Seasons Wins] error fetching', err);
        setTopSameTournamentWins([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSameTournamentWins.length) return <div className="text-center py-8 text-gray-300 text-lg">No wins found.</div>;

  const totalPages = Math.ceil(topSameTournamentWins.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSameTournamentWins.slice(start, start + perPage);



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
            return (
              <tr key={`${p.winner_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-grayy-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                  <Link href={playerMatchesUrl((p as any).winner_slug ?? String(p.winner_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
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
        <h2 className="mb-6 text-center text-2xl font-semibold text-gray-200">
          {description}
        </h2>
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
