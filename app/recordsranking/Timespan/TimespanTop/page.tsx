"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Pagination from "@/components/Pagination";
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal"; 

interface TopTimespanItem {
  id: string;
  name: string;
  ioc?: string | null;
  firstDate: string;
  lastDate: string;
  timespanDays: number;
  timespanLabel: string;
}

export default function TopXTimespan() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTop = Number(searchParams?.get('top') ?? searchParams?.get('rank') ?? 2);
  const [top, setTop] = useState<number>(initialTop);
  const [rows, setRows] = useState<TopTimespanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState<TopTimespanItem[] | null>(null);
  const perPage = 20;

  // normalize 'rank' -> 'top' if present as query param (backwards compatibility)
  useEffect(() => {
    const rankParam = searchParams?.get('rank');
    const topParam = searchParams?.get('top');
    if (rankParam && !topParam && pathname) {
      const params = new URLSearchParams(searchParams?.toString() || '');
      params.delete('rank');
      params.set('top', rankParam);
      const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
      router.replace(newUrl);
    }
  }, [searchParams, pathname, router]);
  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/timespan/top?top=${top}&limit=200`);
      const data: TopTimespanItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching Top-X timespan:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
    setPage(1);
  }, [top]);

  const totalPages = Math.ceil(rows.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  const renderTable = (list: TopTimespanItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr
              key={`${r.id}-${r.firstDate}-${r.lastDate}`}
              className="hover:bg-gray-800 border-b border-white/10 cursor-pointer"
              onClick={() => setModalItem([r])}
            >
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                {startIndex + idx + 1}
              </td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {r.ioc && <span className="text-base">{getFlagFromIOC(r.ioc)}</span>}
                  <span>{r.name}</span>
                </div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300" title={`${r.timespanDays} days`}>
                {r.timespanLabel}
              </td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.firstDate}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.lastDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="text-gray-200 font-medium mr-2">Top Range:</label>
          <select
            value={top}
            onChange={(e) => {
              const v = Number(e.target.value);
              setTop(v);
              if (pathname) {
                const params = new URLSearchParams(searchParams?.toString() || '');
                params.delete('rank');
                params.set('top', String(v));
                const newUrl = `${pathname}${params.toString() ? '?' + params.toString() : ''}`;
                router.replace(newUrl);
              }
            }}
            className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600"
          >
            {[1,2,3,4,5,6,7,8,9,10,20,30,50,100].map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
          </select>
        </div>
        <h2 className="text-xl font-semibold text-gray-200 text-center flex-1">Timespan at Top {top}</h2>
        <button
          onClick={() => setModalItem(rows)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {/* Table */}
      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && pageRows.length > 0 && renderTable(pageRows, start)}
      {!loading && pageRows.length === 0 && <div className="text-gray-400 py-4 text-center">No data available.</div>}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal show={!!modalItem} onClose={() => setModalItem(null)} title={`Timespan Details`}>
        {renderTable(modalItem || [])}
      </Modal>
    </section>
  );
}
