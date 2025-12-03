'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface PercentageSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

export default function PercentageSection({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: PercentageSectionProps) {
  const [seasonPercentageData, setSeasonPercentageData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const fetchSeasonPercentage = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('tourney_level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf.toString());

        const res = await fetch(`/api/records/seasons/percentage?${query.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch season percentage');

        const fetchedData = await res.json();
        setSeasonPercentageData(fetchedData);
      } catch (err) {
        console.error(err);
        setSeasonPercentageData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSeasonPercentage();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  const totalPages = Math.ceil(seasonPercentageData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = showAll ? seasonPercentageData : seasonPercentageData.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (data: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Percentage</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Total</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {data.map((player, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${player.Player}-${player.Year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(player.ioc)) || ""}</span>
                  <Link href={getPlayerLink(String(player.Player))} className="text-indigo-300 hover:underline">{player.Player}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{player.Percentage}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{player.Wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{player.Total}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-300">
                  <Link href={`/seasons/${player.Year}`} className="hover:underline">{player.Year}</Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!seasonPercentageData.length) return <div className="text-center py-8 text-gray-300">No data found.</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top Win Percentage in a Single Season (min. 10 matches)</h2>

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
