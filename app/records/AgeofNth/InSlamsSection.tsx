'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from "@/components/Flag";
import { toOrdinal, getPlayerHrefWithTab } from "@/lib/utils"; 

interface InSlamsSectionProps {
  selectedSurfaces: Set<string>;
  selectedRounds: string;
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
  age_nth_win: string | number;
  perSlam: {
    'Australian Open': number;
    'Roland Garros': number;
    Wimbledon: number;
    'US Open': number;
  };
}

function formatAge(ageDecimal: string | number): string {
  if (ageDecimal == null) return "-";
  const age = typeof ageDecimal === "string" ? parseFloat(ageDecimal) : ageDecimal;
  if (Number.isNaN(age)) return "-";

  const years = Math.floor(age);
  const days = Math.floor((age - years) * 365.25);
  return `${years}y ${days}d`;
}

const roundAbbreviations: Record<string, string> = {
  R128: "R128s",
  R64: "R64s",
  R32: "R32s",
  R16: "R16s",
  QF: "QFs",
  SF: "SFs",
  F: "Fs",
};

function NInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
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

export default function InSlamsSection({ selectedSurfaces, selectedRounds, fetchEnabled, setFetchEnabled, fetchRequestId, description, initialData, initialNth }: InSlamsSectionProps) {
  const enabled = !!fetchEnabled;
  const safeInitialNth = Number.isFinite(initialNth) ? (initialNth as number) : 50;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? formatData(initialData) : []);
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

  function formatData(items: any[]): Player[] {
    return Array.isArray(items)
      ? items.map((p: any) => ({
          ...p,
          age_nth_win: formatAge(p.age_nth_win),
        }))
      : [];
  }

  useEffect(() => {
    setInputN(safeInitialNth);
    setSelectedN(safeInitialNth);
    if (!hasFetched && Array.isArray(initialData)) {
      const normalized = formatData(initialData);
      setData(normalized);
      setHasFetched(normalized.length > 0);
    }
  }, [safeInitialNth, initialData, hasFetched]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedRounds]);

  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal || (Array.isArray(initialData) && initialData.length > 0));
    if (!shouldFetch) {
      if (!hasFetched && Array.isArray(initialData)) {
        const normalized = formatData(initialData);
        setData(normalized);
        setHasFetched(normalized.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    const forceFetch = showModal || (Array.isArray(initialData) && initialData.length > 0);
    fetchData(selectedN, showModal ? 1000 : 100, forceFetch);
  }, [enabled, fetchRequestId, showModal, selectedN, selectedSurfaces, selectedRounds, initialData, hasFetched]);

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
      if (selectedRounds) query.append("round", selectedRounds);
      query.set('limit', String(limit));

      const res = await fetch(`/api/records/ageofnth/inslams?${query.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const fetchedData = await res.json();
      const normalized = formatData(fetchedData);

      setData(force ? normalized : normalized.slice(0, 100));
      setPage(1);
      setSelectedN(n);
      setHasFetched(true);

      try {
        const path = window.location.pathname;
        const newQuery = new URLSearchParams();
        newQuery.set('n', String(n));
        Array.from(selectedSurfaces).forEach(s => newQuery.append('surface', s));
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
        const sameRound = current.get('round') === newQuery.get('round');

        if (!(sameN && sameSurface && sameRound)) {
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

  const totalCount = Array.isArray(data) ? data.length : 0;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const playersPage = Array.isArray(data) ? data.slice(start, start + perPage) : [];



  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">{selectedRounds ? `Age of ${toOrdinal(selectedN)} Win in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams` : `Age of ${toOrdinal(selectedN)} Win in Slams`}</th>
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
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.age_nth_win || '-'}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.perSlam['Australian Open']}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.perSlam['Roland Garros']}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.perSlam['Wimbledon']}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.perSlam['US Open']}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const filters: string[] = [];
  if (selectedSurfaces && selectedSurfaces.size > 0) {
    const surfaces = Array.from(selectedSurfaces).map(s => s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? (selectedRounds ? `Age of ${toOrdinal(selectedN)} Win in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText}` : `Age of ${toOrdinal(selectedN)} Win in Slams${filterText}`) : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{headerText}</h2>} 

      <div className="mb-4 flex items-center gap-2">
        <NInput value={inputN} onChange={setInputN} />
        <button
          onClick={() => {
            const nEl = document.querySelector('[data-testid="nth-input"]') as HTMLInputElement | null;
            const n = nEl ? Number(nEl.value) : inputN;
            if (!Number.isFinite(n) || n <= 0) return;
            setInputN(n);
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

      {!loading && data.length > 0 && renderTable(playersPage, start)}

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={selectedRounds ? `Age of ${toOrdinal(selectedN)} Win in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText}` : `Age of ${toOrdinal(selectedN)} Win in Slams${filterText}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
