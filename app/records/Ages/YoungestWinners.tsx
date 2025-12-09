'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { iocToIso2, flagEmoji } from "../../../utils/flags";
import Pagination from "../../../components/Pagination";

interface Player {
  id: number;
  name: string;
  ioc?: string;
  age: number;
  event_id: string;
  tourney_id: string;
  tourney_name: string;
  year: string | number;
}

interface YoungestWinnersProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

export default function YoungestWinners({ selectedSurfaces, selectedLevels }: YoungestWinnersProps) {
  const [data, setData] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => {
    setPage(1);
  }, [selectedSurfaces, selectedLevels]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.append("type", "youngest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        const url = `/api/records/ages/winners?${query.toString()}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch youngest winners");
        const fetchedData = await res.json();
        setData(fetchedData.youngestWinners || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels]);

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.floor((age - years) * 365.25);
    return `${years}y ${days}d`;
  };

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      link += `&${key}=${encodeURIComponent(value)}`;
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
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {playersList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;
            const year =
              p.year ||
              (typeof p.tourney_id === "string" ? p.tourney_id.split("-")[1] : "unknown");
            const tourneyId = typeof p.tourney_id === "string" ? p.tourney_id.split("-")[0] : p.tourney_id;

            return (
              <tr key={`${p.id}-${p.event_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={getLink(p.id.toString())} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{formatAge(p.age)}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <Link href={`/tournaments/${encodeURIComponent(tourneyId)}/${year}`} className="text-indigo-300 hover:underline">
                    {p.tourney_name} {year}
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

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data.length)
    return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Youngest Winners</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(currentPlayers, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Youngest Winners">
        {renderTable(data)}
      </Modal>
    </section>
  );
}
