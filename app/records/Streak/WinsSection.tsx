'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { getFlagFromIOC } from "@/lib/utils";

interface WinsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
  selectedRounds?: string;
  description?: string;
}

interface Streak {
  player_id: string;
  player_name?: string;
  player_ioc?: string;
  tourney_level?: string;
  total_wins: number;
  match_ids: number[];
}

interface Match {
  id: number;
  tourney_date: string;
  tourney_name: string;
  round: string;
  opponent_name: string;
  loser_ioc?: string;
  score: string;
}

export default function WinsSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
  selectedRounds,
  fetchEnabled,
  description,
}: WinsSectionProps & { fetchEnabled?: boolean, description?: string }) {
  const enabled = !!fetchEnabled;
  const searchParams = useSearchParams();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  // Matches modal state
  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const perPage = 20;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedBestOf, selectedRounds]);

  useEffect(() => {
    if (!enabled && !showModal && !showMatchesModal) {
      setStreaks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedBestOf !== null) query.append('bestOf', selectedBestOf.toString());
        // Round filter: use only explicit round params from URL (external filter) — do NOT add rounds here
        const roundsFromQS = searchParams.getAll('round');
        if (roundsFromQS.length) {
          roundsFromQS.forEach(r => query.append('round', r));
        } else if (selectedRounds) {
          if (selectedRounds === 'All') {
            ['R128','R64','R32','R16','QF','SF','F'].forEach(r => query.append('round', r));
          } else {
            query.append('round', selectedRounds);
          }
        }

        const url = `/api/records/streak/wins${query.toString() ? `?${query}` : ''}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const rawData = await res.json();
        let streakList: Streak[] = [];

        if (Array.isArray(rawData)) {
          streakList = rawData;
        } else if (rawData && typeof rawData === 'object') {
          streakList = Object.values(rawData)
            .flatMap((v: any) => (Array.isArray(v) ? v : Object.values(v)))
            .flat() as Streak[];
        }

        streakList.sort((a, b) => b.total_wins - a.total_wins);
        setStreaks(streakList);
      } catch (err) {
        console.error(err);
        setError('Error while loading win streaks.');
        setStreaks([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedBestOf, selectedRounds, searchParams, enabled, showModal, showMatchesModal]);

  const totalPages = Math.ceil(streaks.length / perPage);

  const currentData = useMemo(() => {
    const start = (page - 1) * perPage;
    return streaks.slice(start, start + perPage);
  }, [streaks, page]);

  // Open matches modal
  const openMatchesModal = async (matchIds: number[]) => {
    setShowMatchesModal(true);
    setMatches([]);
    setMatchesError(null);
    setMatchesLoading(true);

    try {
      const res = await fetch(`/api/records/streak/streakwins?ids=${matchIds.join(',')}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatches(data);
    } catch (err) {
      console.error(err);
      setMatchesError('Error while loading matches.');
    } finally {
      setMatchesLoading(false);
    }
  };

  const renderTable = (list: Streak[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">No data available.</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;
              const flag = getFlagFromIOC(s.player_ioc || '') ?? '🏳️';

              return (
                <tr key={`${s.player_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{flag}</span>
                      <Link href={`/players/${encodeURIComponent(s.player_id)}`} className="text-indigo-300 hover:underline">
                        {s.player_name || `Player ${s.player_id}`}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.total_wins}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openMatchesModal(s.match_ids)}
                      className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500"
                    >
                      View Matches
                    </button>
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
      {description && <div className="text-center text-4xl font-bold text-white mb-6">{description}</div>}

      <div className="flex justify-end mb-0">
        {streaks.length > perPage && (
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : streaks.length === 0 ? (
        <div className="text-center py-8 text-gray-300">No win streaks found.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * perPage)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      {/* Modal "View All" */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Consecutive Win Streaks">
        {renderTable(streaks, 0)}
      </Modal>

      {/* Modal Matches */}
      <Modal show={showMatchesModal} onClose={() => setShowMatchesModal(false)} title="Matches in Win Streak">
        {matchesLoading ? (
          <div className="text-center py-8 text-gray-300">Loading matches...</div>
        ) : matchesError ? (
          <div className="text-center py-8 text-red-500">{matchesError}</div>
        ) : matches.length === 0 ? (
          <div className="text-center py-8 text-gray-300">No matches found.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Round</th>
                  <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Opponent</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  const opponentFlag = getFlagFromIOC(m.loser_ioc || '') ?? '🏳️';
                  return (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                      <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.tourney_date}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.tourney_name}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.round}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200 flex items-center gap-2">
                        <span className="text-base">{opponentFlag}</span>
                        {m.opponent_name}
                      </td>
                      <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.score}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  );
}
