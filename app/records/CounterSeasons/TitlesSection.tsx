'use client'

import React, { useState } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface Player {
  id: string;
  name: string;
  ioc: string;
  totalSeasons: number;
  seasonsList: string[];
}

export default function TitlesSection({
  selectedSurfaces,
  selectedLevels,
}: TitlesSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [minTitlesPerSeason, setMinTitlesPerSeason] = useState(1);

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);

    try {
      const q = new URLSearchParams();
      selectedSurfaces.forEach((s) => q.append('surface', s));
      selectedLevels.forEach((l) => q.append('level', l));
      q.append('minTitlesPerSeason', String(minTitlesPerSeason));

      const res = await fetch(`/api/records/counterseasons/titles?${q.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

      const data = await res.json();
      const sortedPlayers = (data.players || []).sort((a, b) => b.totalSeasons - a.totalSeasons);
      setPlayers(sortedPlayers);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const perPage = 10;
  const topPlayers = players.slice(0, perPage);

  const renderTable = (list: Player[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-gray-200">Seasons</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-3 text-center text-gray-400 text-base">
                No results found
              </td>
            </tr>
          ) : (
            list.map((p, idx) => (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-indigo-400 font-semibold">
                  {idx + 1}
                </td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-gray-200">
                  <span>{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
                  <Link
                    href={`/players/${encodeURIComponent(p.id)}`}
                    className="text-indigo-300 hover:underline"
                  >
                    {p.name || 'Unknown Player'}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{p.totalSeasons}</td>
                <td className="border border-white/10 px-4 py-2 text-gray-200">{p.seasonsList.join(', ')}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Title-winning Seasons</h2>

      {/* --- Controls --- */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <label htmlFor="minTitlesPerSeason" className="text-gray-200">Min titles per season:</label>
          <input
            id="minTitlesPerSeason"
            type="number"
            min={1}
            value={minTitlesPerSeason}
            onChange={(e) =>
              setMinTitlesPerSeason(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
            className="w-20 rounded border border-white/30 bg-gray-800 px-2 py-1 text-sm text-gray-200"
          />
          <button
            onClick={fetchPlayers}
            disabled={loading}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Apply'}
          </button>
        </div>

        {players.length > perPage && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            View all ({players.length})
          </button>
        )}
      </div>

      {error && <p className="mb-2 text-sm text-red-500">Error loading data: {error.message}</p>}

      {/* --- Table showing top 10 --- */}
      {renderTable(topPlayers)}

      {/* --- Modal --- */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-7xl flex-col overflow-hidden rounded-lg bg-gray-900 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-white/30 bg-gray-800 p-4">
              <h2 id="modal-title" className="text-lg font-semibold text-gray-300">
                Title-winning seasons per player
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                aria-label="Close modal"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{renderTable(players)}</div>
          </div>
        </div>
      )}
    </section>
  );
}
