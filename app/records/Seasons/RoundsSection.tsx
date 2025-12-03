'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface RoundsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string; // puoi modificare a string[] se vuoi supporto multi-round
}

interface SeasonRoundRecord {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_rounds: number;
}

export default function RoundsSection({ selectedSurfaces, selectedLevels, selectedRounds }: RoundsSectionProps) {
  const [topSeasonRounds, setTopSeasonRounds] = useState<SeasonRoundRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const perPage = 10;
  const searchParams = useSearchParams();

  const roundOptions = [
    { value: 'R128', label: 'Round of 128' },
    { value: 'R64', label: 'Round of 64' },
    { value: 'R32', label: 'Round of 32' },
    { value: 'R16', label: 'Round of 16' },
    { value: 'QF', label: 'Quarterfinals' },
    { value: 'SF', label: 'Semifinals' },
    { value: 'F', label: 'Final' },
  ];

  // Reset page on filter change
  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);

        const res = await fetch(`/api/records/seasons/rounds?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch rounds');

        const data: SeasonRoundRecord[] = await res.json();
        setTopSeasonRounds(data);
      } catch (err) {
        console.error(err);
        setTopSeasonRounds([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  const totalPages = Math.ceil(topSeasonRounds.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = showAll ? topSeasonRounds : topSeasonRounds.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const selectedRoundLabel = roundOptions.find(r => r.value === (selectedRounds || 'F'))?.label || 'Final';

  const renderTable = (data: SeasonRoundRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={getPlayerLink(String(p.player_id))} className="text-indigo-300 hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-300">
                  <Link href={`/seasons/${p.year}`} className="hover:underline">{p.year}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!topSeasonRounds.length) return <div className="text-center py-8 text-gray-300">No rounds found.</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top {selectedRoundLabel} Reached in a Single Season</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { const newShowAll = !showAll; setShowAll(newShowAll); if (!newShowAll) setPage(1); }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? "Show Paginated" : "Show All"}
        </button>
      </div>

      {renderTable(currentData, start)}

      {!showAll && totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
