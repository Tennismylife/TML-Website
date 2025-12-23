"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
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
  topTitles: PlayerData[];
  description?: string;
}

export default function Titles({ topTitles, description }: TitlesProps) {
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
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

  useEffect(() => setPage(1), [topTitles]);

  if (!topTitles || topTitles.length === 0) {
    return <div className="text-center py-8 text-gray-300">No data available.</div>;
  }

  const totalPages = Math.ceil(topTitles.length / perPage);
  const start = (page - 1) * perPage;
  const currentData = topTitles.slice(start, start + perPage);

  const getLink = (playerId: string) => {
    const params: Record<string, string> = { tab: 'tournaments', round: 'W' };
    for (const [key, value] of searchParams.entries()) {
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
            const flag = p.ioc ? getFlagFromIOC(p.ioc) : null;
            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
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
        <div className="text-center text-4xl font-bold text-white mb-6">
          {description}
        </div>
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
        {renderTable(topTitles)}
      </Modal>
    </section>
  );
}
