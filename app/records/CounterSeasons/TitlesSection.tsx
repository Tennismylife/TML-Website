'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/Modal';
import { getFlagFromIOC } from "@/lib/utils";

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  fetchEnabled?: boolean;
  description?: string;
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
  fetchEnabled = true,
  description,
}: TitlesSectionProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [minTitlesPerSeason, setMinTitlesPerSeason] = useState(1);

  const perPage = 20;

  const fetchPlayers = async () => {
    if (!fetchEnabled) return;
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

  const levelNames: Record<string, string> = {
    G: "Slams",
    M: "Masters 1000",
    F: "ATP Finals",
    "500": "500",
    "250": "250",
    A: "Others",
    D: "Davis Cup",
  };

  const filters: string[] = [];
  if (selectedLevels.length > 0) {
    const levels = selectedLevels.map(l => levelNames[l] || l);
    filters.push(`in ${levels.join(' or ')}`);
  }
  if (selectedSurfaces.length > 0) {
    const surfaces = selectedSurfaces.map(s => s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const titleLabel = minTitlesPerSeason === 1 ? 'Title' : 'Titles';
  const headerText = hasFetched ? `Seasons with at least ${minTitlesPerSeason} ${titleLabel}${filterText}` : (description ?? '');

  return (
    <section className="mb-0">
      {headerText && <div className="text-center text-4xl font-bold text-white mb-6">{headerText}</div>}

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
          disabled={loading || !fetchEnabled}
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
        title={`Seasons with at least ${minTitlesPerSeason} Titles${filterText}`}
      >
        {renderTable(players, 0)}
      </Modal>
    </section>
  );
}
