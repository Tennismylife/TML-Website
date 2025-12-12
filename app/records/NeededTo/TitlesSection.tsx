'use client';

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "../Modal";
import { getFlagFromIOC } from "@/lib/utils";

interface TitlesSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
}

interface Player {
  player_id: string;
  player_name: string;
  ioc?: string;
  titles: number;
  tournaments_played: number;
}

function NInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      className="w-24 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export default function TitlesSection({ selectedSurfaces, selectedLevels }: TitlesSectionProps) {
  const [data, setData] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const [inputN, setInputN] = useState(1);
  const [selectedN, setSelectedN] = useState(1);

  const searchParams = useSearchParams();
  const perPage = 20;

  const fetchData = async (n: number) => {
    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append("maxTitles", n.toString());
      selectedSurfaces.forEach(s => query.append("surface", s));
      selectedLevels.forEach(l => query.append("level", l));

      const res = await fetch(`/api/records/neededto/titles?${query.toString()}`);
      const fetchedData: Player[] = await res.json();
      setData(fetchedData.sort((a, b) => a.tournaments_played - b.tournaments_played));
      setPage(1);
      setSelectedN(n);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const playersPage = data.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Title N</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournaments Played</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";
            return (
              <tr key={p.player_id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 flex items-center gap-2 text-lg text-gray-200">
                  {flag && <span className="text-base">{flag}</span>}
                  <Link href={getPlayerLink(p.player_id)} className="text-indigo-300 hover:underline">{p.player_name}</Link>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.titles}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.tournaments_played}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Tournaments Played to Reach Title N
      </h2>

      <div className="mb-4 flex items-center gap-2">
        <NInput value={inputN} onChange={setInputN} />
        <button
          onClick={() => fetchData(inputN)}
          disabled={loading}
          className={`px-4 py-1 rounded ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
        >
          Apply
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-300">Loading...</div>}
      {error && <div className="text-red-600 text-center py-2">{error}</div>}
      {!loading && data.length === 0 && <div className="text-center py-8 text-gray-300">No data found.</div>}

      {!loading && data.length > 0 && renderTable(playersPage, start)}

      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {data.length > perPage && (
        <Modal show={showModal} onClose={() => setShowModal(false)} title={`Tournaments Played to Reach Title ${selectedN}`}>
          {renderTable(data)}
        </Modal>
      )}
    </section>
  );
}
