'use client'

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import AgeInput from './AgeInput';
import Flag from '@/components/Flag';
import { playerMatchesUrl } from "../nav";
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

  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => {
    setInputAge(safeInitialAge);
    setSelectedAge(safeInitialAge);
    if (Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialAge, initialData]);
  const router = useRouter();

  const fetchData = async (age: number) => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append('age', age.toFixed(3));
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

        if (!(sameAge && sameSurface && sameRound && sameBestOf)) {
          router.replace(`${path}?${newQuery.toString()}`);
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

  const getPlayerLink = (playerId: string) => {
    let link = playerMatchesUrl(playerId);
    for (const [key, value] of (searchParams?.entries() ?? [])) {
      if (!value || key === "tab") continue;
      link += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (players: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
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
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    <Flag ioc={p.ioc} className="text-base" />
                    <Link href={getPlayerLink(p.id)} className="text-indigo-300 hover:underline">{p.name}</Link>
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
  const headerText = hasFetched ? (selectedRounds ? `Players with most wins in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText} at ${formatAge(selectedAge)}` : `Players with most wins in Slams${filterText} at ${formatAge(selectedAge)}`) : (description ?? '');

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
        <button
          onClick={() => fetchData(inputAge)}
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
        title={selectedRounds ? `Wins in ${roundAbbreviations[selectedRounds] || selectedRounds + 's'} in Slams${filterText} at ${formatAge(selectedAge)}` : `Wins in Slams${filterText} at ${formatAge(selectedAge)}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
