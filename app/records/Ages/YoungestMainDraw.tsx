'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Flag from '@/components/Flag';
import { getTourneyHref } from "@/lib/utils";
import { playerSurfaceOrMatchesUrl } from "../nav";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";

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

interface YoungestMainDrawProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string;
  fetchEnabled?: boolean;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
}

export default function YoungestMainDraw({ selectedSurfaces, selectedLevels, selectedRounds, fetchEnabled, fetchRequestId, description, initialData }: YoungestMainDrawProps) {
  const enabled = !!fetchEnabled;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      // Always re-fetch on mount when server provided `initialData` so the
      // client replaces SSR top‑10 with the full (limit=100) result set.
      const shouldFetch = showModal || (enabled && fetchRequestId) || (Array.isArray(initialData) && initialData.length > 0);
      if (!shouldFetch) {
        if (Array.isArray(initialData)) setData(initialData);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const query = new URLSearchParams();
        query.append("type", "youngest");
        selectedSurfaces.forEach((s) => query.append("surface", s));
        selectedLevels.forEach((l) => query.append("level", l));
        if (selectedRounds) query.append("round", selectedRounds);
        query.append("limit", showModal ? "1000" : "100");

        const res = await fetch(`/api/records/ages/maindraw?${query.toString()}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Failed to fetch youngest main draw");
        const fetchedData = await res.json();
        setData(fetchedData.youngestPlayers || []);
      } catch (err: any) {
        if (err.name !== "AbortError") console.error(err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    return () => controller.abort();
  }, [selectedSurfaces, selectedLevels, selectedRounds, enabled, showModal, fetchRequestId, initialData]);

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.floor((age - years) * 365.25);
    return `${years}y ${days}d`;
  };



  const renderTable = (playersList: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200 whitespace-nowrap">Age</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Tournament</th>
          </tr>
        </thead>
        <tbody>
          {playersList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const year = p.year || (typeof p.tourney_id === "string" ? p.tourney_id.split("-")[1] : "unknown");
            const tourneyId = typeof p.tourney_id === "string" ? p.tourney_id.split("-")[0] : p.tourney_id;

            return (
              <tr key={`${p.id}-${p.event_id}`} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <div className="flex items-center justify-center gap-2">
                    <Flag ioc={p.ioc} className="w-4 h-3" />
                    <Link href={playerSurfaceOrMatchesUrl((p as any).slug ?? String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{formatAge(p.age)}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={getTourneyHref({ slug: (p as any).tourney_slug ?? undefined, id: p.tourney_id, name: p.tourney_name, year })} className="text-indigo-300 hover:underline">
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

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!data.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const currentPlayers = data.slice(start, start + perPage);

  return (
    <section className="mb-8">
      {description && <div className="text-3xl font-bold text-white mb-6 text-center">{description}</div>}

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

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Youngest Player in Main Draw">
        {renderTable(data)}
      </Modal>
    </section>
  );
}
