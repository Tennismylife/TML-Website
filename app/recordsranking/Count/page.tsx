"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getFlagFromIOC } from "@/lib/utils";
import Pagination from "@/components/Pagination";
import Modal from "@/components/Modal"; 

interface Player {
  id: string;
  name: string;
  ioc?: string;
  weeks: number;
}

export default function RecordsCount() {
  const [players, setPlayers] = useState<Player[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTop = Number(searchParams?.get('rank') ?? 1);
  const [top, setTop] = useState<number>(initialTop); // dropdown da 1 a 10
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const perPage = 20;

  // keep URL in sync with selected rank
  useEffect(() => {
    if (!pathname) return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('rank', String(top));
    const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
    router.replace(newUrl);
  }, [top, pathname, router, searchParams]);

  const fetchPlayers = async (selectedRank: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/count?rank=${selectedRank}`);
      const data = await res.json();
      setPlayers(data || []);
    } catch (err) {
      console.error("Error fetching Count players:", err);
      setPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers(top);
    setPage(1); // reset pagina quando cambia il Rank X
  }, [top]);

  const totalCount = players.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = players.slice(start, start + perPage);

  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Weeks at No. {top}
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {p.ioc && <span className="text-base">{getFlagFromIOC(p.ioc)}</span>}
                  <span>{p.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {p.weeks}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <section className="mb-8">
      {/* Dropdown Top 1-10 */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Select Rank:</label>
        <select
          value={top}
          onChange={(e) => {
            const v = Number(e.target.value);
            setTop(v);
            if (pathname) {
              const params = new URLSearchParams(searchParams?.toString() || '');
              params.set('rank', String(v));
              const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
              router.replace(newUrl);
            }
          }}
          className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600"
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>
              No. {i + 1}
            </option>
          ))}
        </select>
      </div>
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">
        Weeks at No. {top}
      </h2>
      {/* Pulsante View All */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {/* Tabella principale */}
      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && paginatedPlayers.length > 0 && renderTable(paginatedPlayers, start)}
      {!loading && paginatedPlayers.length === 0 && (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Paginazione */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal View All */}
      <Modal show={showModal} onClose={() => setShowModal(false)} title={`Top ${top} Players`}>
        {renderTable(players)}
      </Modal>
    </section>
  );
}
