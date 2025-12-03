"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/Pagination";
import { flagEmoji, iocToIso2 } from "@/utils/flags";

interface TopTimespanItem {
  id: string;
  name: string;
  ioc?: string | null;
  firstDate: string;     // YYYY-MM-DD
  lastDate: string;      // YYYY-MM-DD
  timespanDays: number;  // per ordinamento e confronto
  timespanLabel: string; // "4y 3m 29d"
}

export default function TopXTimespan() {
  const [top, setTop] = useState<number>(2);
  const [eoy, setEoy] = useState<boolean>(false);
  const [rows, setRows] = useState<TopTimespanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/recordsranking/timespan/top?top=${top}&limit=200${eoy ? "&eoy=1" : ""}`
      );
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
  }, [top, eoy]);

  const totalPages = Math.ceil(rows.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);

  return (
    <section className="mb-8">
      {/* Controls */}
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top Range:</label>
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
                <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan</th>
                <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First</th>
                <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r, idx) => (
                <tr key={`${r.id}-${r.firstDate}-${r.lastDate}`} className="hover:bg-gray-800 border-b border-white/10">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {start + idx + 1}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      {r.ioc && <span className="text-base">{flagEmoji(iocToIso2(r.ioc))}</span>}
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