'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

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
  const [topSameTournamentTitles, setTopSameTournamentTitles] = useState<TitleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const searchParams = useSearchParams();

  // Reset page when filters change
  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  // Fetch data
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
        const fetchedData: TitleRecord[] = await res.json();
        setTopSameTournamentTitles(fetchedData || []);
      } catch (err) {
        console.error(err);
        setTopSameTournamentTitles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!topSameTournamentTitles.length) return <div className="text-center py-8 text-gray-300">No titles found.</div>;

  const totalPages = Math.ceil(topSameTournamentTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topSameTournamentTitles.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (data: TitleRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Titles</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.tourney_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={getPlayerLink(String(p.player_id))} className="text-indigo-300 hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.total_titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-300">
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top Titles in the Same Tournament</h2>
      {renderTable(currentData, start)}
      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
