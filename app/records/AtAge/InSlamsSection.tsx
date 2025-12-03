'use client'

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface InSlamsSectionProps {
  selectedSurfaces: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

interface PlayerInfo {
  name: string;
  ioc: string;
}

interface ApiData {
  playerAgeWinsSlams: Record<string, [string, number[]][]>;
  playerInfo: [string, PlayerInfo][];
}

export default function InSlamsSection({ selectedSurfaces, selectedRounds, selectedBestOf }: InSlamsSectionProps) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [selectedAgeDays, setSelectedAgeDays] = useState(25 * 365 + 23);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedRounds, selectedBestOf, selectedAgeDays]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    if (selectedRounds) query.append('round', selectedRounds);
    if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');

    const url = `/api/records/atage/inslams${query.toString() ? '?' + query.toString() : ''}`;

    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(setData)
      .catch(err => { console.error(err); setError(err); })
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedRounds, selectedBestOf]);

  const selectedAge = selectedAgeDays / 365;

  const playerAgeWinsSlams = useMemo(() => {
    if (!data) return {};
    const result: Record<string, Record<string, number[]>> = {};
    for (const slam of ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open']) {
      result[slam] = Object.fromEntries(data.playerAgeWinsSlams[slam] || []);
    }
    return result;
  }, [data]);

  const playerInfo = useMemo(() => {
    if (!data) return {};
    return Object.fromEntries(data.playerInfo || []);
  }, [data]);

  const filteredSlamsData = useMemo(() => {
    const playerIds = new Set<string>();
    for (const slam of Object.values(playerAgeWinsSlams)) {
      Object.keys(slam).forEach(pid => playerIds.add(pid));
    }

    const result: { id: string; name: string; ioc: string; australian: number; french: number; wimbledon: number; us: number; total: number }[] = [];

    for (const playerId of playerIds) {
      const info = playerInfo[playerId];
      if (!info) continue;

      const australianWins = (playerAgeWinsSlams['Australian Open'][playerId] || []).filter(age => age <= selectedAge).length;
      const frenchWins = (playerAgeWinsSlams['Roland Garros'][playerId] || []).filter(age => age <= selectedAge).length;
      const wimbledonWins = (playerAgeWinsSlams['Wimbledon'][playerId] || []).filter(age => age <= selectedAge).length;
      const usWins = (playerAgeWinsSlams['US Open'][playerId] || []).filter(age => age <= selectedAge).length;

      const total = australianWins + frenchWins + wimbledonWins + usWins;
      if (total > 0) {
        result.push({
          id: playerId,
          name: info.name,
          ioc: info.ioc,
          australian: australianWins,
          french: frenchWins,
          wimbledon: wimbledonWins,
          us: usWins,
          total,
        });
      }
    }

    return result.sort((a, b) => b.total - a.total);
  }, [playerAgeWinsSlams, playerInfo, selectedAge]);

  const totalPages = Math.ceil(filteredSlamsData.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = showAll ? filteredSlamsData : filteredSlamsData.slice(start, start + perPage);

  const years = Math.floor(selectedAgeDays / 365);
  const days = selectedAgeDays % 365;

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  if (error) return <div className="text-red-600">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data || !filteredSlamsData.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const renderSlamsTable = (data: typeof filteredSlamsData) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Total</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Australian Open</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Roland Garros</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Wimbledon</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">US Open</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = start + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                  <Link href={getLink(p.id)} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.total}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.australian}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.french}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.wimbledon}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.us}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Wins in Slams at Age</h2>

      <div className="mb-4 flex gap-4 items-center">
        <label className="flex items-center gap-2 flex-1 text-gray-200">
          Max Age: {years}y {days}d
          <input
            type="range"
            min={0}
            max={50*365}
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

      {renderSlamsTable(currentData)}

      {!showAll && filteredSlamsData.length > perPage && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
