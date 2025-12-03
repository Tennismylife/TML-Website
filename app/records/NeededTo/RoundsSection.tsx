'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import Pagination from '../../../components/Pagination';

interface RoundsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
}

interface Player {
  player_id: string;
  player_name: string;
  ioc: string;
  round_number: number;
  tournaments_played: number;
}

export default function RoundsSection({ selectedSurfaces, selectedLevels, selectedRounds }: RoundsSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [round_number, setRoundNumber] = useState(1);
  const [roundInput, setRoundInput] = useState(1);

  const perPage = 10;

  useEffect(() => {
    setPage(1);
  }, [selectedSurfaces, selectedLevels, selectedRounds, round_number]);

  useEffect(() => {
    fetchPlayers();
  }, [selectedSurfaces, selectedLevels, selectedRounds, round_number]);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('level', l));
      if (selectedRounds) query.append('round', selectedRounds);
      if (selectedRounds) query.append('round_number', round_number.toString());

      const res = await fetch(`/api/records/neededto/rounds?${query.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch rounds');
      const data: Player[] = await res.json();

      const sorted = data.sort((a, b) => (a.tournaments_played ?? 0) - (b.tournaments_played ?? 0));
      setPlayers(sorted);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(players.length / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const currentData = showAll ? players : players.slice(start, end);

  const renderTable = (data: Player[]) => (
    <div className="overflow-x-auto rounded border bg-white shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2 text-center text-lg">Rank</th>
            <th className="border px-4 py-2 text-left text-lg">Player</th>
            <th className="border px-4 py-2 text-center text-lg">Tournaments Played</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = showAll ? idx + 1 : start + idx + 1;
            return (
              <tr key={p.player_id} className="hover:bg-gray-50">
                <td className="border px-4 py-2 text-center">{rank}</td>
                <td className="border px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span>{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                    <Link href={`/players/${encodeURIComponent(p.player_id)}`} className="text-blue-700 hover:underline">
                      {p.player_name}
                    </Link>
                  </div>
                </td>
                <td className="border px-4 py-2 text-center">{p.tournaments_played ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div>Loading...</div>;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4">Tournaments Played to Reach N Rounds</h2>

      <div className="mb-4 flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <label htmlFor="titleInput" className="text-gray-700">Round Number (N)</label>
          <input
            id="titleInput"
            type="number"
            min={1}
            value={roundInput}
            onChange={(e) => setRoundInput(Math.max(1, Number(e.target.value)))}
            className="border rounded px-2 py-1 w-20"
          />
          <button
            onClick={() => setRoundNumber(roundInput)}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Apply
          </button>
        </div>

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

      {renderTable(currentData)}

      {!showAll && totalPages > 1 && (
        <div className="mt-2">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </section>
  );
}
