'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import AgeInput from './AgeInput';
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from '@/lib/utils';
interface EntriesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];

  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
  initialAge?: number;
}

interface Player {
  id: string;
  name: string;
  ioc?: string;
  participations_at_age: number;
}

export default function EntriesSection({ selectedSurfaces, selectedLevels, fetchEnabled = true, setFetchEnabled, fetchRequestId, description, initialData, initialAge }: EntriesSectionProps) {
  const enabled = !!fetchEnabled;
  const safeInitialAge = Number.isFinite(initialAge) ? (initialAge as number) : 25;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(Array.isArray(initialData) && initialData.length > 0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [inputAge, setInputAge] = useState(safeInitialAge);
  const [selectedAge, setSelectedAge] = useState(safeInitialAge);
  const lastRequestRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const perPage = 20;
  const router = useRouter();

  const [after, setAfter] = useState<boolean>(() => {
    try { const a = String(searchParams?.get('after') ?? '').toLowerCase(); return a === '1' || a === 'true' || a === 'yes'; } catch (e) { return false; }
  });
  const lastAfterRef = useRef<boolean>(after);

  useEffect(() => {
    try { const a = String(searchParams?.get('after') ?? '').toLowerCase(); setAfter(a === '1' || a === 'true' || a === 'yes'); } catch (e) {}
  }, [searchParams]);

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.round((age - years) * 365);
    return `${years}y ${days}d`;
  };

  // Read current age directly from AgeInput DOM to avoid race conditions
  const readAgeFromDom = () => {
    try {
      const yEl = document.querySelector('[data-testid="age-years"]') as HTMLInputElement | null;
      const dEl = document.querySelector('[data-testid="age-days"]') as HTMLInputElement | null;
      const y = yEl ? Number(yEl.value) : NaN;
      const d = dEl ? Number(dEl.value) : NaN;
      if (!Number.isFinite(y) || !Number.isFinite(d)) return NaN;
      const dClamped = Math.min(364, Math.max(0, d));
      return +(y + dClamped / 365).toFixed(3);
    } catch (e) {
      return inputAge;
    }
  };

  useEffect(() => {
    setInputAge(safeInitialAge);
    setSelectedAge(safeInitialAge);
    if (Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialAge, initialData]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal || (Array.isArray(initialData) && initialData.length > 0) || after !== lastAfterRef.current);
    if (!shouldFetch) {
      // only apply server-prefetched `initialData` when we haven't fetched on the client yet
      if (!hasFetched && Array.isArray(initialData)) {
        setData(initialData);
        setHasFetched(initialData.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    lastAfterRef.current = after;
    const forceFetch = showModal || (Array.isArray(initialData) && initialData.length > 0);
    fetchData(selectedAge, showModal ? 1000 : 100, forceFetch);
  }, [enabled, fetchRequestId, showModal, selectedAge, selectedSurfaces, selectedLevels, initialData, hasFetched, after]);

  const fetchData = async (age: number, limit: number, force = false, afterOverride?: boolean) => {
    if (!Number.isFinite(age)) {
      setError('Please enter a valid age.');
      return;
    }
    if (!force && !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append('age', age.toFixed(3));
      const afterFlag = typeof afterOverride === 'boolean' ? afterOverride : after;
      if (afterFlag) query.append('after', '1');
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('level', l));

      query.set('limit', String(limit));

      const url = `/api/records/atage/entries?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const fetchedData: Player[] = await res.json();
      setData(Array.isArray(fetchedData) ? fetchedData : []);
      setPage(1);
      setSelectedAge(age);
      setHasFetched(true);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        if (afterFlag) newQuery.set('after', '1');
        newQuery.set('age', age.toFixed(3));
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
        selectedLevels.forEach(l => newQuery.append('level', l));

        // Compare current params semantically to avoid unnecessary replaces
        const current = (typeof window !== 'undefined') ? new URLSearchParams(window.location.search) : new URLSearchParams();
        const compareMulti = (a: URLSearchParams, b: URLSearchParams, key: string) => {
          const aa = a.getAll(key).map(String).sort();
          const bb = b.getAll(key).map(String).sort();
          if (aa.length !== bb.length) return false;
          for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
          return true;
        };

        const sameAge = current.get('age') === newQuery.get('age');
        const sameSurface = compareMulti(current, newQuery, 'surface');
        const sameLevel = compareMulti(current, newQuery, 'level');
        const sameAfter = current.get('after') === newQuery.get('after');

        if (!(sameAge && sameSurface && sameLevel && sameAfter)) {
          const newUrl = `${path}?${newQuery.toString()}`;
          if (typeof window !== 'undefined') {
            const current = window.location.pathname + window.location.search;
            if (current !== newUrl) {
              try {
                window.history.replaceState(null, '', newUrl);
              } catch (e) {
                try { router.replace(newUrl); } catch (e) { /* ignore */ }
              }
            }
          } else {
            try { router.replace(newUrl); } catch (e) { /* ignore */ }
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
  const currentPlayers = data.slice(start, start + perPage);



  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Participations at {formatAge(selectedAge)}</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                    <Link href={getPlayerHrefWithTab((p as any).slug ?? String(p.id), 'matches')} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.participations_at_age}</td>
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

  const headerText = hasFetched ? `Players with most entries${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}` : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {headerText}
        </h2>
      )} 

      {/* Age Input */}
      <div className="mb-4 flex items-center gap-2">
        <AgeInput value={inputAge} onChange={setInputAge} />
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={after} onChange={(e) => { const newAfter = e.target.checked; setAfter(newAfter); const ageNow = readAgeFromDom(); fetchData(ageNow, showModal ? 1000 : 100, true, newAfter); }} className="w-4 h-4" />
          <span>After</span>
        </label>
        <button
          onClick={() => { const ageNow = readAgeFromDom(); fetchData(ageNow, showModal ? 1000 : 100, true); }}
          disabled={loading || !Number.isFinite(inputAge)}
          className={`px-4 py-1 rounded ${
            loading || !Number.isFinite(inputAge) ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
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
          {(!hasFetched && (!initialData || initialData.length === 0)) ? (
            <div className="text-center py-8 text-gray-300">Select data</div>
          ) : (
            <div className="text-center py-8 text-gray-300">No data found.</div>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && renderTable(currentPlayers, start)}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={`Top Tournament Participations at ${formatAge(selectedAge)}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
