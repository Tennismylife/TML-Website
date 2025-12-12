'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '../Modal';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface TitleRecord {
  player_id: string;
  player_name: string;
  ioc: string;
  total_titles: number;
  tourney_id: string;
  tourney_name: string;
}

export default function TitlesSection({ selectedSurfaces, selectedLevels }: TitlesSectionProps) {
  const [allTitles, setAllTitles] = useState<TitleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        const url = `/api/records/same/titles?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles');
        const data: TitleRecord[] = await res.json();
        setAllTitles(data || []);
      } catch (err) {
        console.error(err);
        setAllTitles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels]);

  if (loading) return <div className="text-center py-8 text-gray-300 text-lg">Loading...</div>;
  if (!allTitles.length) return <div className="text-center py-8 text-gray-300 text-lg">No titles found.</div>;

  const totalPages = Math.ceil(allTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allTitles.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => `/players/${playerId}?tab=matches`;

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) || '';
            return (
              <tr key={`${p.player_id}-${p.tourney_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.player_id)} className="hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={`/tournaments/${p.tourney_id}`} className="hover:underline">{p.tourney_name}</Link>
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Titles in the Same Tournament">
        {renderTable(allTitles)}
      </Modal>
    </section>
  );
}
