'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRound: string;
}

interface PlayerRound {
  id: string;
  name: string;
  ioc: string;
  ages: number[];
  count: number;
}

export default function RoundSection({ selectedSurfaces, selectedLevels, selectedRound }: RoundSectionProps) {
  const [playerAges, setPlayerAges] = useState<Record<string, number[]>>({});
  const [playerInfo, setPlayerInfo] = useState<Record<string, { name: string; ioc: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedAgeDays, setSelectedAgeDays] = useState(25 * 365 + 23);
  const perPage = 10;
  const searchParams = useSearchParams();

  const formatAge = (ageDecimal: number) => {
    const years = Math.floor(ageDecimal);
    const months = Math.floor((ageDecimal - years) * 12);
    return { years, months };
  };

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedAgeDays]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    query.append('round', selectedRound);

    const url = `/api/records/atage/rounds?${query.toString()}`;
    setLoading(true);

    fetch(url)
      .then(res => res.json())
      .then(json => {
        setPlayerAges(json.playerAges || {});
        setPlayerInfo(json.playerInfo || {});
      })
      .catch(err => { console.error(err); setError(err); })
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRound]);

  const maxAgeFromData = useMemo(() => {
    const allAges = Object.values(playerAges).flatMap(arr => arr);
    return allAges.length > 0 ? Math.ceil(Math.max(...allAges) * 365) : 50 * 365;
  }, [playerAges]);

  const maxAge = selectedAgeDays / 365;

  const filteredData: PlayerRound[] = useMemo(() => {
    return Object.entries(playerAges)
      .map(([id, ages]) => {
        const agesInRange = ages.filter(a => a <= maxAge);
        const count = agesInRange.length;
        if (count === 0) return null;
        const info = playerInfo[id] || { name: id, ioc: '' };
        return { id, name: info.name, ioc: info.ioc, ages, count };
      })
      .filter(Boolean) as PlayerRound[];
  }, [playerAges, playerInfo, maxAge]);

  const sortedData = useMemo(() => filteredData.sort((a, b) => b.count - a.count), [filteredData]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const start = (page - 1) * perPage;
  const currentData = showAll ? sortedData : sortedData.slice(start, start + perPage);

  const { years, months } = formatAge(maxAge);

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=rounds`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'tab') link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  if (error) return <div className="text-red-600">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;

  const renderTable = (dataToRender: PlayerRound[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rounds</th>
          </tr>
        </thead>
        <tbody>
          {dataToRender.map((p, idx) => {
            const rank = showAll ? idx + 1 : start + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                  <Link href={getLink(p.id)} className="text-indigo-300 hover:underline">{p.name}</Link>
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Rounds at Age ({selectedRound})</h2>

      <div className="mb-4 flex gap-4 items-center">
        <label className="flex items-center gap-2 flex-1 text-gray-200">
          Max Age: {years}y {months}m
          <input
            type="range"
            min={0}
            max={maxAgeFromData}
            value={selectedAgeDays}
            onChange={e => setSelectedAgeDays(Number(e.target.value))}
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

      {renderTable(currentData)}

      {!showAll && sortedData.length > perPage && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
