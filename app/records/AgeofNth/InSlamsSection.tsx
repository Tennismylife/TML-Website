'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { formatAgeDisplay } from './ageUtils';
import Pagination from '../../../components/Pagination';
import NthInput from './NthInput';

interface InSlamsSectionProps {
  selectedSurfaces: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
}

interface PlayerInfo {
  name: string;
  ioc: string;
}

interface PlayerWin {
  id: string;
  name: string;
  ioc: string;
  age: number;
  Australian: number;
  French: number;
  Wimbledon: number;
  US: number;
}

interface ApiData {
  playerAgeWinsSlams: Record<string, [string, number[]][]>;
  playerInfo: [string, PlayerInfo][];
}

export default function InSlamsSection({ selectedSurfaces, selectedRounds, selectedBestOf }: InSlamsSectionProps) {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [selectedN, setSelectedN] = useState(1);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const perPage = 10;

  useEffect(() => setPage(1), [selectedSurfaces, selectedRounds, selectedBestOf, selectedN]);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    if (selectedRounds) query.append('round', selectedRounds);
    if (selectedBestOf) query.append('best_of', selectedBestOf?.toString() || '');
    const url = `/api/records/ageofnth/inslams${query.toString() ? '?' + query.toString() : ''}`;

    setLoading(true);
    setError(null);
    fetch(url)
      .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedRounds, selectedBestOf]);

  const playersAtNthWin: PlayerWin[] = useMemo(() => {
    if (!data) return [];
    const slamKeyMap: Record<string, keyof PlayerWin> = {
      'Australian Open': 'Australian',
      'Roland Garros': 'French',
      'Wimbledon': 'Wimbledon',
      'US Open': 'US',
    };

    const playerInfo = new Map<string, PlayerInfo>(data.playerInfo || []);
    const playerWinsMap = new Map<string, { wins: { age: number; slam: keyof PlayerWin }[] }>();

    for (const [rawSlam, entries] of Object.entries(data.playerAgeWinsSlams || {})) {
      const slamKey = slamKeyMap[rawSlam] || (rawSlam as keyof PlayerWin);
      for (const [playerId, ages] of entries) {
        if (!playerWinsMap.has(playerId)) playerWinsMap.set(playerId, { wins: [] });
        const pdata = playerWinsMap.get(playerId)!;
        for (const age of ages) pdata.wins.push({ age, slam: slamKey });
      }
    }

    const result: PlayerWin[] = [];
    for (const [playerId, pdata] of playerWinsMap.entries()) {
      if (pdata.wins.length < selectedN) continue;
      const firstNWins = pdata.wins.slice().sort((a, b) => a.age - b.age).slice(0, selectedN);
      const nthAge = firstNWins[selectedN - 1].age;

      const counts: Record<keyof PlayerWin, number> = { id: 0 as any, name: 0 as any, ioc: 0 as any, age: 0 as any, Australian: 0, French: 0, Wimbledon: 0, US: 0 };
      firstNWins.forEach(w => counts[w.slam]++);

      const info = playerInfo.get(playerId);
      if (info) {
        result.push({
          id: playerId,
          name: info.name,
          ioc: info.ioc,
          age: nthAge,
          Australian: counts.Australian,
          French: counts.French,
          Wimbledon: counts.Wimbledon,
          US: counts.US,
        });
      }
    }

    return result.sort((a, b) => a.age - b.age);
  }, [data, selectedN]);

  const totalPages = Math.max(1, Math.ceil(playersAtNthWin.length / perPage));
  const start = (page - 1) * perPage;
  const currentData = showAll ? playersAtNthWin : playersAtNthWin.slice(start, start + perPage);

  const formatAge = useCallback((age: number) => formatAgeDisplay(age), []);

  const renderTable = useCallback((players: PlayerWin[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Age at Nth Win</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Australian</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">French</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">Wimbledon</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">US</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">{rank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link href={`/players/${encodeURIComponent(p.id)}?tab=matches`} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{formatAge(p.age)}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.Australian}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.French}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.Wimbledon}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.US}</td>
              </tr>
          );})}
        </tbody>
      </table>
    </div>
  ), [formatAge]);

  if (error) return <div className="text-red-600">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data) return <div className="text-center py-8 text-gray-300">No data available</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Age at Nth Win in Slams</h2>

      <div className="mb-4 flex justify-end gap-4">
        <NthInput
          label="Nth:"
          value={selectedN}
          onChange={(v) => setSelectedN(Math.max(1, Number(v) || 1))}
          min={1}
        />
        <button
          onClick={() => {
            const newShowAll = !showAll;
            setShowAll(newShowAll);
            if (!newShowAll) setPage(1);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          {showAll ? 'Show Paginated' : 'Show All'}
        </button>
      </div>

      {playersAtNthWin.length === 0 ? (
        <p className="text-center py-8 text-gray-300">No data available for this N.</p>
      ) : (
        renderTable(currentData, showAll ? 0 : start)
      )}

      {!showAll && totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
