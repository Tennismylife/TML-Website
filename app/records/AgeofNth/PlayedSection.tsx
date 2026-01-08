"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import { getFlagFromIOC, toOrdinal } from "@/lib/utils";

interface PlayedSectionProps {
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  description?: string;
  initialData?: Player[];
  initialNth?: number;
}

interface Player {
  id: string;
  name: string;
  ioc?: string;
  age_at_game: string;
}

function XInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="number"
      min={1}
      className="w-24 px-2 py-1 bg-gray-800 text-white border border-gray-600 rounded"
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export default function PlayedSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  fetchEnabled = false,
  setFetchEnabled,
  fetchRequestId,
  description,
  initialData,
  initialNth,
}: PlayedSectionProps) {
  const enabled = !!fetchEnabled;
  const safeInitialNth = Number.isFinite(initialNth) ? (initialNth as number) : 50;
  const [data, setData] = useState<Player[]>(Array.isArray(initialData) ? initialData : []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(Array.isArray(initialData) && initialData.length > 0);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [inputX, setInputX] = useState(safeInitialNth);
  const [selectedX, setSelectedX] = useState(safeInitialNth);
  const lastRequestRef = useRef<string | null>(null);

  const searchParams = useSearchParams();
  const perPage = 20;

  useEffect(() => {
    setInputX(safeInitialNth);
    setSelectedX(safeInitialNth);
    if (Array.isArray(initialData)) {
      setData(initialData);
      setHasFetched(initialData.length > 0);
    }
  }, [safeInitialNth, initialData]);

  useEffect(() => setPage(1), [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  useEffect(() => {
    const shouldFetch = ((enabled && fetchRequestId && lastRequestRef.current !== fetchRequestId) || showModal);
    if (!shouldFetch) {
      if (Array.isArray(initialData)) {
        setData(initialData);
        setHasFetched(initialData.length > 0);
      }
      setLoading(false);
      return;
    }

    if (fetchRequestId) lastRequestRef.current = fetchRequestId;
    fetchData(selectedX, showModal ? 1000 : 100, showModal);
  }, [enabled, fetchRequestId, showModal, selectedX, selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf, initialData]);

  const fetchData = async (x: number, limit: number, force = false) => {
    if (!Number.isFinite(x) || x <= 0) {
      setError('Please enter a valid N value.');
      return;
    }
    if (!force && !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const query = new URLSearchParams();
      query.append("x", x.toString());
      selectedSurfaces.forEach((s) => query.append("surface", s));
      selectedLevels.forEach((l) => query.append("level", l));
      if (selectedRounds) query.append("round", selectedRounds);
      if (selectedBestOf != null) query.append("best_of", selectedBestOf.toString());
      query.set('limit', String(limit));

      const res = await fetch(`/api/records/ageofnth/played?${query.toString()}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch data');
      }
      const fetchedData: Player[] = await res.json();
      setData(Array.isArray(fetchedData) ? fetchedData : []);
      setPage(1);
      setSelectedX(x);
      setHasFetched(true);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setData([]);
    } finally {
      setLoading(false);
      if (enabled) setFetchEnabled?.(false);
    }
  };

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const playersPage = data.slice(start, start + perPage);

  const getPlayerLink = (playerId: string) => {
    let link = `/players/${playerId}?tab=matches`;
    for (const [key, value] of searchParams.entries()) {
      if (!value || key === "tab") continue;
      link += `&${key}=${encodeURIComponent(value)}`;
    }
    return link;
  };

  const renderTable = (players: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
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
              Age of {toOrdinal(selectedX)} match
            </th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, idx) => {
            const globalRank = startIndex + idx + 1;
            const flag = getFlagFromIOC(p.ioc) ?? "🏳️";

            return (
              <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {globalRank}
                </td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    {flag && <span className="text-base">{flag}</span>}
                    <Link href={getPlayerLink(p.id)} className="text-indigo-300 hover:underline">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                  {p.age_at_game || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const levelNames: Record<string, string> = {
    G: "Slams",
    M: "Masters 1000",
    F: "ATP Finals",
    "500": "500",
    "250": "250",
    A: "Others",
    D: "Davis Cup",
  };

  const filters: string[] = [];
  if (selectedLevels.length > 0) {
    const levels = selectedLevels.map(l => levelNames[l] || l);
    filters.push(`in ${levels.join(' or ')}`);
  }
  if (selectedSurfaces.length > 0) {
    const surfaces = selectedSurfaces.map(s => s);
    filters.push(`on ${surfaces.join(' or ')}`);
  }
  const filterText = filters.length ? ' ' + filters.join(' ') : '';

  const headerText = hasFetched ? `Age of ${toOrdinal(selectedX)} match${filterText}` : (description ?? '');

  return (
    <section className="mb-8">
      {headerText && <h1 className="mb-6 text-center text-2xl font-semibold text-white">{headerText}</h1>}  

      {/* X Input */}
      <div className="mb-4 flex items-center gap-2">
        <XInput value={inputX} onChange={setInputX} />
        <button
          onClick={() => Number.isFinite(inputX) && fetchData(inputX, showModal ? 1000 : 100, true)}
          disabled={loading || !Number.isFinite(inputX) || inputX <= 0}
          className={`px-4 py-1 rounded ${
            loading || !Number.isFinite(inputX) || inputX <= 0
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          Apply
        </button>
      </div>

      {/* View All Button */}
      {data.length > perPage && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        </div>
      )}

      {/* Loading / Error / No data */}
      {loading && <div className="text-center py-8 text-gray-300">Loading...</div>}
      {error && <div className="text-red-600 text-center py-2">{error}</div>}
      {!loading && !error && data.length === 0 && (
        <div>
          {!hasFetched ? (
            <div className="text-center py-8 text-gray-300">Select data</div>
          ) : (
            <div className="text-center py-8 text-gray-300">No data found.</div>
          )}
        </div>
      )}

      {/* Table */}
      {!loading && data.length > 0 && renderTable(playersPage, start)}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Modal */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={`Age of ${toOrdinal(selectedX)} match${filterText}`}
      >
        {renderTable(data)}
      </Modal>
    </section>
  );
}
