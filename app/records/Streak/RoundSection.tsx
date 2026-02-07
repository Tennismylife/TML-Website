"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import Pagination from "@/components/Pagination";
import Flag from "@/components/Flag";
import { getPlayerHrefWithTab } from "@/lib/utils";

interface RoundSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedBestOf: number | null;
  selectedRounds?: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  initialData?: StreakByTournament[];
  description?: string;
}

interface StreakByTournament {
  player?: { id: string; name: string; ioc: string };
  maxStreak: number;
  event_ids: string[];
}

interface TournamentDetail {
  event_id: string;
  tourney_name: string;
  tourney_date?: string;
  year?: string | number;
  tourney_year?: string;
}

const viewLimit = 20;

export default function RoundSection({
  selectedSurfaces,
  selectedLevels,
  selectedBestOf,
  selectedRounds,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  initialData,
  description,
}: RoundSectionProps) {
  const normalizeStreaks = (data: any): StreakByTournament[] => {
    if (Array.isArray(data)) return data as StreakByTournament[];
    if (data && Array.isArray(data.streaks)) return data.streaks as StreakByTournament[];
    return [];
  };

  const [streaks, setStreaks] = useState<StreakByTournament[]>(normalizeStreaks(initialData));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [tournamentDetails, setTournamentDetails] = useState<TournamentDetail[]>([]);
  const [tournamentModalPlayer, setTournamentModalPlayer] = useState<string>("");
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [tournamentLoading, setTournamentLoading] = useState(false);
  const [tournamentError, setTournamentError] = useState<string | null>(null);

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

      const res = await fetch(`/api/records/streak/rounds${query.toString() ? `?${query}` : ''}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setStreaks(normalizeStreaks(data));
    } catch (err: any) {
      setError(err?.message || "Error while loading consecutive rounds data.");
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

  const openTournamentModal = async (playerId: string, eventIds: string[], playerName?: string) => {
    setShowTournamentModal(true);
    setTournamentDetails([]);
    setTournamentError(null);
    setTournamentLoading(true);
    setTournamentModalPlayer(playerName || "");

    try {
      const res = await fetch(`/api/records/streak/streaktournaments?player_id=${encodeURIComponent(playerId)}&event_ids=${encodeURIComponent(eventIds.join(','))}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTournamentDetails(data);
    } catch (err: any) {
      setTournamentError(err?.message || "Error while loading tournament details.");
    } finally {
      setTournamentLoading(false);
    }
  };

  const renderTable = (list: StreakByTournament[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournaments</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Details</th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-8 text-center text-gray-300">{!hasFetched ? "Select data" : "No data available."}</td>
            </tr>
          ) : (
            list.map((s, idx) => {
              const globalRank = startIndex + idx + 1;
              return (
                <tr key={`${s.player?.id ?? "player"}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <Flag ioc={s.player?.ioc ?? undefined} className="w-4 h-3" />
                      {s.player ? (
                        <Link href={getPlayerHrefWithTab((s.player as any).slug ?? String(s.player.id), 'matches')} className="text-indigo-300 hover:underline">
                          {s.player.name}
                        </Link>
                      ) : (
                        <span className="text-gray-200">Unknown player</span>
                      )}
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{s.event_ids?.length ?? 0}</td>
                  <td className="border border-white/10 px-4 py-2 text-center">
                    <button
                      onClick={() => openTournamentModal(s.player?.id || "", s.event_ids || [], s.player?.name)}
                      className="rounded bg-indigo-600 px-3 py-1 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                      disabled={!s.player?.id || !s.event_ids?.length}
                    >
                      View Tournaments
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
      {description && <h1 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h1>} 



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
        <div className="py-8 text-center text-gray-300">No consecutive rounds found.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * viewLimit)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top Consecutive Rounds by Tournament">
        {renderTable(streaks, 0)}
      </Modal>

      <Modal show={showTournamentModal} onClose={() => setShowTournamentModal(false)} title={tournamentModalPlayer ? `Tournaments for ${tournamentModalPlayer}` : "Tournament Details"}>
        {tournamentLoading ? (
          <div className="py-8 text-center text-gray-300">Loading tournaments…</div>
        ) : tournamentError ? (
          <div className="py-8 text-center text-red-500">{tournamentError}</div>
        ) : tournamentDetails.length === 0 ? (
          <div className="py-8 text-center text-gray-300">No tournaments found.</div>
        ) : (
          <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="bg-black">
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 text-center">Tournament</th>
                  <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 text-center">Date</th>
                </tr>
              </thead>
              <tbody>
                {tournamentDetails.map((t, idx) => (
                  <tr key={`${t.event_id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                    <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{t.tourney_name}</td>
                    <td className="border border-white/10 px-4 py-2 text-center text-gray-200">{t.tourney_date ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Modal>
    </section>
  );
}
