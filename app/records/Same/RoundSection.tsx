'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface SameRoundSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRound: string; // stringa singola
}

type RoundEntryRecord = {
  tourney_name: string;
  player_id: string;
  player_name: string;
  total_rounds: number;
  ioc: string | null;
};

export default function SameRoundSection({ selectedSurfaces, selectedLevels, selectedRound }: SameRoundSectionProps) {
  const [entries, setEntries] = useState<RoundEntryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRound]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRound) query.append('round', selectedRound);

        const res = await fetch(`/api/records/same/rounds?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data: RoundEntryRecord[] = await res.json();
        setEntries(data || []);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRound]);

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = showAll ? entries : entries.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (data: RoundEntryRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = showAll ? idx + 1 : startIndex + idx + 1;
            return (
              <tr key={`${p.player_id}-${p.tourney_name}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={getPlayerLink(p.player_id)} className="text-indigo-300 hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.total_rounds}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-300">{p.tourney_name}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!entries.length) return <div className="text-center py-8 text-gray-300">No players found.</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Top {selectedRound ? selectedRound : '(Select a round)'} Reached in the Same Tournament
      </h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { setShowAll(!showAll); if (showAll) setPage(1); }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? "Show Paginated" : "Show All"}
        </button>
      </div>

      {renderTable(currentData, start)}

      {!showAll && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
