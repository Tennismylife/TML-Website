"use client";

import { useState, useEffect } from "react";
import { flagEmoji, iocToIso2 } from "@/utils/flags";
import Pagination from "@/components/Pagination";
import Link from "next/link";

interface Player {
  id?: string;
  name: string;
  ioc?: string;
  weeks: number;
  startDate?: string;
  endDate?: string;
}

export default function StreakCount() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [rank, setRank] = useState(1); // Rank selezionato
  const perPage = 20;

  useEffect(() => {
    const fetchData = async () => {
      setPage(1); // reset pagina prima del fetch
      setLoading(true);
      try {
        const res = await fetch(`/api/recordsranking/streak/count?rank=${rank}`);
        const data = await res.json();
        setPlayers(data || []);
      } catch (err) {
        console.error(err);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [rank]);

  const totalPages = Math.ceil(players.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = players.slice(start, start + perPage);

  const renderTable = () => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start Date</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End Date</th>
          </tr>
        </thead>
        <tbody>
          {paginatedPlayers.map((p, idx) => {
            const globalRank = start + idx + 1;
            const flag = p.ioc ? flagEmoji(iocToIso2(p.ioc)) : null;
            return (
              <tr key={p.id ?? `${p.name}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    {p.id ? (
                      <Link href={`/players/${p.id}`} className="hover:underline">{p.name}</Link>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate ?? "-"}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate ?? "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Consecutive Weeks at Rank
      </h2>

      {/* Dropdown per selezionare rank a sinistra */}
      <div className="flex justify-start mb-6 ml-4 items-center">
        <label className="text-gray-200 font-medium mr-2">Select Rank:</label>
        <select
          value={rank}
          onChange={(e) => setRank(Number(e.target.value))}
          className="px-3 py-1 bg-gray-800 text-gray-200 border border-gray-600 rounded"
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-300">Loading...</div>
      ) : (
        renderTable()
      )}
    </section>
  );
}
