'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface EntriesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface PlayerEntry {
  id: string;
  name: string;
  ioc: string;
  ages: Record<string, number>;
}

export default function EntriesSection({ selectedSurfaces, selectedLevels }: EntriesSectionProps) {
  const [data, setData] = useState<PlayerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedAgeDays, setSelectedAgeDays] = useState(25 * 365 + 23);
  const searchParams = useSearchParams();
  const perPage = 10;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedAgeDays]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));

    const url = `/api/records/atage/entries?${query.toString()}`;
    setLoading(true);

    fetch(url)
      .then(res => res.json())
      .then(fetchedData => {
        const normalized = fetchedData.map((p: any) => ({
          id: p.id,
          name: p.name || p.player,
          ioc: p.ioc || '',
          ages: p.ages || p.entries || {},
        }));
        setData(normalized);
      })
      .catch(err => { console.error(err); setError(err); })
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels]);

  const maxAge = selectedAgeDays / 365;

  const filteredData = useMemo(() => {
    return data
      .map(player => {
        const agesInRange = Object.entries(player.ages)
          .filter(([ageStr]) => parseFloat(ageStr) <= maxAge)
          .map(([, count]) => Number(count));

        const maxEntries = agesInRange.length > 0 ? Math.max(...agesInRange) : 0;
        return { ...player, count: maxEntries };
      })
      .filter(p => p.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [data, maxAge]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const start = (page - 1) * perPage;
  const currentData = showAll ? filteredData : filteredData.slice(start, start + perPage);

  const years = Math.floor(selectedAgeDays / 365);
  const days = selectedAgeDays % 365;

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=entries`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  if (error) return <div className="text-red-600">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!filteredData.length) return <div className="text-center py-8 text-gray-300">No data found.</div>;

  const renderTable = (dataToRender: typeof filteredData, startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Entries</th>
          </tr>
        </thead>
        <tbody>
          {dataToRender.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                  <Link href={getPlayerLink(String(p.id))} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.count}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top Entries at Age</h2>

      <div className="mb-4 flex gap-4 items-center">
        <label className="flex items-center gap-2 flex-1 text-gray-200">
          Max Age for Entries: {years}y {days}d
          <input
            type="range"
            min={0}
            max={50*365}
            value={selectedAgeDays}
            onChange={(e) => setSelectedAgeDays(Number(e.target.value))}
            className="w-full"
          />
        </label>
      </div>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => { const newShowAll = !showAll; setShowAll(newShowAll); if (!newShowAll) setPage(1); }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? "Show Paginated" : "Show All"}
        </button>
      </div>

      {renderTable(currentData, start)}

      {!showAll && filteredData.length > perPage && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
