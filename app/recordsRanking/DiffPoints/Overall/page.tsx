"use client";

import { useEffect, useState } from "react";
import { flagEmoji, iocToIso2 } from "@/utils/flags";

interface MaxDiffItem {
  rank: number;
  country: string | null;       // IOC No.1
  country_no2: string | null;   // IOC No.2
  name: string;
  no2: string;
  points_no1: number;
  points_no2: number;
  points_diff: number;
  date: string;
}

export default function MaxDifferenceNo1No2() {
  const [rows, setRows] = useState<MaxDiffItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/recordsranking/diffpoints/overall`, { cache: "no-store" });
      const data: MaxDiffItem[] = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching max difference:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const renderTable = (list: MaxDiffItem[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            {/* Niente colonna Country: bandierine inline accanto ai nomi */}
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 1 Player</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">No. 2 Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 1</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points No. 2</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points Diff.</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={`${r.rank}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-gray-200 font-semibold">
                {r.rank}
              </td>

              {/* No.1 con bandierina */}
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">
                  {r.country && (
                    <span className="text-base" aria-hidden="true">
                      {flagEmoji(iocToIso2(r.country))}
                    </span>
                  )}
                  <span>{r.name}</span>
                </div>
              </td>

              {/* No.2 con bandierina */}
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-300">
                <div className="flex items-center gap-2">
                  {r.country_no2 && (
                    <span className="text-base" aria-hidden="true">
                      {flagEmoji(iocToIso2(r.country_no2))}
                    </span>
                  )}
                  <span>{r.no2}</span>
                </div>
              </td>

              <td className="border border-white/10 px-4 py-2 text-center text-indigo-300">
                {r.points_no1.toLocaleString()}
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-400">
                {r.points_no2.toLocaleString()}
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-green-400 font-semibold">
                {r.points_diff.toLocaleString()}
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">
                {r.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">
        Maximum Difference Between No. 1 and No. 2
      </h2>

      {/* Bottone per vedere tutta la lista */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {loading && <div className="text-gray-400 py-4 text-center">Loading...</div>}
      {!loading && rows.length > 0 && renderTable(rows.slice(0, 10))}
      {!loading && rows.length === 0 && (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {/* Modal con tabella completa */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold mb-4">Full Ranking</h2>
            {renderTable(rows)}
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}