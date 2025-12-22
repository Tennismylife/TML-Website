'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import { playerMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '../Modal';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
}

type TitleRecord = {
  id: string;
  player_name: string;
  ioc: string | null;
  total_titles: number;
  year: number;
};

export default function TitlesSection({ selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled }: TitlesSectionProps) {
  const [topSeasonTitles, setTopSeasonTitles] = useState<TitleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModalTitles, setShowModalTitles] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const enabled = !!fetchEnabled;
    if (!enabled && !showModalTitles) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        const url = `/api/records/seasons/titles?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles')
        const data: TitleRecord[] = await res.json();
        setTopSeasonTitles(data || []);
      } catch (err) {
        console.error(err);
        setTopSeasonTitles([]);
      } finally {
        setLoading(false);
        setFetchEnabled?.(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, fetchEnabled, setFetchEnabled, showModalTitles]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!topSeasonTitles.length) return <div className="text-center py-8 text-gray-300 text-lg">No titles found.</div>;

  const totalPages = Math.ceil(topSeasonTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSeasonTitles.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => playerMatchesUrl(playerId);

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? '';
            return (
              <tr key={`${p.id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.id)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_titles}</td>
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
