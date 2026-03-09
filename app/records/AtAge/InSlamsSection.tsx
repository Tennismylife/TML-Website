'use client'

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import AgeInput from './AgeInput';
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from '@/lib/utils';
interface InSlamsSectionProps {
  selectedSurfaces: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  description?: string;
  initialData?: PlayerData[];
  initialAge?: number;
}

interface PlayerData {
  id: string;
  name: string;
  ioc: string;
  australian: number;
  french: number;
  wimbledon: number;
  us: number;
  total: number;
}

export default function InSlamsSection({ selectedSurfaces, selectedRounds, selectedBestOf, fetchEnabled = true, description, initialData, initialAge }: InSlamsSectionProps) {
  const safeInitialAge = Number.isFinite(initialAge as any) ? (initialAge as number) : 25;
  const [data, setData] = useState<PlayerData[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [hasFetched, setHasFetched] = useState(Array.isArray(initialData) && initialData.length > 0);  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [inputAge, setInputAge] = useState(safeInitialAge);
  const [selectedAge, setSelectedAge] = useState(safeInitialAge);
  const searchParams = useSearchParams();
  const perPage = 20;

  const [after, setAfter] = useState<boolean>(() => {
    try { const a = String(searchParams?.get('after') ?? '').toLowerCase(); return a === '1' || a === 'true' || a === 'yes'; } catch (e) { return false; }
  });

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

  // Read age from AgeInput DOM to avoid race conditions on Apply/After
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
    if (!hasFetched && Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialAge, initialData, hasFetched]);

  // If SSR provided `initialData` (top‑10), immediately fetch the full
  // `limit=100` result set on the client to replace the SSR stub.
  const initialClientFetchRef = useRef(false);
  useEffect(() => {
    const shouldFetch = Array.isArray(initialData) && initialData.length > 0;
    if (!shouldFetch) return;
    if (initialClientFetchRef.current) return;
    initialClientFetchRef.current = true;
    fetchData(safeInitialAge);
  }, [initialData, safeInitialAge, selectedSurfaces, selectedRounds, selectedBestOf, after]);
  const router = useRouter();

  const fetchData = async (age: number, afterOverride?: boolean) => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append('age', age.toFixed(3));
      const afterFlag = typeof afterOverride === 'boolean' ? afterOverride : after;
      if (afterFlag) query.append('after','1');
      selectedSurfaces.forEach(s => query.append('surface', s));
      if (selectedRounds) query.append('round', selectedRounds);
      if (selectedBestOf != null) query.append('best_of', selectedBestOf.toString());

      const url = `/api/records/atage/inslams?${query.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.statusText}`);
      const fetchedData: PlayerData[] = await res.json();
      setData(fetchedData);
      setPage(1);
      setSelectedAge(age);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        if (afterFlag) newQuery.set('after', '1');
        newQuery.set('age', age.toFixed(3));
        selectedSurfaces.forEach(s => newQuery.append('surface', s));
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

        const sameAge = current.get('age') === newQuery.get('age');
        const sameSurface = compareMulti(current, newQuery, 'surface');
        const sameRound = current.get('round') === newQuery.get('round');
        const sameBestOf = current.get('bestOf') === newQuery.get('bestOf');
        const sameAfter = current.get('after') === newQuery.get('after');

        if (!(sameAge && sameSurface && sameRound && sameBestOf && sameAfter)) {
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
      setHasFetched(true);
    }
  };

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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Total</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Australian Open</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Roland Garros</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wimbledon</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">US Open</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={getPlayerHrefWithTab((p as any).slug ?? String(p.id), 'matches')} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.australian}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.french}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.wimbledon}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.us}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const filters: string[] = [];
  if (selectedSurfaces.length > 0) {
    filters.push(`on ${selectedSurfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';
  const headerText = hasFetched ? (selectedRounds ? `Players with most wins in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}` : `Players with most wins in Slams${filterText} ${after ? 'from' : 'at'} ${formatAge(selectedAge)}`) : (description ?? '');

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
          <input type="checkbox" checked={after} onChange={(e) => { const newAfter = e.target.checked; setAfter(newAfter); const ageNow = readAgeFromDom(); fetchData(ageNow, newAfter); }} className="w-4 h-4" />
          <span>After</span>
        </label>
        <button
          onClick={() => { const ageNow = readAgeFromDom(); fetchData(ageNow); }}
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
        title={selectedRounds ? `Wins in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText} at ${formatAge(selectedAge)}` : `Wins in Slams${filterText} at ${formatAge(selectedAge)}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
