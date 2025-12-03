"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { iocToIso2, flagEmoji } from "../../../utils/flags";
import Pagination from "../../../components/Pagination";

interface Entry {
  id: string;
  name: string;
  ioc?: string;
  entries: number;
}

export default function Entries() {
  const [allEntries, setAllEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const searchParams = useSearchParams();
  const perPage = 10;

  useEffect(() => {
    const fetchEntries = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams(searchParams as any);
        params.set("perPage", "100"); // fetch first 100
        params.delete("page"); // remove page param since we're fetching all at once

        const res = await fetch(`/api/records/entries?${params.toString()}`);
        const data = await res.json();
        setAllEntries(data.topEntries || []);
      } catch (err) {
        console.error(err);
        setAllEntries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEntries();
  }, [searchParams]);

  if (loading)
    return <div className="text-center py-8 text-gray-300">Loading...</div>;
  if (!allEntries.length)
    return <div className="text-center py-8 text-gray-300">No data available.</div>;

  const totalCount = allEntries.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const end = start + perPage;
  const entries = allEntries.slice(start, end);

  const getLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    return link;
  };

  const renderTable = (entriesList: Entry[]) => (
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
            const globalRank = entriesList === allEntries ? idx + 1 : start + idx + 1;
            const flag = flagEmoji(iocToIso2(p.ioc));

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-gray-800">
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                <td className="border border-gray-800 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={getLink(p.id)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-gray-800 px-4 py-2 text-center text-lg text-gray-200">
                  <Link href={`/players/${p.id}?tab=tournaments`} className="text-indigo-300 hover:underline">
                    {p.entries} {/* Entries ora puntano alla tab tornei */}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const Modal = ({
    show,
    onClose,
    title,
    children,
  }: {
    show: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
  }) => {
    if (!show) return null;
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-gray-900 text-gray-200 p-4 w-full max-w-7xl max-h-screen overflow-y-auto rounded border border-gray-800"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4">{title}</h2>
          {children}
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-200">Players with Most Entries</h2>

      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
        >
          View All
        </button>
      </div>

      {renderTable(entries)}

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
