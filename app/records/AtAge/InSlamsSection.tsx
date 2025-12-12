'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '../Modal';
import AgeInput from './AgeInput';
import { getFlagFromIOC } from '@/lib/utils';

interface InSlamsSectionProps {
  selectedSurfaces: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
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

export default function InSlamsSection({ selectedSurfaces, selectedRounds, selectedBestOf }: InSlamsSectionProps) {
  const [data, setData] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [inputAge, setInputAge] = useState(25.0);
  const [selectedAge, setSelectedAge] = useState(25.0);

  const perPage = 20;
  const searchParams = useSearchParams();

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
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
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
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
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

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Wins in Slams at Age</h2>

      {/* Age Input */}
      <div className="mb-4 flex items-center gap-2">
        <AgeInput value={inputAge} onChange={setInputAge} />
        <button
          onClick={() => fetchData(inputAge)}
          disabled={loading}
          className={`px-4 py-1 rounded ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
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
      {!loading && !error && data.length === 0 && <div className="text-center py-8 text-gray-300">No data found.</div>}

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
        title={`Wins in Slams at Age ${selectedAge.toFixed(3)}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
