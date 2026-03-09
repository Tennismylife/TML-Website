'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerMatchesUrl } from "../nav";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface SameRoundSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRound: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (enabled: boolean) => void;
  description?: string;
  fetchRequestId?: string | null;
  initialData?: RoundEntryRecord[];
}

type RoundEntryRecord = {
  tourney_name: string;
  player_id: string;
  player_name: string;
  total_rounds: number;
  ioc: string | null;
};

export default function SameRoundSection({ selectedSurfaces, selectedLevels, selectedRound, fetchEnabled, setFetchEnabled, description, fetchRequestId, initialData }: SameRoundSectionProps) {
  const enabled = !!fetchEnabled;
  const [entries, setEntries] = useState<RoundEntryRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRound]);

  useEffect(() => {
    if (!selectedRound) {
      setEntries([]);
      setLoading(false);
      return;
    }

    // Trigger client fetch on mount when SSR provided `initialData` so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setEntries(initialData);
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
        if (selectedRound) query.append('round', selectedRound);
        query.set('limit', showModal ? '1000' : '100');

        const url = `/api/records/same/rounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data: RoundEntryRecord[] = await res.json();
        setEntries(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRound, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  if (!selectedRound) return <div className="text-center py-8 text-gray-300 text-lg">Please select a round to view results.</div>;
  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!entries.length) return <div className="text-center py-8 text-gray-300 text-lg">No players found.</div>;

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = entries.slice(start, start + perPage);

 

  const renderTable = (data: RoundEntryRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.tourney_name}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {p.ioc && <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />}
                  <Link href={playerMatchesUrl((p as any).slug ?? String(p.player_id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{p.tourney_name}</td>
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
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
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
        title={`Top ${selectedRound} Reached in the Same Tournament`}
      >
        {renderTable(entries)}
      </Modal>
    </section>
  );
}
