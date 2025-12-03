'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import Pagination from '../../../components/Pagination';

interface WinsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
}

interface Streak {
  player_id: string;
  player_name?: string;
  player_ioc?: string;
  tourney_level: string;
  total_wins: number;
  match_ids: number[];
}

export default function WinsSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
}: WinsSectionProps) {
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedBestOf]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append('surface', s));
        selectedLevels.forEach((l) => query.append('level', l));
        if (selectedBestOf !== null) query.append('bestOf', selectedBestOf.toString());

        const url = `/api/records/streak/wins${query.toString() ? '?' + query.toString() : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const rawData = await res.json();
        let streakList: Streak[] = [];

        const isStreak = (obj: any): obj is Streak =>
          obj &&
          typeof obj === 'object' &&
          typeof obj.player_id === 'string' &&
          (typeof obj.player_name === 'string' || obj.player_name === undefined) &&
          (typeof obj.player_ioc === 'string' || obj.player_ioc === undefined) &&
          typeof obj.tourney_level === 'string' &&
          typeof obj.total_wins === 'number' &&
          Array.isArray(obj.match_ids);

        const isStreakArray = (arr: any): arr is Streak[] => Array.isArray(arr) && arr.every(isStreak);

        if (isStreakArray(rawData)) {
          streakList = rawData;
        } else if (rawData && typeof rawData === 'object') {
          const values = (Object.values(rawData) as unknown[]).flat();
          if (isStreakArray(values)) {
            streakList = values;
          } else {
            // keep only valid streaks if partial/dirty data is present
            streakList = (values as any[]).filter(isStreak);
          }
        }

        streakList.sort((a, b) => b.total_wins - a.total_wins);
        setStreaks(streakList);
      } catch (err) {
        console.error(err);
        setError('Errore durante il caricamento delle streak.');
        setStreaks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedBestOf]);

  const totalPages = Math.ceil(streaks.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;

  const currentData = useMemo(() => streaks.slice(start, end), [streaks, start, end]);

  const getLink = (playerId: string) => `/players/${encodeURIComponent(playerId)}`;

  if (loading)
    return (
      <div className="text-center py-8 text-gray-300">Loading...</div>
    );

  if (error)
    return <div className="text-red-500">{error}</div>;

  if (!streaks.length)
    return <div className="text-center py-8 text-gray-300">Nessuna streak trovata.</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Top Consecutive Win Streaks</h2>

      <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
              <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((s, idx) => (
              <tr key={`${s.player_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {start + idx + 1}
                </td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  <span className="text-base">{flagEmoji(iocToIso2(s.player_ioc || ""))}</span>
                  <Link href={getLink(s.player_id)} className="text-indigo-300 hover:underline">
                    {s.player_name || `Player ${s.player_id}`}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {s.total_wins}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}
