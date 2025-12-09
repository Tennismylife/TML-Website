'use client'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
}

interface StreakRecord {
  player: { id: string; name: string; ioc: string };
  maxStreak: number;
  event_ids: string[];
}

interface TournamentInfo {
  event_id: string;
  tourney_name: string;
  year: number;
  surface: string;
  tourney_level: string;
}

export default function RoundSection({ selectedSurfaces, selectedLevels, selectedRounds }: RoundSectionProps) {
  const [data, setData] = useState<StreakRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalPlayer, setModalPlayer] = useState<{ name: string; ioc: string } | null>(null);
  const [modalTournaments, setModalTournaments] = useState<TournamentInfo[]>([]);

  // Fetch streaks
  useEffect(() => {
    const fetchStreaks = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('tourney_level', l));
        if (selectedRounds) query.append('round', selectedRounds);

        const url = `/api/records/streak/rounds${query.toString() ? '?' + query.toString() : ''}`;
        const res = await fetch(url);
        const json = await res.json();
        setData(json.streaks || []);
      } catch (err) {
        console.error(err);
        setError('Failed to load streaks');
      } finally {
        setLoading(false);
      }
    };

    fetchStreaks();
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  // Fetch tournaments for a player
  const fetchTournaments = async (player: { id: string; name: string; ioc: string }, event_ids: string[]) => {
    try {
      const res = await fetch(`/api/records/streak/streaktournaments/?player_id=${player.id}&event_ids=${event_ids.join(',')}`);
      const tournaments: TournamentInfo[] = await res.json();
      setModalTournaments(tournaments);
      setModalPlayer(player);
      setModalTitle(`${player.name}'s Tournaments`);
      setModalOpen(true);
    } catch (err) {
      console.error(err);
      alert('Error fetching tournaments');
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  const renderTable = (records: StreakRecord[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Streak</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-2 text-gray-400 text-center">No data</td>
            </tr>
          ) : (
            records.map((p, idx) => (
              <tr key={idx} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  <span>{flagEmoji(iocToIso2(p.player.ioc)) || ''}</span>
                  <Link href={`/players/${encodeURIComponent(p.player.id)}`} className="text-indigo-300 hover:underline">
                    {p.player.name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.maxStreak}</td>
                <td className="border border-white/10 px-4 py-2 text-center">
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
                    onClick={() => fetchTournaments(p.player, p.event_ids)}
                  >
                    View Tournaments
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const Modal = () => {
    if (!modalOpen || !modalPlayer) return null;

    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={() => setModalOpen(false)}
      >
        <div
          className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
          onClick={e => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">{modalTitle}</h2>
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-800">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Year</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Surface</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Level</th>
                </tr>
              </thead>
              <tbody>
                {modalTournaments.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-700 border-b border-white/10">
                    <td className="border border-white/10 px-4 py-2">{t.tourney_name}</td>
                    <td className="border border-white/10 px-4 py-2">{t.year}</td>
                    <td className="border border-white/10 px-4 py-2">{t.surface}</td>
                    <td className="border border-white/10 px-4 py-2">{t.tourney_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            onClick={() => setModalOpen(false)}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Round Streaks</h2>
      {renderTable(data.slice(0, 10))}
      {data.length > 10 && (
        <button
          onClick={() => { setModalTournaments([]); setModalOpen(true); setModalTitle('All Streaks'); }}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      )}
      <Modal />
    </section>
  );
}
