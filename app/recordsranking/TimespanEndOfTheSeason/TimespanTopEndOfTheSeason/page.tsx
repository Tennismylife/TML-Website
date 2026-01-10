"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Pagination from "@/components/Pagination";
import { getFlagFromIOC } from "@/lib/utils";
import Modal from "@/components/Modal"; 

interface EoyTopTimespanItem {
  id: string;
  name: string;
  ioc?: string | null;
  firstYear: number;
  lastYear: number;
  spanYears: number;
}

export default function EoyTopTimespan() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialTop = Number(searchParams?.get('top') ?? searchParams?.get('rank') ?? 2);
  const [top, setTop] = useState<number>(initialTop);
  const [rows, setRows] = useState<EoyTopTimespanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState<EoyTopTimespanItem[] | null>(null);
  const perPage = 20;

  // normalize 'rank' -> 'top' when present
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
      const res = await fetch(`/api/recordsranking/timespanendoftheseason/top?top=${top}`);
      const data: EoyTopTimespanItem[] = await res.json();
      setRows((Array.isArray(data) ? data : []).filter(r => r.spanYears > 0));
    } catch (err) {
      console.error("Error fetching EOY Top-X timespan:", err);
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

  const renderTable = (list: EoyTopTimespanItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan (years)</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First year</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last year</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr
              key={`${r.id}-${r.firstYear}-${r.lastYear}`}
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
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                {r.spanYears}
              </td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.firstYear}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.lastYear}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="text-gray-200 font-medium mr-2">Top Range (EOY):</label>
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
        <h2 className="text-xl font-semibold text-gray-200 text-center flex-1">
          Timespan at EOY Top {top}
        </h2>
        <button
          onClick={() => setModalItem(rows)}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && pageRows.length > 0 && renderTable(pageRows, start)}
      {!loading && pageRows.length === 0 && <div className="text-gray-400 py-4 text-center">No data available.</div>}

      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <Modal show={!!modalItem} onClose={() => setModalItem(null)} title={`Timespan Details`}>
        {renderTable(modalItem || [])}
      </Modal>
    </section>
  );
}
