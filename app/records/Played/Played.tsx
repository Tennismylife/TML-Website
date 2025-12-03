"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { iocToIso2, flagEmoji } from "../../../utils/flags";
import Pagination from "../../../components/Pagination";

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
  const perPage = 10;

  // Reset page to 1 every time filters change
  useEffect(() => {
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.delete("page"); // remove page param since we're fetching all at once

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

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches&result=Played`;
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      if (key === "bestOf") {
        const bestOfValues = value.split(",").filter(Boolean);
        if (bestOfValues.length === 1) {
          const bo = bestOfValues[0];
          if (bo === "3") link += "&set=All+Best+of+3";
          else if (bo === "5") link += "&set=All+Best+of+5";
          else if (bo === "1") link += "&set=All+Best+of+1";
        }
      } else {
        link += `&${key}=${encodeURIComponent(value)}`;
      }
    }
    return link;
  };

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
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;

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

  const Modal = ({
    show,
    onClose,
    title,
    children,
  }: {
    show: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!show) return null;
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          {children}
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

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
