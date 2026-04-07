'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from "@/lib/utils";
import { playerSurfaceHref, surfaceFromSelection } from "../nav";
import Pagination from "../../../components/Pagination";
import Modal from '@/components/Modal';

interface RoundsProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  minEntries: number;
  description?: string;
  initialData?: PlayerStat[];
}

interface PlayerStat {
  id: string;
  name: string;
  ioc?: string;
  wins: number;
  entries: number;
  percentage: number;
}

export default function Rounds({ selectedSurfaces, selectedLevels, selectedRounds, minEntries, fetchEnabled, fetchRequestId, description, initialData }: RoundsProps & { fetchEnabled?: boolean; fetchRequestId?: string | null; description?: string; initialData?: PlayerStat[] }) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<PlayerStat[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  
  const perPage = 20;
  const surfaceLink = surfaceFromSelection(selectedSurfaces);
  useEffect(() => {
    if (!selectedRounds) {
      setData([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // If SSR passed `initialData`, trigger client fetch on mount so the
      // client replaces SSR top‑10 with the full `limit=100` result set.
      const shouldFetch = ((enabled && fetchRequestId) || showModal || (Array.isArray(initialData) && initialData.length > 0))
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setData(initialData)
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        query.set('limit', showModal ? '1000' : '100');

        const queryString = query.toString();
        const url =
          `/api/records/roundsonentries/rounds?round=${selectedRounds}` +
          (queryString ? `&${queryString}` : "");

      const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch data");
        const json = await res.json();
        setData(json.FinalWins || []);
        setPage(1);
      } catch (err) {
        console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedRounds, Array.from(selectedSurfaces).join(","), Array.from(selectedLevels).join(","), enabled, showModal, fetchRequestId, initialData]);

  const filteredData = data.filter(p => p.entries >= minEntries);

  if (!selectedRounds) return <div className="text-center py-8 text-gray-300">Please select a round to view results.</div>;
  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!filteredData.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentData = filteredData.slice(start, start + perPage);

  const renderTable = (players: PlayerStat[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Reaches</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Entries</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const rank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{rank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                    <Link href={playerSurfaceHref((p as any).slug ?? String(p.id), surfaceLink)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.wins}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.entries}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {p.percentage.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      {/* VIEW ALL BUTTON */}
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch (ex) {}
            try {
              const state = { modal: true, background: window.location.pathname, section: 'roundsonentries', title: selectedRounds };
              try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}
              const newPath = `/records/roundsonentries/rounds?round=${encodeURIComponent(String(selectedRounds))}`;
              try { window.history.replaceState(state, '', newPath); } catch (e) {}
              try { window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
            } catch (err) {}
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentData, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* MODAL UNIFORME */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title="All Players">
        {renderTable(filteredData)}
      </Modal>
    </section>
  );
}
