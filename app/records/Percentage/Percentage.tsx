'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface PercentageProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  selectedBestOf: number | null;
}

interface PlayerPercentage {
  id: string | number;
  name: string;
  ioc: string;
  winPercentage: number;
  matchesPlayed: number;
}

export default function Percentage({ selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: PercentageProps) {
  const [data, setData] = useState<PlayerPercentage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [minMatches, setMinMatches] = useState(1);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append('surface', s));
        selectedLevels.forEach((l) => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        if (selectedBestOf) query.append('best_of', selectedBestOf.toString());
        const url = `/api/records/percentage${query.toString() ? '?' + query.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch percentage data');
        const result = await res.json();
        setData(result.topWinPercentages || []);
      } catch (err) {
        console.error(err);
        setData([]);
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  const filteredData = data.filter(p => p.matchesPlayed >= minMatches);

  const totalPages = Math.ceil(filteredData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = filteredData.slice(start, start + perPage);

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-indigo-300">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            const wins = Math.round((p.winPercentage / 100) * p.matchesPlayed);
            const losses = p.matchesPlayed - wins;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-400 font-semibold">{globalIdx}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={getLink(String(p.id))} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{losses}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300 font-semibold">{p.winPercentage.toFixed(2)}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top Win Percentages</h2>

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

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
    </section>
  );
}
