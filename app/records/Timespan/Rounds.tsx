'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import { iocToIso2, flagEmoji } from '../../../utils/flags';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';

interface RoundsProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
}

export default function Rounds({ selectedSurfaces, selectedLevels, selectedRounds }: RoundsProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        if (selectedRounds) query.append('round', selectedRounds);
        query.set('perPage', '100'); // fetch top 100
        const url = `/api/records/timespan/rounds?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds timespan');
        const fetchedData = await res.json();
        setData(fetchedData.data);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = data.slice(start, start + perPage);

  const getTitle = () => `Biggest timespan between ${selectedRounds} rounds`;

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== "tab") link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (rows: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First Tournament</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">First Date</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last Tournament</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Last Date</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-indigo-300">Timespan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-400 font-semibold">{globalIdx}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getLink(p.id)} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">{p.firstTourney}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{p.firstDate}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">{p.lastTourney}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{p.lastDate}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300 font-semibold">{p.spanDays}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const Modal = ({ show, onClose, children }: { show: boolean; onClose: () => void; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800" onClick={e => e.stopPropagation()}>
          {children}
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500">Close</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">{getTitle()}</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <Modal show={showModal} onClose={() => setShowModal(false)}>
        {renderTable(data)}
      </Modal>
    </section>
  );
}
