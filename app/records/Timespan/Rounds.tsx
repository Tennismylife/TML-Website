'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import Flag from '@/components/Flag';
import { getPlayerHref } from "@/lib/utils";
import { playerMatchesUrl } from "../nav";
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';

interface RoundsProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  description?: string;
  initialData?: any[];
}

const Rounds = ({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, fetchRequestId, description, initialData }: RoundsProps & { fetchEnabled?: boolean, fetchRequestId?: string | null, description?: string, initialData?: any[] }) => {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<any[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const fetchData = async () => {
      // The API requires a `round` parameter — avoid calling it when none is selected
      if (!selectedRounds) {
        setData([]);
        setLoading(false);
        return;
      }

      // Trigger client fetch on mount when server provided `initialData`
      // so SSR top‑10 is replaced by the client's `perPage=100` response.
      const shouldFetch = showModal || (enabled && fetchRequestId) || (!enabled && fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0)
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setData(initialData);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.append('round', selectedRounds);
        query.set('perPage', showModal ? '1000' : '100');
        const url = `/api/records/timespan/rounds?${query.toString()}`;
        // fetching rounds list
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch rounds timespan');
        const fetchedData = await res.json();
        setData(fetchedData.data || []);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, fetchRequestId, showModal, initialData]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!selectedRounds) return <div className="text-center py-8 text-gray-300">Please select rounds in the filters to view results.</div>;
  if (!data.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = data.slice(start, start + perPage);

  const getTitle = () => `Biggest timespan between ${selectedRounds} rounds`;



  const renderTable = (rows: any[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-gray-800 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">#</th>
            <th className="border border-gray-800 px-4 py-2 text-left text-lg text-gray-300">Player</th>
            <th className="border border-gray-800 px-4 py-2 text-left text-lg text-gray-300">First Tournament</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">First Date</th>
            <th className="border border-gray-800 px-4 py-2 text-left text-lg text-gray-300">Last Tournament</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Last Date</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Timespan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, idx) => {
            const globalIdx = startIndex + idx + 1;
            return (
              <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-gray-800">
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium">{globalIdx}</td>
                <td className="border border-gray-800 px-4 py-2 text-lg text-gray-200 flex items-center gap-2">
                  {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                  <Link href={playerMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">{p.name}</Link>
                </td>
                <td className="border border-gray-800 px-4 py-2 text-lg text-gray-200">{p.firstTourney}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">{p.firstDate}</td>
                <td className="border border-gray-800 px-4 py-2 text-lg text-gray-200">{p.lastTourney}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">{p.lastDate}</td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300 font-medium">{p.spanDays}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {description && (
        <h2 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h2>
      )}

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

      <Modal show={showModal} onClose={() => setShowModal(false)} title={description || "All Timespans"}>
        {renderTable(data)}
      </Modal>
    </section>
  );
};

export default Rounds;
