'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: TitleRecord[];
}

type TitleRecord = {
  id: string;
  player_name: string;
  ioc: string | null;
  total_titles: number;
  year: number;
};

export default function TitlesSection({ selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData }: TitlesSectionProps) {
  const enabled = !!fetchEnabled;
  const [topSeasonTitles, setTopSeasonTitles] = useState<TitleRecord[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModalTitles, setShowModalTitles] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();
  const lastRequestRef = useRef<string | null>(null);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces the SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = showModalTitles || (enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setTopSeasonTitles(initialData);
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
        query.set('limit', showModalTitles ? '1000' : '100');
        const url = `/api/records/seasons/titles?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles')
        const data: TitleRecord[] = await res.json();
        setTopSeasonTitles(Array.isArray(data) ? data : []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setTopSeasonTitles([]);
      } finally {
        setLoading(false);
        if (enabled) setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, enabled, fetchRequestId, showModalTitles, initialData, setFetchEnabled]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonTitles.length) return <div className="text-center py-8 text-gray-300 text-lg">No titles found.</div>;

  const totalPages = Math.ceil(topSeasonTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonTitles.slice(start, start + perPage);

 

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center justify-center gap-2 text-lg text-gray-200">
                  {p.ioc && <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />} 
                  <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">
                  <Link href={`/players/${encodeURIComponent((p as any).slug ?? String(p.id))}/season/${p.year}`} className="hover:underline">{p.year}</Link>
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
          onClick={() => setShowModalTitles(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal
        show={showModalTitles}
        onClose={() => setShowModalTitles(false)}
        title="Top Titles in a Single Season"
      >
        {renderTable(topSeasonTitles)}
      </Modal>
    </section>
  );
}
