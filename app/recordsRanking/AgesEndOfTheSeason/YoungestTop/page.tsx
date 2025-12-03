"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { flagEmoji, iocToIso2 } from "@/utils/flags";

interface YoungestEoyTopItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "19y 9m 2d"
  year: number;     // solo anno
}

export default function YoungestEoyTopX() {
  const [top, setTop] = useState<number>(2); // esempio default: Top 2
  const [rows, setRows] = useState<YoungestEoyTopItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/agesendoftheseason/youngesttop?top=${top}&limit=200`);
      const data: YoungestEoyTopItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching youngest EOY Top-X:", err);
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

  return (
    <section className="mb-8">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top Range (EOY):</label>
        <select
          value={top}
          onChange={(e) => setTop(Number(e.target.value))}
          className="px-2 py-1 rounded bg-gray-800 text-gray-200 border border-gray-600"
        >
          {[...Array(10)].map((_, i) => (
            <option key={i + 1} value={i + 1}>Top {i + 1}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && pageRows.length > 0 && (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-black">
                <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
                <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
                <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
                  Age at EOY Top {top}
                </th>
                <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Year</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => (
                <tr key={`${r.id}-${r.year}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {start + idx + 1}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      {r.ioc && <span className="text-base">{flagEmoji(iocToIso2(r.ioc))}</span>}
                      <span>{r.name}</span>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">
                    {r.ageLabel}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-gray-300">
                    {r.year}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && pageRows.length === 0 && (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !loading && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </section>
  );
}