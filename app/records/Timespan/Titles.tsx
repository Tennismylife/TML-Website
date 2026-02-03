'use client'

import Link from "next/link";
import { useState, useEffect } from "react";
import Flag from '@/components/Flag';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { playerMatchesUrl } from "../nav";

interface TitlesProps {
  selectedSurfaces: Set<string> | string[];
  selectedLevels: Set<string> | string[];
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: any[];
}

export default function Titles({
  selectedSurfaces,
  selectedLevels,
  fetchEnabled,
  fetchRequestId,
  description,
  initialData
}: TitlesProps) {
  const [data, setData] = useState<any[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels]);

  // Only fetch when explicitly requested (enabled) or when the modal is opened (lazy load on "View All")
  const enabled = !!fetchEnabled;

  useEffect(() => {
    if (!(enabled || showModal)) {
      if (Array.isArray(initialData)) setData(initialData);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach(s => query.append('surface', s));
        selectedLevels.forEach(l => query.append('level', l));
        query.set('limit', showModal ? '1000' : '100');
        const url = `/api/records/timespan/titles?${query.toString()}`;
        // fetching titles list
        const res = await fetch(url);
        if (!res.ok) throw new Error('Failed to fetch titles');
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
  }, [selectedSurfaces, selectedLevels, enabled, showModal, initialData]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;

  // If prefetch provided data, render it even when fetch is disabled.
  if (!data.length) {
    if (!enabled && !showModal) {
      return (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-200">Biggest Timespan Between 2 Titles</h2>
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              View All
            </button>
          </div>
          <div className="text-center py-8 text-gray-300">Clicca "View All" per caricare i dati.</div>
        </section>
      );
    }
    return <div className="text-center py-8 text-gray-300">No data available.</div>;
  }

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = data.slice(start, start + perPage);



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
                  <Flag ioc={p.ioc} className="w-4 h-3" />
                  <Link href={playerMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-gray-300 hover:underline">{p.name}</Link>
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
        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          {description}
        </h1>
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

      <Modal show={showModal} onClose={() => setShowModal(false)} title={description ?? 'Biggest Timespan Between 2 Titles'}>
        {renderTable(data)}
      </Modal>
    </section>
  );
}
