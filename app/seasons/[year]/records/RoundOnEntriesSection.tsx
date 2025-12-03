'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';

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

  const PlayerTable = ({ data }: { data: PlayerEntry[] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">Reaches</th>
          <th className="text-left py-1 text-white">Total Entries</th>
          <th className="text-left py-1 text-white">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map(p => (
          <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span>{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
              <Link href={`/players/${p.id}`} className="text-blue-400 hover:underline">{p.name}</Link>
            </td>
            <td className="py-1 text-white">{p.reaches}</td>
            <td className="py-1 text-white">{p.totalEntries}</td>
            <td className="py-1 text-white">{p.percentage.toFixed(1)}%</td>
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

  // Modal con overlay totale
  const Modal = ({ title, list, onClose }: { title: string; list: PlayerEntry[]; onClose: () => void }) => {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      document.body.style.overflow = 'hidden';
      const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleEscape);

      if (modalRef.current) modalRef.current.scrollTop = 0;

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }, [onClose]);

    return createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/90 p-4"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          ref={modalRef}
          className="bg-gray-800/95 backdrop-blur-sm p-6 rounded shadow-lg max-h-[90vh] w-[min(90%,600px)] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-white">
            All Percentages for {title} (Min Entries: {minEntriesPerRound[title] || 1})
          </h2>
          <PlayerTable data={list} />
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            autoFocus
          >
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">Percentage of Round Reached out of Total Entries ({year})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedRounds.map(round => {
          const players = roundsData[round] || [];
          const minEntries = minEntriesPerRound[round] || 1;
          const filtered = players.filter(p => p.totalEntries >= minEntries);
          const maxEntries = Math.max(...players.map(p => p.totalEntries), 1);

          return (
            <div key={round} className="border rounded p-4" style={cardStyle}>
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
                      onClick={() => setModalData({ title: round, list: filtered })}
                    >
                      View All
                    </button>
                  )}
                </>
              ) : (
                <p className="text-gray-400">No data available.</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalData && <Modal title={modalData.title} list={modalData.list} onClose={() => setModalData(null)} />}
    </section>
  );
}
