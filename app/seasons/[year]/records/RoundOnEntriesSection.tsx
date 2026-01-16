'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from "@/components/ModalTournamentsSeasons";
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';

interface PlayerEntry {
  id: string | number;
  name: string;
  ioc: string;
  reaches: number;
  totalEntries: number;
  percentage: number;
}

interface RoundData {
  [round: string]: PlayerEntry[];
}

interface RoundOnEntriesSectionProps {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
}

export default function RoundOnEntriesSection({ year, selectedSurfaces, selectedLevels }: RoundOnEntriesSectionProps) {
  const [roundsData, setRoundsData] = useState<RoundData>({});
  const [loading, setLoading] = useState(true);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerEntry[] } | null>(null);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [minEntriesPerRound, setMinEntriesPerRound] = useState<{ [round: string]: number }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const surfaces = Array.from(selectedSurfaces).join(',');
        const levels = Array.from(selectedLevels).join(',');
        const query = new URLSearchParams();
        if (surfaces) query.set('surfaces', surfaces);
        if (levels) query.set('levels', levels);

        const res = await fetch(`/api/seasons/${year}/records/roundsonentries?${query}`);
        const data = await res.json();
        const rounds: RoundData = data.rounds || {};
        setRoundsData(rounds);

        // init min entries
        const initial: { [round: string]: number } = {};
        Object.keys(rounds).forEach(r => (initial[r] = 1));
        setMinEntriesPerRound(initial);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, selectedSurfaces, selectedLevels]);

  const handleMinEntriesChange = (round: string, value: number) => {
    setMinEntriesPerRound(prev => ({ ...prev, [round]: value }));
  };

  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(Object.keys(roundsData).length, { initialVisible: 1, debounceMs: 1000 });

  const PlayerTable = ({ data }: { data: PlayerEntry[] }) => (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--col-1)' }} />
        <col style={{ width: 'var(--col-2)' }} />
        <col style={{ width: 'var(--col-3)' }} />
        <col style={{ width: 'var(--col-4)' }} />
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Reaches</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Entries</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map(p => (
          <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <Flag ioc={p.ioc} className="w-4 h-3" />
              <Link href={`/players/${p.id}`} className="text-blue-400 hover:underline">{p.name}</Link>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{p.reaches}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{p.totalEntries}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{p.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;

  const sortedRounds = Object.keys(roundsData); // Remove sorting

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  return (
    <section className="mb-4">
      <h3 className="font-medium mb-4 text-white">Percentage of Round Reached out of Total Entries ({year})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRounds.slice(0, visibleCount).map(round => {
          const players = roundsData[round] || [];
          const minEntries = minEntriesPerRound[round] || 1;
          const filtered = players.filter(p => p.totalEntries >= minEntries);
          const maxEntries = Math.max(...players.map(p => p.totalEntries), 1);

          return (
            <div key={round} className="p-1 border border-white bg-transparent rounded-none">
              <div className="p-3">
                <h4 className="font-medium mb-2 text-white">{round}</h4>
                <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-white">Minimum Entries: {minEntries}</label>
                <input
                  type="range"
                  min={1}
                  max={maxEntries}
                  value={minEntries}
                  onChange={(e) => handleMinEntriesChange(round, Number(e.target.value))}
                  className="w-full"
                />
              </div>
              {filtered.length > 0 ? (
                <>
                  <PlayerTable data={filtered.slice(0, 10)} />
                  {filtered.length > 10 && (
                    <button
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      onClick={() => {
                        setModalData({ title: round, list: filtered });
                        setActiveModal(round);
                      }}
                    >
                      View All
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-400">No data available.</p>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {/* Modal using ModalTournamentsSeasons */}
      {activeModal && modalData && (
        <ModalTournamentsSeasons
          title={modalData.title}
          onClose={() => setActiveModal(null)}
        >
          <PlayerTable data={modalData.list} />
        </ModalTournamentsSeasons>
      )}
    </section>
  );
}
