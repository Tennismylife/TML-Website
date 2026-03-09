'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from "@/lib/utils";
import Pagination from "../../../components/Pagination";

interface TitlesProps {
  // Accept both Set<string> and string[] to be more flexible with callers
  selectedSurfaces: Set<string> | string[];
  selectedLevels: Set<string> | string[];
  minEntries: number;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
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

export default function Titles({ selectedSurfaces, selectedLevels, minEntries, fetchEnabled, fetchRequestId, description, initialData }: TitlesProps) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<PlayerStat[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20; 

  useEffect(() => {
    // If SSR passed `initialData`, trigger client fetch on mount so the
    // client replaces SSR top‑10 with the full `limit=100` result set.
    const shouldFetch = ((enabled && fetchRequestId) || showModal || (Array.isArray(initialData) && initialData.length > 0))
    if (!shouldFetch) {
      if (Array.isArray(initialData)) setData(initialData)
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));

        query.set('limit', showModal ? '1000' : '100');
        const queryString = query.toString();
        const url = `/api/records/roundsonentries/titles${queryString ? `?${queryString}` : ""}`;
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
  }, [selectedSurfaces, selectedLevels, enabled, showModal, fetchRequestId, initialData]);

  const filteredData = data.filter((p) => p.entries >= minEntries);

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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
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
                    <Flag ioc={p.ioc ?? undefined} className="w-4 h-3" />
                    <Link href={getPlayerHrefWithTab((p as any).slug ?? String(p.id), 'matches')} className="text-indigo-300 hover:underline">
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
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            try { e.preventDefault(); e.stopPropagation(); } catch (ex) {}
            try {
              const state = { modal: true, background: window.location.pathname, section: 'roundsonentries', title: null };
              try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}
              const newPath = `/records/roundsonentries/titles`;
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


    </section>
  );
}
