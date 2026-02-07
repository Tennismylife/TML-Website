"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Flag from '@/components/Flag';
import { getPlayerHrefWithTab } from '@/lib/utils';
import { playerTournamentsUrl } from '../nav';
import Pagination from '../../../components/Pagination';
import Modal from "@/components/Modal";

interface PlayerData {
  name: string;
  ioc: string;
  count: number;
  id: string;
  slug?: string | null;
}

interface CountProps {
  selectedRounds?: string;
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  selectedBestOf?: number | null;
  topCount?: PlayerData[];
  fetchEnabled?: boolean;
  description?: string;
}

export default function Count({ selectedRounds, selectedSurfaces, selectedLevels, selectedBestOf, topCount, fetchEnabled, description }: CountProps) {
  const enabled = !!fetchEnabled;
  const [allPlayers, setAllPlayers] = useState<PlayerData[]>(Array.isArray(topCount) ? topCount : []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => {
    const handler = (e: Event) => { if ((e as CustomEvent)?.detail?.resetPage) setPage(1); };
    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  // Reset page when filters change
  useEffect(() => setPage(1), [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!enabled && !showModal) {
        if (Array.isArray(topCount) && topCount.length) {
          setAllPlayers(topCount);
        } else {
          setAllPlayers([]);
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();

        // Prefer explicit props, fallback to URL search params
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
else Array.from(searchParams?.entries() ?? []).forEach(([k, v]) => { if (k === 'surface') params.append(k, v); });

        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
else Array.from(searchParams?.entries() ?? []).forEach(([k, v]) => { if (k === 'level') params.append(k, v); });

        if (selectedRounds !== undefined) { if (selectedRounds) params.set('round', selectedRounds); }
        else { const r = searchParams?.get('round'); if (r) params.set('round', r); }

        if (selectedBestOf !== undefined) { if (selectedBestOf !== null) params.set('bestOf', String(selectedBestOf)); }
        else { const b = searchParams?.get('bestOf'); if (b) params.set('bestOf', b); }

        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        if (!showModal && Array.isArray(topCount) && topCount.length) {
          setAllPlayers(topCount);
        } else {
          const res = await fetch(`/api/records/count?${params.toString()}`);
          const data = await res.json();
          const rows = Array.isArray(data.top) ? data.top : [];
          setAllPlayers(rows);
        }
      } catch (err) {
        console.error(err);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, enabled, showModal, topCount, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allPlayers.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(allPlayers.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allPlayers.slice(start, start + perPage);





  const renderTable = (data: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Appearances</th>
          </tr>
        </thead>
        <tbody>
          {data.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3 inline-block" />
                    <Link href={getPlayerHrefWithTab((p as any).slug ?? String(p.id), 'matches')} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={playerTournamentsUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">
                    {p.count}
                  </Link>
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

      {totalPages > 1 && !showModal && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Players with Most Appearances"
      >
        {renderTable(allPlayers)}
      </Modal>
    </section>
  );
}
