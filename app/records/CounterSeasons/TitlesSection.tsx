'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { getFlagFromIOC } from "@/lib/utils";

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
  const [hasFetched, setHasFetched] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [minTitlesPerSeason, setMinTitlesPerSeason] = useState(1);

  const perPage = 20;

  const fetchPlayers = async () => {
    setLoading(true);
    setError(null);

    try {
      const q = new URLSearchParams();
      selectedSurfaces.forEach((s) => q.append('surface', s));
      selectedLevels.forEach((l) => q.append('level', l));
      q.append('minTitlesPerSeason', String(minTitlesPerSeason));

      const res = await fetch(
        `/api/records/counterseasons/titles?${q.toString()}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const sorted = (data.players || []).sort(
        (a: Player, b: Player) => b.totalSeasons - a.totalSeasons
      );

      setPlayers(sorted);
    } catch (err) {
      setError(err as Error);
      setPlayers([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  };

  const topPlayers = players.slice(0, perPage);

  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              #
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Seasons
            </th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="py-8 text-center text-gray-300"
              >
                {!hasFetched ? 'Select data' : 'No data found.'}
              </td>
            </tr>
          ) : (
            list.map((p, idx) => {
              const globalRank = startIndex + idx + 1;
              const flag =
                getFlagFromIOC(p.ioc) ?? '🏳️';

              return (
                <tr
                  key={p.id}
                  className="hover:bg-gray-800 border-b border-white/10"
                >
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {globalRank}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{flag}</span>
                      <Link
                        href={`/players/${encodeURIComponent(p.id)}`}
                        className="text-indigo-300 hover:underline"
                      >
                        {p.name || 'Unknown Player'}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {p.totalSeasons}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    {p.seasonsList.join(', ')}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-0">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Title-winning Seasons
      </h2>

      {/* Controls */}
      <div className="mb-4 flex items-center gap-2">
        <label
          htmlFor="minTitlesPerSeason"
          className="text-gray-200"
        >
          Min titles per season:
        </label>
        <input
          id="minTitlesPerSeason"
          type="number"
          min={1}
          value={minTitlesPerSeason}
          onChange={(e) =>
            setMinTitlesPerSeason(
              Math.max(1, parseInt(e.target.value, 10) || 1)
            )
          }
          className="w-20 rounded border border-white/30 bg-gray-800 px-2 py-1 text-sm text-gray-200"
        />
        <button
          onClick={fetchPlayers}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Apply'}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-sm text-red-500">
          Error loading data: {error.message}
        </p>
      )}

      {/* View All button (same as Wins) */}
      <div className="flex justify-end mb-0">
        {players.length > perPage && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        )}
      </div>

      {renderTable(topPlayers, 0)}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Title-winning seasons per player"
      >
        {renderTable(players, 0)}
      </Modal>
    </section>
  );
}
