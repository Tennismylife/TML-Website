"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Pagination from "../../../components/Pagination";
import Modal from "@/components/Modal";
import Flag from '@/components/Flag';
import { playerMatchesUrl } from "../nav";
import { createH2HUrl } from "@/lib/utils";

interface Player {
  id: string;
  name: string;
  ioc: string;
}

interface H2HRecord {
  player_1: Player;
  player_2: Player;
  wins_player1: number;
  wins_player2: number;
  total_h2h: number;
}

interface CountSectionProps {
  selectedSurfaces: Set<string>;
  selectedLevels: Set<string>;
  selectedRounds: string | null;
  selectedBestOf: number | null;
  fetchEnabled?: boolean;
  setFetchEnabled?: (v: boolean) => void;
  fetchRequestId?: string | null;
  parentShowModal?: boolean;
  initialData?: H2HRecord[];
  description?: string;
}

const viewLimit = 20;

export default function CountSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
  fetchEnabled,
  setFetchEnabled,
  fetchRequestId,
  parentShowModal,
  initialData,
  description,
}: CountSectionProps) {
  const [h2hData, setH2hData] = useState<H2HRecord[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [hasFetched, setHasFetched] = useState(!!initialData);
  const lastRequestIdRef = useRef<string | null>(null);

  const surfacesArr = useMemo(() => Array.from(selectedSurfaces), [selectedSurfaces]);
  const levelsArr = useMemo(() => Array.from(selectedLevels), [selectedLevels]);

  useEffect(() => setPage(1), [surfacesArr, levelsArr, selectedRounds, selectedBestOf]);

  const fetchData = async (limit = 100, force = false) => {
    if (fetchRequestId && !force && lastRequestIdRef.current === fetchRequestId) return;

    setLoading(true);
    setError(null);
    lastRequestIdRef.current = fetchRequestId ?? "manual";

    try {
      const query = new URLSearchParams();
      surfacesArr.forEach((s) => query.append("surface", s));
      levelsArr.forEach((l) => query.append("level", l));
      if (selectedRounds) query.set("round", selectedRounds);
      if (selectedBestOf !== null) query.set("best_of", String(selectedBestOf));
      query.set("limit", String(limit));

      const res = await fetch(`/api/records/h2h/count?${query.toString()}`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Failed to fetch H2H count: ${res.status} ${text}`);
      }

      const data = await res.json();
      setH2hData(Array.isArray(data.h2h) ? data.h2h : []);
    } catch (err: any) {
      setError(err?.message || "Unable to load data");
      setH2hData([]);
    } finally {
      setLoading(false);
      setHasFetched(true);
      if (fetchEnabled) setFetchEnabled?.(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchRequestId, surfacesArr.join(','), levelsArr.join(','), selectedRounds, selectedBestOf]);

  const totalPages = Math.ceil(h2hData.length / viewLimit);

  const currentData = useMemo(() => {
    const start = (page - 1) * viewLimit;
    return h2hData.slice(start, start + viewLimit);
  }, [h2hData, page]);

  const linkParams: Record<string, string | string[] | number | undefined> = {};
  if (surfacesArr.length) linkParams.surface = surfacesArr;
  if (levelsArr.length) linkParams.level = levelsArr;
  if (selectedRounds) linkParams.round = selectedRounds;
  if (selectedBestOf !== null) linkParams.best_of = selectedBestOf;

  const renderTable = (data: H2HRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player 1</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player 2</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Wins</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Total H2H</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">H2H</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-8 text-center text-gray-300">
                {!hasFetched ? "Select data" : "No data found."}
              </td>
            </tr>
          ) : (
            data.map((p, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr key={`${p.player_1.id}-${p.player_2.id}-${idx}`} className="border-b border-white/10 hover:bg-gray-800">
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{globalRank}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={p.player_1.ioc} className="w-4 h-3" />
                      <Link href={playerMatchesUrl((p.player_1 as any).slug ?? String(p.player_1.id), linkParams as any)} className="text-indigo-300 hover:underline">
                        {p.player_1.name}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.wins_player1}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={p.player_2.ioc} className="w-4 h-3" />
                      <Link href={playerMatchesUrl((p.player_2 as any).slug ?? String(p.player_2.id), linkParams as any)} className="text-indigo-300 hover:underline">
                        {p.player_2.name}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.wins_player2}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.total_h2h}</td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg">
                    <Link
                      href={createH2HUrl(p.player_1.name, p.player_2.name)}
                      className="text-yellow-400 hover:text-yellow-300 hover:underline font-semibold whitespace-nowrap"
                    >
                      {p.player_1.name.split(' ').pop()} vs {p.player_2.name.split(' ').pop()} →
                    </Link>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-0">
      {description && <h2 className="mb-6 text-center text-2xl font-semibold text-white">{description}</h2>}  



      {error && <div className="mb-2 text-center text-sm text-red-500">{error}</div>}

      <div className="mb-0 flex justify-end">
        {h2hData.length > viewLimit && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          >
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-8 text-center text-gray-300">Loading…</div>
      ) : h2hData.length === 0 ? (
        <div className="py-8 text-center text-gray-300">No H2H records found for these filters.</div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * viewLimit)}
          {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Top H2H Counts">
        {renderTable(h2hData, 0)}
      </Modal>
    </section>
  );
}
