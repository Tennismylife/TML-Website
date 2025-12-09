"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import { getFlagFromIOC, } from "@/lib/utils";

interface Winner {
  id: string;
  name: string;
  ioc?: string;
  wins: number;
}

export default function Wins() {
  const [allWinners, setAllWinners] = useState<Winner[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  // Reset page to 1 every time filters change
  useEffect(() => {
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const fetchWinners = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(Array.from(searchParams.entries()));
        params.set("perPage", "100"); // fetch first 100
        params.delete("page"); // remove page param

        const res = await fetch(`/api/records/wins?${params.toString()}`);
        const data = await res.json();
        setAllWinners(data.topWinners || []);
      } catch (err) {
        console.error(err);
        setAllWinners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWinners();
  }, [searchParams]);

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allWinners.length)
    return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = allWinners.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const winners = allWinners.slice(start, end);

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches&result=Win`;
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

  const renderTable = (winnersList: Winner[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
          </tr>
        </thead>
        <tbody>
          {winnersList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";

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
                    {p.wins}
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
    <section className="mb-0">
      <div className="flex justify-end mb-0">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(winners, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Players with Most Career Wins"
      >
        {renderTable(allWinners)}
      </Modal>
    </section>
  );
}
