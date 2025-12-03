// app/records/Ages/OldestAllRounds.tsx

'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import Pagination from '../../../components/Pagination';

function formatAge(age: number): string {
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365.25);
  return `${years}y ${days}d`;
}

interface OldestAllRoundsProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

export default function OldestAllRounds({ selectedSurfaces, selectedLevels }: OldestAllRoundsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState<{ title: string; list: any[] } | null>(null);
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.append('type', 'oldest');
        const url = `/api/records/ages/allrounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch oldest all rounds');
        const fetchedData = await res.json();
        setData(fetchedData);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels]);

  const { allOldestItems } = data || {};

  const renderTable = (data: any[]) => (
    <div className="overflow-x-auto rounded border border-gray-700 bg-gray-900 shadow">
      <table className="min-w-full border-collapse text-sm text-gray-200">
        <thead>
          <tr className="bg-gray-800 text-gray-100">
            <th className="border border-gray-700 px-4 py-2 text-left">Player</th>
            <th className="border border-gray-700 px-4 py-2 text-center">Age</th>
            <th className="border border-gray-700 px-4 py-2 text-left">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const tourneyId = String(p.tourney_id).split('-')[1];
            return (
              <tr key={`${p.id}-${p.tourney_id}-${idx}`} className="hover:bg-gray-800">
                <td className="border border-gray-700 px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                    <Link href={`/players/${encodeURIComponent(String(p.id))}`} className="text-blue-400 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-gray-700 px-4 py-2 text-center">{formatAge(p.age)}</td>
                <td className="border border-gray-700 px-4 py-2">
                  <Link href={`/tournaments/${encodeURIComponent(tourneyId)}/${p.year}`} className="text-blue-400 hover:underline">
                    {p.tourney_name} {p.year}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div className="text-gray-300">Loading...</div>;

  const perPage = 10;
  const totalPages = Math.ceil((allOldestItems?.length || 0) / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const currentData = showAll ? allOldestItems : allOldestItems?.slice(start, end);

  return (
    <section className="border border-gray-700 rounded p-4 bg-gray-900 text-gray-200 shadow">
      <h3 className="text-xl font-semibold mb-4 text-gray-100">Top 10 Oldest Players per Round</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {currentData && currentData.map(item => (
          <div key={item.title} className="border border-gray-700 rounded bg-gray-900 shadow p-4">
            <h4 className="font-medium mb-3 text-base text-gray-100">{item.title}</h4>
            {item.list && item.list.length > 0 ? (
              <>
                {renderTable(item.list)}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => setModalData({ title: `All ${item.title}`, list: item.fullList })}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    View All
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-sm">No data available.</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            const newShowAll = !showAll;
            setShowAll(newShowAll);
            if (!newShowAll) setPage(1);
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
        >
          {showAll ? "Show Paginated" : "Show All"}
        </button>
      </div>

      {!showAll && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}

      {modalData && <Modal title={modalData.title} data={modalData.list} onClose={() => setModalData(null)} />}
    </section>
  );
}

// --- Modal ---
function Modal({ title, data, onClose }: { title: string; data: any[]; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 text-gray-200 p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded shadow-xl border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">{title}</h2>

        <div className="overflow-x-auto rounded border border-gray-700 bg-gray-900">
          <table className="min-w-full border-collapse text-sm text-gray-200">
            <thead>
              <tr className="bg-gray-800 text-gray-100">
                <th className="border border-gray-700 px-4 py-2 text-left">Player</th>
                <th className="border border-gray-700 px-4 py-2 text-center">Age</th>
                <th className="border border-gray-700 px-4 py-2 text-left">Tournament</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p, idx) => {
                const tourneyId = String(p.tourney_id).split('-')[1];
                return (
                  <tr key={`${p.id}-${p.tourney_id}-${idx}`} className="hover:bg-gray-800">
                    <td className="border border-gray-700 px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{flagEmoji(iocToIso2(p.ioc)) || ""}</span>
                        <Link href={`/players/${encodeURIComponent(String(p.id))}`} className="text-blue-400 hover:underline">
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="border border-gray-700 px-4 py-2 text-center">{formatAge(p.age)}</td>
                    <td className="border border-gray-700 px-4 py-2">
                      <Link href={`/tournaments/${encodeURIComponent(tourneyId)}/${p.year}`} className="text-blue-400 hover:underline">
                        {p.tourney_name} {p.year}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
