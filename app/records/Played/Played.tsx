"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
import Pagination from "../../../components/Pagination";
import Modal from "../Modal";

interface Player {
  id: string;
  name: string;
  ioc?: string;
  totalPlayed: number;
}

export default function Played() {
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  // Reset page when filters change
  useEffect(() => setPage(1), [searchParams]);

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.delete("page"); // remove page param

        const res = await fetch(`/api/records/played?${params.toString()}`);
        const data = await res.json();
        setAllPlayers(data.players || []);
      } catch (err) {
        console.error(err);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [searchParams]);

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allPlayers.length)
    return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = allPlayers.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const players = allPlayers.slice(start, end);

  // Generate player link with filters
  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches&result=Played`;
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      if (key === "bestOf") {
        const bestOfValues = value.split(",").filter(Boolean);
        const boMap: Record<string, string> = { "1": "All+Best+of+1", "3": "All+Best+of+3", "5": "All+Best+of+5" };
        if (bestOfValues.length === 1) link += `&set=${boMap[bestOfValues[0]]}`;
      } else {
        link += `&${key}=${encodeURIComponent(value)}`;
      }
    }
    return link;
  };

  // Render table of players
  const renderTable = (playersList: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
          </tr>
        </thead>
        <tbody>
          {playersList.map((p, idx) => {
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
                    {p.totalPlayed}
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Players with Most Career Matches Played</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(players, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Players with Most Career Games Played"
      >
        {renderTable(allPlayers)}
      </Modal>
    </section>
  );
}
