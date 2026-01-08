'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface RoundsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: SeasonRoundRecord[];
}

interface SeasonRoundRecord {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_rounds: number;
}

export default function RoundsSection({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: RoundsSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSeasonRounds, setTopSeasonRounds] = useState<SeasonRoundRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModalRounds, setShowModalRounds] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    if (!selectedRounds) {
      setTopSeasonRounds([]);
      setLoading(false);
      return;
    }

    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModalRounds);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSeasonRounds(initialData);
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
        query.set('limit', showModalRounds ? '1000' : '100');

        const url = `/api/records/seasons/rounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds')
        const data: SeasonRoundRecord[] = await res.json();
        setTopSeasonRounds(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setTopSeasonRounds([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, fetchRequestId, showModalRounds, initialData, setFetchEnabled]);

  if (!selectedRounds) return <div className="text-center py-8 text-gray-300 text-lg">Please select a round to view results.</div>;
  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonRounds.length) return <div className="text-center py-8 text-gray-300 text-lg">No rounds found.</div>;

  const totalPages = Math.ceil(topSeasonRounds.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonRounds.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    const params: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      if (key === 'tab') continue;
      params[key] = value;
    }
    const query = new URLSearchParams(params).toString();
    return `/players/${playerId}/matches${query ? `?${query}` : ''}`;
  };

  const renderTable = (data: SeasonRoundRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? '';
            return (
              <tr key={`${p.player_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.player_id)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
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
      {description && (
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h1>
      )}

      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowModalRounds(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalRounds}
        onClose={() => setShowModalRounds(false)}
        title={`Top ${selectedRounds} Reached in a Single Season`}
      >
        {renderTable(topSeasonRounds)}
      </Modal>
    </section>
  );
}
