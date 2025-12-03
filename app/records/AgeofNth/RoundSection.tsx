'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import NthInput from './NthInput';

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string | string[];
}

interface PlayerRound {
  id: string;
  name: string;
  ioc: string;
  nthAge: number;
  count: number;
}

export default function RoundSection({ selectedSurfaces, selectedLevels, selectedRounds }: RoundSectionProps) {
  const [playerAges, setPlayerAges] = useState<Record<string, number[]>>({});
  const [playerInfo, setPlayerInfo] = useState<Record<string, { name: string; ioc: string }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedN, setSelectedN] = useState(1);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedN]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('level', l));
    const roundsArr = Array.isArray(selectedRounds)
      ? selectedRounds.filter(Boolean)
      : selectedRounds ? [selectedRounds] : [];
    roundsArr.forEach(r => query.append('round', r));

    const url = `/api/records/ageofnth/rounds?${query.toString()}`;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(json => {
        setPlayerAges(json.playerAges || {});
        setPlayerInfo(json.playerInfo || {});
      })
      .catch(err => { setError(err); })
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  const filteredData: PlayerRound[] = useMemo(() => {
    return Object.entries(playerAges)
      .map(([id, ages]) => {
        if (ages.length < selectedN) return null;
        const sortedAges = [...ages].sort((a, b) => a - b);
        const nthAge = sortedAges[selectedN - 1];
        const info = playerInfo[id] || { name: id, ioc: '' };
        return { id, name: info.name, ioc: info.ioc, nthAge, count: ages.length };
      })
      .filter(Boolean) as PlayerRound[];
  }, [playerAges, playerInfo, selectedN]);

  const sortedData = useMemo(() => filteredData.sort((a, b) => a.nthAge - b.nthAge), [filteredData]);
  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const start = (page - 1) * perPage;
  const currentData = showAll ? sortedData : sortedData.slice(start, start + perPage);

  const formatAge = (ageDecimal: number) => {
    const years = Math.floor(ageDecimal);
    const months = Math.floor((ageDecimal - years) * 12);
    return `${years}y ${months}m`;
  };

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=rounds`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
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
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Nth Round Age</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Times Reached</th>
          </tr>
        </thead>
        <tbody>
          {dataToRender.map((p, idx) => {
            const globalRank = showAll ? idx + 1 : start + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                  <Link href={getLink(String(p.id))} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{formatAge(p.nthAge)}</td>
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Age at Nth Round Reached ({Array.isArray(selectedRounds) ? selectedRounds.join(', ') : selectedRounds})
      </h2>

      <div className="mb-4 flex justify-end gap-4">
        <NthInput label="Nth:" value={selectedN} onChange={v => setSelectedN(Math.max(1, Number(v) || 1))} min={1} />
        <button
          onClick={() => { const newShowAll = !showAll; setShowAll(newShowAll); if (!newShowAll) setPage(1); }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? "Show Paginated" : "Show All"}
        </button>
      </div>

      {sortedData.length === 0 ? (
        <p className="text-center py-8 text-gray-300">No data available for this N.</p>
      ) : (
        renderTable(currentData)
      )}

      {!showAll && totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
