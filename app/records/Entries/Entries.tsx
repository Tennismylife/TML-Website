"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Flag from '@/components/Flag';
import { getPlayerHref } from "@/lib/utils";
import { playerMatchesUrl } from "../nav";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";

interface Entry {
  id: string;
  name: string;
  ioc?: string;
  entries: number;
}

export default function Entries({ fetchEnabled, description, topEntries, selectedSurfaces, selectedLevels }: { fetchEnabled?: boolean; description?: string; topEntries?: Entry[]; selectedSurfaces?: Set<string>; selectedLevels?: Set<string>; }) {
  const enabled = !!fetchEnabled; // default false
  const [allEntries, setAllEntries] = useState<Entry[]>(Array.isArray(topEntries) ? topEntries : []);
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

  useEffect(() => {
    const fetchEntries = async () => {
      if (!enabled && !showModal) {
        if (Array.isArray(topEntries) && topEntries.length) setAllEntries(topEntries);
        else setAllEntries([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const params = new URLSearchParams();

        if (selectedSurfaces !== undefined) Array.from(selectedSurfaces).forEach(s => params.append('surface', s));
else Array.from(searchParams?.entries() ?? []).forEach(([k,v]) => { if (k === 'surface') params.append(k, v); });

        if (selectedLevels !== undefined) Array.from(selectedLevels).forEach(l => params.append('level', l));
        else Array.from(searchParams?.entries() ?? []).forEach(([k,v]) => { if (k === 'level') params.append(k, v); });

        params.set("perPage", showModal ? "1000" : "100");
        params.delete("page");

        if (!showModal && Array.isArray(topEntries) && topEntries.length) {
          setAllEntries(topEntries);
        } else {
          const res = await fetch(`/api/records/entries?${params.toString()}`);
          const data = await res.json();
          const rows = Array.isArray(data.topEntries) ? data.topEntries : [];
          setAllEntries(rows);
        }
      } catch (err) {
        console.error(err);
        setAllEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [searchParams, enabled, showModal, topEntries, selectedSurfaces, selectedLevels]);

  if (loading) return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allEntries.length) return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = allEntries.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const currentEntries = allEntries.slice(start, start + perPage);

 

  const renderTable = (entriesList: Entry[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-gray-800 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-gray-800">
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Rank</th>
            <th className="border border-gray-800 px-4 py-2 text-left text-lg text-gray-300">Player</th>
            <th className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-300">Entries</th>
          </tr>
        </thead>
        <tbody>
          {entriesList.map((p, idx) => {
            const globalRank = startIndex + idx + 1;

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-gray-800">
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-gray-800 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}
                    <Link href={playerMatchesUrl(String(p.id), (() => { const params: Record<string, string | string[]> = {}; for (const [key, value] of (searchParams?.entries() ?? [])) { if (!value || key === 'tab') continue; if (params[key]) { if (Array.isArray(params[key])) (params[key] as string[]).push(value); else params[key] = [params[key] as string, value]; } else { params[key] = value; } } return params; })())} className="text-indigo-300 hover:underline">{p.name}</Link>
                  </div>
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={`${getPlayerHref((p as any).slug ?? p.id)}?tab=tournaments`} className="text-indigo-300 hover:underline">
                    {p.entries}
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

      {renderTable(currentEntries, start)}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Players with Most Entries"
      >
        {renderTable(allEntries)}
      </Modal>
    </section>
  );
}
