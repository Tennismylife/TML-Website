'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Pagination from '../../../components/Pagination';
import Modal from '@/components/Modal';
import { getFlagFromIOC } from "@/lib/utils";

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
  selectedSurfaces: string[];
  selectedLevels: string[];
  selectedRounds: string | null;
  selectedBestOf: number | null;
}

export default function CountSection({
  selectedSurfaces,
  selectedLevels,
  selectedRounds,
  selectedBestOf,
}: CountSectionProps) {
  const [h2hData, setH2hData] = useState<H2HRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const perPage = 20;
  const searchParams = useSearchParams();

  useEffect(
    () => setPage(1),
    [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        selectedSurfaces.forEach((s) => query.append('surface', s));
        selectedLevels.forEach((l) => query.append('tourney_level', l));
        if (selectedRounds) query.set('round', selectedRounds);
        if (selectedBestOf !== null)
          query.set('bestOf', selectedBestOf.toString());

        const res = await fetch(
          `/api/records/h2h/count?${query.toString()}`
        );
        if (!res.ok) throw new Error('Failed to fetch H2H count');

        const data = await res.json();
        setH2hData(data.h2h || []);
      } catch (err) {
        console.error(err);
        setH2hData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedSurfaces, selectedLevels, selectedRounds, selectedBestOf]);

  const totalPages = Math.ceil(h2hData.length / perPage);

  const currentData = useMemo(() => {
    const start = (page - 1) * perPage;
    return h2hData.slice(start, start + perPage);
  }, [h2hData, page]);

  const getPlayerLink = (playerId: string) =>
    `/players/${playerId}?tab=matches&${[
      ...searchParams.entries(),
    ]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&')}`;

  const renderTable = (data: H2HRecord[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow mt-0">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Rank
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player 1
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Wins
            </th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">
              Player 2
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Wins
            </th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">
              Total H2H
            </th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="py-8 text-center text-gray-300"
              >
                No data available.
              </td>
            </tr>
          ) : (
            data.map((p, idx) => {
              const globalRank = startIndex + idx + 1;

              return (
                <tr
                  key={`${p.player_1.id}-${p.player_2.id}-${idx}`}
                  className="hover:bg-gray-800 border-b border-white/10"
                >
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {globalRank}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {getFlagFromIOC(p.player_1.ioc)}
                      </span>
                      <Link
                        href={getPlayerLink(p.player_1.id)}
                        className="text-indigo-300 hover:underline"
                      >
                        {p.player_1.name}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {p.wins_player1}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                    <div className="flex items-center gap-2">
                      <span className="text-base">
                        {getFlagFromIOC(p.player_2.ioc)}
                      </span>
                      <Link
                        href={getPlayerLink(p.player_2.id)}
                        className="text-indigo-300 hover:underline"
                      >
                        {p.player_2.name}
                      </Link>
                    </div>
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {p.wins_player2}
                  </td>
                  <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">
                    {p.total_h2h}
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
      <h2 className="text-xl font-semibold mb-4 text-gray-200">
        Top H2H Counts
      </h2>

      {/* View All button (same as Wins) */}
      <div className="flex justify-end mb-0">
        {h2hData.length > perPage && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          >
            View All
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-300">
          Loading...
        </div>
      ) : h2hData.length === 0 ? (
        <div className="text-center py-8 text-gray-300">
          No H2H records found for these filters.
        </div>
      ) : (
        <>
          {renderTable(currentData, (page - 1) * perPage)}
          {totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title="Top H2H Counts"
      >
        {renderTable(h2hData, 0)}
      </Modal>
    </section>
  );
}
