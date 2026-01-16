"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Flag from '@/components/Flag';
import { useSearchParams } from "next/navigation";
import Pagination from '../../../components/Pagination';
import { playerTournamentsUrl } from "../nav";
import Modal from "@/components/Modal";

interface PlayerData {
  name: string;
  ioc: string;
  count: number;
  id: string;
}

interface TitlesProps {
  selectedSurfaces?: Set<string>;
  selectedLevels?: Set<string>;
  topTitles?: PlayerData[];
  fetchEnabled?: boolean;
  description?: string;
}

export default function Titles({ selectedSurfaces, selectedLevels, topTitles, fetchEnabled, description }: TitlesProps) {
  const enabled = !!fetchEnabled;
  const [allTitles, setAllTitles] = useState<PlayerData[]>(Array.isArray(topTitles) ? topTitles : []);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent)?.detail;
      if (d?.resetPage) setPage(1);
    };
    window.addEventListener('records:reset', handler as EventListener);
    return () => window.removeEventListener('records:reset', handler as EventListener);
  }, []);

  useEffect(() => setPage(1), [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      if (!enabled && !showModal) {
        if (Array.isArray(topTitles) && topTitles.length) setAllTitles(topTitles);
        else setAllTitles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();

        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        else Array.from(searchParams?.entries() ?? []).forEach(([k, v]) => { if (k === 'surface') params.append(k, v); });

        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        else Array.from(searchParams?.entries() ?? []).forEach(([k, v]) => { if (k === 'level') params.append(k, v); });

        params.set('perPage', showModal ? '1000' : '100');
        params.delete('page');

        if (!showModal && Array.isArray(topTitles) && topTitles.length) {
          setAllTitles(topTitles);
        } else {
          const res = await fetch(`/api/records/titles?${params.toString()}`);
          const data = await res.json();
          const rows = Array.isArray(data.topTitles) ? data.topTitles : [];
          setAllTitles(rows);
        }
      } catch (err) {
        console.error(err);
        setAllTitles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [searchParams, enabled, showModal, topTitles, selectedSurfaces, selectedLevels]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allTitles.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(allTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = allTitles.slice(start, start + perPage);

  const getLink = (playerId: string) => {
    const params: Record<string, string> = { tab: 'tournaments', round: 'W' };
    for (const [key, value] of (searchParams?.entries() ?? [])) {
      if (key !== 'tab' && key !== 'round') params[key] = value;
    }
    return playerTournamentsUrl(playerId, params as any);
  };

  const renderTable = (data: PlayerData[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Titles</th>
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
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={`/players/${p.id}`} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={getLink(p.id)} className="text-indigo-300 hover:underline">
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
        title="Players with Most Titles"
      >
        {renderTable(allTitles)}
      </Modal>
    </section>
  );
}
