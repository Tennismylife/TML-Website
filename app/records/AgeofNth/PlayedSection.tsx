"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from '@/components/Flag';
import { toOrdinal, getPlayerHrefWithTab } from "@/lib/utils";

interface PlayedSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
  initialNth?: number;
}

interface Player {
  id: string;
  name: string;
  ioc?: string;
  age_at_game: string;
}

function XInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      data-testid="nth-input"
      type="number"
      min={1}
      className="w-24 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded"
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => {
        if (e.currentTarget.value === '') { onChange(Number.NaN); return; }
        const v = Number(e.currentTarget.value);
        onChange(Number.isNaN(v) ? Number.NaN : v);
      }}
    />
  );
}

export default function PlayedSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  fetchEnabled = false,
  setFetchEnabled,
  fetchRequestId,
  description,
  initialData,
  initialNth,
}: PlayedSectionProps) {
  const enabled = !!fetchEnabled;
  const safeInitialNth = Number.isFinite(initialNth) ? (initialNth as number) : 50;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(Array.isArray(initialData) && initialData.length > 0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [inputN, setInputN] = useState(safeInitialNth);
  const [selectedN, setSelectedN] = useState(safeInitialNth);
  const lastRequestRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const perPage = 20;

  // Read N value directly from the DOM to avoid race conditions when clicking Apply
  const readNthFromDom = () => {
    try {
      const el = document.querySelector('[data-testid="nth-input"]') as HTMLInputElement | null;
      const v = el ? Number(el.value) : NaN;
      return Number.isFinite(v) ? v : inputN;
    } catch (e) {
      return inputN;
    }
  };

  useEffect(() => {
    setInputN(safeInitialNth);
    setSelectedN(safeInitialNth);
    if (!hasFetched && Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialNth, initialData, hasFetched]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  // Ensure we do not overwrite client-fetched results with server `initialData` after the user has fetched.
  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal || (Array.isArray(initialData) && initialData.length > 0));
    if (!shouldFetch) {
      // only apply server-prefetched `initialData` when we haven't already fetched on the client
      if (!hasFetched && Array.isArray(initialData)) {
        setData(initialData);
        setHasFetched(initialData.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    const forceFetch = showModal || (Array.isArray(initialData) && initialData.length > 0);
    fetchData(selectedN, showModal ? 1000 : 100, forceFetch);
  }, [enabled, fetchRequestId, showModal, selectedN, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, initialData, hasFetched]);

  const fetchData = async (n: number, limit: number, force = false) => {
    if (!Number.isFinite(n) || n <= 0) {
      setError('Please enter a valid N value.');
      return;
    }
    if (!force && !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append("n", n.toString());
      selectedSurfaces.forEach((s) => query.append("surface", s));
      selectedLevels.forEach((l) => query.append("level", l));
      if (selectedRounds) query.append("round", selectedRounds);
      if (selectedBestOf != null) query.append("best_of", selectedBestOf.toString());
      query.set('limit', String(limit));

      const res = await fetch(`/api/records/ageofnth/played?${query.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const fetchedData: Player[] = await res.json();
      const fetchedArray = Array.isArray(fetchedData) ? fetchedData : [];
      setData(force ? fetchedArray : fetchedArray.slice(0, 100));
      setPage(1);
      setSelectedN(n);
      setHasFetched(true);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        newQuery.set('n', String(n));
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
        selectedLevels.forEach(l => newQuery.append('level', l));
        if (selectedRounds) newQuery.set('round', selectedRounds);
        if (selectedBestOf != null) newQuery.set('bestOf', String(selectedBestOf));

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
        const sameBestOf = current.get('bestOf') === newQuery.get('bestOf');

        if (!(sameN && sameSurface && sameLevel && sameRound && sameBestOf)) {
          try {
            const newUrl = `${path}?${newQuery.toString()}`;
            if (typeof window !== 'undefined') window.history.replaceState(null, '', newUrl);
          } catch (e) {
            /* ignore */
          }
        }
      } catch (e) {
        // ignore
      }

    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const playersPage = data.slice(start, start + perPage);



  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Age of {toOrdinal(selectedN)} match
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {globalRank}
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                    <Link href={getPlayerHrefWithTab((p as any).slug ?? String(p.id), 'matches')} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {p.age_at_game || "-"}
                </td>
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
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? `Age of ${toOrdinal(selectedN)} match${filterText}` : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{headerText}</h2>}  

      {/* X Input */}
      <div className="mb-4 flex items-center gap-2">
        <XInput value={inputN} onChange={setInputN} />
        <button
          onClick={() => {
            const n = readNthFromDom();
            if (!Number.isFinite(n) || n <= 0) return;
            setInputN(n);
            // schedule fetch on next tick so any pending input onChange commits first
            setTimeout(() => fetchData(n, showModal ? 1000 : 100, true), 0);
          }}
          disabled={loading || !Number.isFinite(inputN) || inputN <= 0}
          className={`px-4 py-1 rounded ${
            loading || !Number.isFinite(inputN) || inputN <= 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Apply
        </button>
      </div>

      {/* View All Button */}
      {data.length > perPage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      )}

      {/* Loading / Error / No data */}
      {loading && <div className="text-center py-8 text-gray-300">Loading...</div>}
      {error && <div className="text-red-600 text-center py-2">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div>
          {!hasFetched ? (
            <div className="text-center py-8 text-gray-300">Select data</div>
          ) : (
            <div className="text-center py-8 text-gray-300">No data found.</div>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && renderTable(playersPage, start)}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={`Age of ${toOrdinal(selectedN)} match${filterText}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
