"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from '@/components/Flag';
import { playerSurfaceOrMatchesUrl } from "../nav";

interface WinsSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
  selectedRounds?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  initialData?: Streak[];
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

const viewLimit = 20;

export default function WinsSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
  selectedRounds,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  initialData,
  description,
}: WinsSectionProps) {
  const [streaks, setStreaks] = useState<Streak[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [showMatchesModal, setShowMatchesModal] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const levelsArr = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  useEffect(() => setPage(1), [surfacesArr, levelsArr, selectedBestOf, selectedRounds]);

  const fetchData = async (limit = 100, force = false) => {
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const query = new URLSearchParams();
      surfacesArr.forEach((s) => query.append("surface", s));
      levelsArr.forEach((l) => query.append("level", l));
      if (selectedBestOf !== null) query.append("best_of", selectedBestOf.toString());
      if (selectedRounds) {
        if (selectedRounds === "All") {
          ["R128","R64","R32","R16","QF","SF","F"].forEach(r => query.append("round", r));
        } else {
          query.append("round", selectedRounds);
        }
      }
      query.append("limit", String(limit));

      const res = await fetch(`/api/records/streak/wins${query.toString() ? `?${query}` : ''}`);
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
    } catch (err: any) {
      setError(err?.message || 'Error while loading win streaks.');
      setStreaks([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
      if (fetchEnabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRequestId, surfacesArr.join(','), levelsArr.join(','), selectedBestOf, selectedRounds]);

  const totalPages = Math.ceil(streaks.length / viewLimit);

  const currentData = useMemo(() => {
    const start = (page - 1) * viewLimit;
    return streaks.slice(start, start + viewLimit);
  }, [streaks, page]);

  const linkParams: Record<string, string | string[] | number | undefined> = {};
  if (surfacesArr.length) linkParams.surface = surfacesArr;
  if (levelsArr.length) linkParams.level = levelsArr;
  if (selectedBestOf !== null) linkParams.best_of = selectedBestOf;
  if (selectedRounds) linkParams.round = selectedRounds === "All" ? undefined : selectedRounds;

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
    } catch (err: any) {
      setMatchesError(err?.message || 'Error while loading matches.');
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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-gray-300">{!hasFetched ? 'Select data' : 'No data available.'}</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr key={`${s.player_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={s.player_ioc ?? undefined} className="w-4 h-3 inline-block" />
                      <Link href={playerSurfaceOrMatchesUrl((s as any).slug ?? String(s.player_id), linkParams as any)} className="text-indigo-300 hover:underline">
                        {s.player_name || `Player ${s.player_id}`}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.total_wins}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openMatchesModal(s.match_ids)}
                      className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-500"
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
      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>} 



      {error && <div className="mb-2 text-center text-sm text-red-500">{error}</div>}

      <div className="mb-0 flex justify-end">
        {streaks.length > viewLimit && (
          <button onClick={() => setShowModal(true)} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-300">Loading…</div>
      ) : streaks.length === 0 ? (
        <div className="py-8 text-center text-gray-300">No win streaks found.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * viewLimit)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Consecutive Win Streaks">
        {renderTable(streaks, 0)}
      </Modal>

      <Modal show={showMatchesModal} onClose={() => setShowMatchesModal(false)} title="Matches in Win Streak">
        {matchesLoading ? (
          <div className="py-8 text-center text-gray-300">Loading matches…</div>
        ) : matchesError ? (
          <div className="py-8 text-center text-red-500">{matchesError}</div>
        ) : matches.length === 0 ? (
          <div className="py-8 text-center text-gray-300">No matches found.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Round</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Opponent</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Score</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m, idx) => {
                  return (
                    <tr key={`${m.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                      <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{m.tourney_date}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.tourney_name}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200">{m.round}</td>
                      <td className="border border-white/10 px-4 py-2 text-gray-200 flex items-center justify-center gap-2">
                        <Flag ioc={m.loser_ioc ?? undefined} className="w-4 h-3 inline-block" />
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
