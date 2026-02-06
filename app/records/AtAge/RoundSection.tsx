'use client'

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';
import { playerMatchesUrl } from '../nav';
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import AgeInput from './AgeInput';

interface RoundAppearancesProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRound: string;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: PlayerData[];
  initialAge?: number;
}

interface PlayerData {
  id: string;
  name: string;
  ioc?: string;
  appearances_at_age: number;
}

export default function RoundAppearancesSection({ selectedSurfaces, selectedLevels, selectedRound, fetchEnabled = true, setFetchEnabled, fetchRequestId, description, initialData, initialAge }: RoundAppearancesProps) {
  const enabled = !!fetchEnabled;
  const safeInitialAge = Number.isFinite(initialAge) ? (initialAge as number) : 25;
  const [data, setData] = useState<PlayerData[]>(Array.isArray(initialData) ? initialData : []);
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

  useEffect(() => {
    try { const a = String(searchParams?.get('after') ?? '').toLowerCase(); setAfter(a === '1' || a === 'true' || a === 'yes'); } catch (e) {}
  }, [searchParams]);

  useEffect(() => {
    try {
      const a = String(searchParams?.get('after') ?? '').toLowerCase();
      setAfter(a === '1' || a === 'true' || a === 'yes');
    } catch (e) {}
  }, [searchParams]);

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.round((age - years) * 365);
    return `${years}y ${days}d`;
  };

  const roundAbbreviations: Record<string, string> = {
    R128: "R128s",
    R64: "R64s",
    R32: "R32s",
    R16: "R16s",
    QF: "QFs",
    SF: "SFs",
    F: "Fs",
  };


  useEffect(() => {
    setInputAge(safeInitialAge);
    setSelectedAge(safeInitialAge);
    if (Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialAge, initialData]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRound]);

  useEffect(() => {
    if (!selectedRound) {
      setData([]);
      setHasFetched(false);
      return;
    }

    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) {
        setData(initialData);
        setHasFetched(initialData.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    fetchData(selectedAge, showModal ? 1000 : 100, showModal);
  }, [enabled, fetchRequestId, showModal, selectedAge, selectedSurfaces, selectedLevels, selectedRound, initialData]);

  const fetchData = async (age: number, limit: number, force = false, afterOverride?: boolean) => {
    if (!Number.isFinite(age)) {
      setError('Please enter a valid age.');
      return;
    }
    if (!selectedRound) {
      setError('Please select a round.');
      return;
    }
    if (!force && !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append('age', age.toFixed(3));
      const afterFlag = typeof afterOverride === 'boolean' ? afterOverride : after;
      if (afterFlag) query.append('after','1');
      query.append('round', selectedRound);
      selectedSurfaces.forEach(s => query.append('surface', s));
      selectedLevels.forEach(l => query.append('level', l));
      query.set('limit', String(limit));

      const url = `/api/records/atage/rounds?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const fetchedData: PlayerData[] = await res.json();
      setData(Array.isArray(fetchedData) ? fetchedData : []);
      setPage(1);
      setSelectedAge(age);
      setHasFetched(true);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        newQuery.set('age', age.toFixed(3));
        newQuery.set('round', selectedRound);
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
        Array.from(selectedLevels).forEach(l => newQuery.append('level', l));

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
        const sameRound = current.get('round') === newQuery.get('round');

        if (afterFlag) newQuery.set('after','1');
        if (!(sameAge && sameSurface && sameLevel && sameRound)) {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData([]);
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  if (!selectedRound) return <div className="text-center py-8 text-gray-300 text-lg">Please select a round to view results.</div>;

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);



  const renderTable = (players: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              {roundAbbreviations[selectedRound] ? `${roundAbbreviations[selectedRound]} appearances ${after ? '≥' : '≤'} ${formatAge(selectedAge)}` : `Appearances at ${selectedRound} ${after ? '≥' : '≤'} ${formatAge(selectedAge)}`}
            </th>
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
                    <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                    <Link href={playerMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.appearances_at_age}</td>
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
  if (selectedLevels && selectedLevels.size > 0) {
    const levels = Array.from(selectedLevels).map(l => levelNames[l] || l);
    filters.push(`in ${levels.join(' or ')}`);
  }
  if (selectedSurfaces && selectedSurfaces.size > 0) {
    const surfaces = Array.from(selectedSurfaces).map(s => s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? `Players with most ${roundAbbreviations[selectedRound] ?? `${selectedRound}s`}${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}` : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && (
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          {headerText}
        </h1>
      )} 

      {/* Age Input */}
      <div className="mb-4 flex items-center gap-2">
        <AgeInput value={inputAge} onChange={setInputAge} />
        <label className="flex items-center gap-2 text-sm text-gray-200">
          <input type="checkbox" checked={after} onChange={(e) => { const newAfter = e.target.checked; setAfter(newAfter); fetchData(inputAge, showModal ? 1000 : 100, true, newAfter); }} className="w-4 h-4" />
          <span>After</span>
        </label>
        <button
          onClick={() => fetchData(inputAge, showModal ? 1000 : 100, true)}
          disabled={loading || !Number.isFinite(inputAge)}
          className={`px-4 py-1 rounded ${loading || !Number.isFinite(inputAge) ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
      {!loading && !error && data.length === 0 && !hasFetched && <div className="text-center py-8 text-gray-300">Select data</div>}
      {!loading && !error && data.length === 0 && hasFetched && <div className="text-center py-8 text-gray-300">No data found.</div>}

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
        title={roundAbbreviations[selectedRound] ? `Top ${roundAbbreviations[selectedRound]} appearances${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}` : `Top Appearances at Round ${selectedRound}${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
