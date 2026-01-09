'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getFlagFromIOC } from "@/lib/utils";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { playerMatchesUrl } from '../nav';

interface RoundsSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
  initialNth?: number;
}

interface Player {
  player_id: string;
  player_name: string;
  ioc: string;
  round_number: number;
  tournaments_played: number;
}

export default function RoundsSection({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData, initialNth }: RoundsSectionProps) {
  const enabled = !!fetchEnabled;
  const safeInitialN = Number.isFinite(initialNth) ? (initialNth as number) : 1;

  const [players, setPlayers] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(Array.isArray(initialData) && initialData.length > 0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [roundNumber, setRoundNumber] = useState(safeInitialN);
  const [roundInput, setRoundInput] = useState(safeInitialN);
  const lastRequestRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const perPage = 20;

  useEffect(() => {
    setRoundNumber(safeInitialN);
    setRoundInput(safeInitialN);
    if (Array.isArray(initialData)) {
      setPlayers(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialN, initialData]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) {
        setPlayers(initialData);
        setHasFetched(initialData.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    fetchPlayers(roundNumber, showModal ? 1000 : 100, showModal);
  }, [enabled, fetchRequestId, showModal, roundNumber, selectedSurfaces, selectedLevels, selectedRounds, initialData]);

  const fetchPlayers = async (n: number, limit: number, force = false) => {
    if (!Number.isFinite(n) || n <= 0) {
      setError('Please enter a valid round number.');
      return;
    }
    if (!force && !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('level', l));
      if (selectedRounds) query.append('round', selectedRounds);
      query.append('round_number', n.toString());
      query.set('limit', String(limit));

      const res = await fetch(`/api/records/neededto/rounds?${query.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch rounds');
      }
      const data: Player[] = await res.json();
      const sorted = data.sort((a, b) => (a.tournaments_played ?? 0) - (b.tournaments_played ?? 0));
      setPlayers(sorted);
      setPage(1);
      setRoundNumber(n);
      setHasFetched(true);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        newQuery.set('n', String(n));
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
        selectedLevels.forEach(l => newQuery.append('level', l));
        if (selectedRounds) newQuery.set('round', selectedRounds);

        const current = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const compareMulti = (a: URLSearchParams, b: URLSearchParams, key: string) => {
          const aa = a.getAll(key).map(String).sort();
          const bb = b.getAll(key).map(String).sort();
          if (aa.length !== bb.length) return false;
          for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
          return true;
        };

        const sameN = current.get('n') === newQuery.get('n');
        const sameSurface = compareMulti(current, newQuery, 'surface');
        const sameLevel = compareMulti(current, newQuery, 'level');
        const sameRound = current.get('round') === newQuery.get('round');

        if (!(sameN && sameSurface && sameLevel && sameRound)) {
          router.replace(`${path}?${newQuery.toString()}`);
        }
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPlayers([]);
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  const totalPages = Math.ceil(players.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = players.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = playerMatchesUrl(playerId);
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (data: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournaments Played</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const rank = startIndex + idx + 1;
            return (
              <tr key={p.player_id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    <span>{getFlagFromIOC(p.ioc) || ''}</span>
                    <Link href={getPlayerLink(p.player_id)} className="text-indigo-300 hover:underline">
                      {p.player_name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.tournaments_played ?? 0}</td>
              </tr>
            );
          })}
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
  if (selectedRounds) {
    filters.push(`round ${selectedRounds}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? `Tournaments needed to reach round ${roundNumber}${filterText}` : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && <h1 className="mb-6 text-center text-2xl font-semibold text-white">{headerText}</h1>} 

      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="roundInput" className="text-gray-200">Round Number (N)</label>
        <input
          id="roundInput"
          type="number"
          min={1}
          value={roundInput}
          onChange={(e) => setRoundInput(Math.max(1, Number(e.target.value)))}
          className="border border-gray-600 rounded px-2 py-1 w-20 bg-gray-800 text-white"
        />
        <button
          onClick={() => fetchPlayers(roundInput, showModal ? 1000 : 100, true)}
          disabled={loading || !Number.isFinite(roundInput) || roundInput <= 0}
          className={`px-3 py-1 rounded ${
            loading || !Number.isFinite(roundInput) || roundInput <= 0
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          Apply
        </button>
      </div>

      {players.length > perPage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      )}

      {loading && <div className="text-center py-8 text-gray-300">Loading...</div>}
      {error && <div className="text-red-600 text-center py-2">{error}</div>}
      {!loading && !error && players.length === 0 && (
        <div>
          {!hasFetched ? (
            <div className="text-center py-8 text-gray-300">Select data</div>
          ) : (
            <div className="text-center py-8 text-gray-300">No data found.</div>
          )}
        </div>
      )}

      {!loading && players.length > 0 && renderTable(currentData, start)}

      {!loading && totalPages > 1 && (
        <div className="mt-2">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={`Tournaments needed to reach round ${roundNumber}${filterText}`}
      >
        {renderTable(players)}
      </Modal>
    </section>
  );
}
