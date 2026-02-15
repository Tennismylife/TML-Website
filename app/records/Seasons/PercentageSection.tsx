'use client'

import { useState, useEffect, useRef } from 'react';
import Flag from '@/components/Flag';
import Link from 'next/link';
import { playerMatchesUrl } from "../nav";
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface PercentageSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: PercentageRecord[];
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

export default function PercentageSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: PercentageSectionProps) {
  const enabled = !!fetchEnabled;
  const [seasonPercentageData, setSeasonPercentageData] = useState<PercentageRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  // Reusable fetch function so we can attempt a one-time retry when the
  // component mounts with no data (defensive fix so UI doesn't stay empty).
  const lastRequestRefLocal = lastRequestRef; // keep name used below
  const doFetch = async (forceLimit?: number) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('tourney_level', l));
      if (selectedRounds) query.append('round', selectedRounds);
      if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
      query.set('limit', String(typeof forceLimit === 'number' ? forceLimit : (showModal ? 1000 : 100)));

      const url = `/api/records/seasons/percentage?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch season percentage');

      const data: PercentageRecord[] = await res.json();
      setSeasonPercentageData(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (err) {
      console.error(err);
      setSeasonPercentageData([]);
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModal || (enabled && fetchRequestId && lastRequestRefLocal.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setSeasonPercentageData(initialData);
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRefLocal.current = fetchRequestId;
    doFetch();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, enabled, fetchRequestId, showModal, initialData, setFetchEnabled]);

  // Defensive one-time retry: if after mount we still have no data, attempt
  // a single client fetch (covers cases where SSR prefetch returned empty and
  // for some reason `fetchEnabled` was not true). This prevents the page from
  // permanently displaying "No data".
  const attemptedRetryRef = useRef(false);
  useEffect(() => {
    if (attemptedRetryRef.current) return;
    if (loading) return;
    if (Array.isArray(seasonPercentageData) && seasonPercentageData.length === 0) {
      attemptedRetryRef.current = true;
      doFetch();
    }
  }, [loading, seasonPercentageData]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!seasonPercentageData.length) return <div className="text-center py-8 text-gray-300 text-lg">No data found.</div>;

  const totalPages = Math.ceil(seasonPercentageData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = seasonPercentageData.slice(start, start + perPage);

 

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
            return (
              <tr key={`${player.Player}-${player.Year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {player.ioc ? <Flag ioc={player.ioc} className="w-4 h-3" /> : <span className="text-base">🏳️</span>}
                  <Link href={playerMatchesUrl((player as any).slug ?? String(player.PlayerId), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">
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
