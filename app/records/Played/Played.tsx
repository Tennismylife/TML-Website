"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getFlagFromIOC } from "@/lib/utils";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";

interface Player {
  id: string;
  name: string;
  ioc?: string;
  totalPlayed: number;
}

export default function Played({ topPlayed, fetchEnabled, description, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf }: { topPlayed?: any[]; fetchEnabled?: boolean; description?: string; selectedSurfaces?: Set<string>; selectedLevels?: Set<string>; selectedRounds?: string; selectedBestOf?: number | null }) {
  const enabled = !!fetchEnabled;
  const [allPlayers, setAllPlayers] = useState<Player[]>(topPlayed || []);
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

  // Fetch players
  useEffect(() => {
    const fetchPlayers = async () => {
      if (!enabled && !showModal && !(topPlayed && topPlayed.length)) {
        setAllPlayers([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // prefer explicit props for filters
        const params = new URLSearchParams();
        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
        else Array.from(searchParams.entries()).forEach(([k,v]) => { if (k === 'surface') params.append(k, v); });

        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        else Array.from(searchParams.entries()).forEach(([k,v]) => { if (k === 'level') params.append(k, v); });

        if (selectedRounds !== undefined) { if (selectedRounds) params.set('round', selectedRounds); }
        else { const r = searchParams.get('round'); if (r) params.set('round', r); }

        if (selectedBestOf !== undefined) { if (selectedBestOf !== null) params.set('bestOf', String(selectedBestOf)); }
        else { const b = searchParams.get('bestOf'); if (b) params.set('bestOf', b); }

        params.set("perPage", showModal ? "1000" : "100");
        params.delete("page"); // remove page param

        // If topPlayed is provided by the server and we're not in 'View All' mode, use it
        // Otherwise perform a client fetch so the UI shows data even if server prefetch failed.
        if (!showModal && topPlayed && topPlayed.length) {
          setAllPlayers(topPlayed || []);
        } else {
          const res = await fetch(`/api/records/played?${params.toString()}`);
          const data = await res.json();
          setAllPlayers(data.players || []);
        }
      } catch (err) {
        console.error(err);
        setAllPlayers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [searchParams, enabled, showModal, topPlayed, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

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
