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

  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalTournaments, setModalTournaments] = useState<TournamentInfo[]>([]);
  const [modalPlayer, setModalPlayer] = useState<{ name: string; ioc: string } | null>(null);

  useEffect(() => {
    const query = new URLSearchParams();
    selectedSurfaces.forEach(s => query.append('surface', s));
    selectedLevels.forEach(l => query.append('tourney_level', l));
    if (selectedRounds) query.append('round', selectedRounds);
    const url = `/api/records/streak/rounds${query.toString() ? '?' + query.toString() : ''}`;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(res => setData(res.streaks))
      .catch(setError)
      .finally(() => setLoading(false));
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  const fetchTournaments = async (player: { id: string; name: string; ioc: string }, event_ids: string[]) => {
    try {
      const res = await fetch(`/api/records/streak/streaktournaments/?player_id=${player.id}&event_ids=${event_ids.join(',')}`);
      const tournaments: TournamentInfo[] = await res.json();
      setModalTournaments(tournaments);
      setModalTitle(`${player.name}'s Tournaments`);
      setModalPlayer(player);
      setShowModal(true);
    } catch (err) {
      console.error(err);
      alert('Error fetching tournaments');
    }
  };

  if (error) return <div className="text-red-500">Error loading data</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;

  const renderTable = (players: StreakRecord[]) => (
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
          {players.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-2 text-gray-400 text-center">No data</td>
            </tr>
          ) : (
            players.map((p, index) => (
              <tr key={index} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  <span className="text-base">{flagEmoji(iocToIso2(p.player.ioc)) || ""}</span>
                  <Link href={`/players/${encodeURIComponent(String(p.player.id))}`} className="text-indigo-300 hover:underline">
                    {p.player.name}
                  </Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.maxStreak}</td>
                <td className="border border-white/10 px-4 py-2 text-center">
                  <button
                    onClick={() => fetchTournaments(p.player, p.event_ids)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 text-sm"
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

  const Modal = ({ show, onClose, title, tournaments }: { show: boolean; onClose: () => void; title: string; tournaments: TournamentInfo[] }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4">{title}</h2>
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
                {tournaments.map((t, idx) => (
                  <tr key={idx} className="hover:bg-gray-700 border-b border-white/10">
                    <td className="border border-white/10 px-4 py-2 text-gray-200">{t.tourney_name}</td>
                    <td className="border border-white/10 px-4 py-2 text-gray-200">{t.year}</td>
                    <td className="border border-white/10 px-4 py-2 text-gray-200">{t.surface}</td>
                    <td className="border border-white/10 px-4 py-2 text-gray-200">{t.tourney_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500">Close</button>
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
          onClick={() => { setModalTournaments([]); setShowModal(true); setModalTitle('All Streaks'); }}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      )}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={modalTitle} tournaments={modalTournaments} />
    </section>
  );
}
