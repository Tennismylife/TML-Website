'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '@/utils/flags';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';

interface TimespanEntry {
  player_id: string;
  player_name: string;
  ioc?: string | null;
  overall_timespan?: any[];
  surface_timespan?: any[];
  level_timespan?: any[];
}

interface EntriesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

export default function EntriesSection({ selectedSurfaces, selectedLevels }: EntriesSectionProps) {
  const [entries, setEntries] = useState<TimespanEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 10;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.set('perPage', '100'); // fetch top 100
        const url = `/api/records/timespan/entries?${query.toString()}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch entries');
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        console.error(err);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedSurfaces, selectedLevels]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!entries.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(entries.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = entries.slice(start, start + perPage);

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (key !== 'tab') link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const getTimespans = (entry: TimespanEntry) => {
    if (selectedSurfaces.length) return entry.surface_timespan ?? [];
    if (selectedLevels.length) return entry.level_timespan ?? [];
    return entry.overall_timespan ?? [];
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toISOString().slice(0, 10);

  const renderTable = (data: TimespanEntry[], startIndex = 0) => (
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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan</th>
          </tr>
        </thead>
        <tbody>
          {data.map((entry, idx) => {
            const globalRank = startIndex + idx + 1;
            const timespans = getTimespans(entry);

            return timespans.map((ts, tsIdx) => (
              <tr key={`${entry.player_id}-${tsIdx}`} className="hover:bg-gray-800 border-b border-white/10">
                {tsIdx === 0 && (
                  <>
                    <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-400 font-semibold" rowSpan={timespans.length}>{globalRank}</td>
                    <td className="border border-white/10 px-4 py-2 text-lg text-gray-200 flex items-center gap-2 font-medium" rowSpan={timespans.length}>
                      {entry.ioc && <span className="text-base">{flagEmoji(iocToIso2(entry.ioc))}</span>}
                      <Link href={getLink(entry.player_id)} className="text-indigo-300 hover:underline">{entry.player_name}</Link>
                    </td>
                  </>
                )}
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">{ts.first_tourney_name}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{formatDate(ts.first_tourney_date)}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">{ts.last_tourney_name}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-300">{formatDate(ts.last_tourney_date)}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300 font-semibold">{ts.days_between}</td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );

  const Modal = ({ show, onClose, title, children }: { show: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
    if (!show) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800" onClick={e => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          {children}
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500">Close</button>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top 100 Timespans">
        {renderTable(entries)}
      </Modal>
    </section>
  );
}
