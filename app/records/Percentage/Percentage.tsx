'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface PercentageProps {
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  selectedRounds?: string;
  selectedBestOf?: number | null;
  topWinPercentages?: PlayerPercentage[];
  fetchEnabled?: boolean;
  description?: string;
}

interface PlayerPercentage {
  id: string | number;
  name: string;
  ioc: string;
  winPercentage: number;
  matchesPlayed: number;
}

const Percentage = ({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, topWinPercentages, fetchEnabled, description }: PercentageProps) => {
  const [data, setData] = useState<PlayerPercentage[]>(topWinPercentages || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minMatches, setMinMatches] = useState(1);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();

  // Reset page when filters change
  useEffect(() => setPage(1), [searchParams]);

  // Always fetch from client when filters change (same pattern as OldestMainDraw)
  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach((s) => query.append('surface', s));
        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach((l) => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf != null) query.append('best_of', selectedBestOf.toString());
        query.set('perPage', showModal ? '1000' : '100');
        query.delete('page');

        const url = `/api/records/percentage${query.toString() ? '?' + query.toString() : ''}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error('Failed to fetch percentage data');
        const result = await res.json();
        if (!controller.signal.aborted) {
          setData(result.topWinPercentages || []);
          setError(null);
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error(err);
          if (!controller.signal.aborted) { setData([]); setError(err); }
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, showModal]);

  const filteredData = data.filter(p => p.matchesPlayed >= minMatches);

  const totalPages = Math.ceil(filteredData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = filteredData.slice(start, start + perPage);



  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (error) return <div className="text-center py-8 text-gray-300">Error loading data</div>;
  if (!filteredData.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const renderTable = (rows: PlayerPercentage[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Losses</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            const wins = Math.round((p.winPercentage / 100) * p.matchesPlayed);
            const losses = p.matchesPlayed - wins;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalIdx}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  <Flag ioc={p.ioc} className="w-4 h-3" />
                  <Link href={playerMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-gray-200 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{losses}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.winPercentage.toFixed(2)}%</td>
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

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1 text-gray-200">
          Minimum Matches: {minMatches}
        </label>
        <input
          type="range"
          min={1}
          max={200}
          value={minMatches}
          onChange={(e) => setMinMatches(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Win Percentages">
        {renderTable(filteredData)}
      </Modal>
    </section>
  );
};

export default Percentage;
