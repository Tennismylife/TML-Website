'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';

interface PlayerPercentage {
  id: string | number;
  name: string;
  ioc: string;
  wins: number;
  losses: number;
  percentage: number;
}

interface RoundItem {
  title: string;
  fullList: PlayerPercentage[];
}

interface PercentageData {
  sortedOverall: PlayerPercentage[];
  allRoundItems: RoundItem[];
}

interface PercentageSectionProps {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
  activeSubTab: 'overall' | 'rounds';
}

export default function PercentageSection({ year, selectedSurfaces, selectedLevels, activeSubTab }: PercentageSectionProps) {
  const [percentageData, setPercentageData] = useState<PercentageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showOverallModal, setShowOverallModal] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerPercentage[] } | null>(null);

  const [minMatchesOverall, setMinMatchesOverall] = useState(1);
  const [minMatchesPerRound, setMinMatchesPerRound] = useState<{ [round: string]: number }>({});

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  // Fetch data
  useEffect(() => {
    const fetchPercentages = async () => {
      setLoading(true);
      setError(null);
      try {
        const surfaces = Array.from(selectedSurfaces).join(',');
        const query = new URLSearchParams();
        if (surfaces) query.set('surfaces', surfaces);
        if (selectedLevels) query.set('levels', selectedLevels);

        let url = '';
        if (activeSubTab === 'overall') {
          url = `/api/seasons/${year}/records/percentage/wins?${query}`;
        } else if (activeSubTab === 'rounds') {
          url = `/api/seasons/${year}/records/percentage/rounds?${query}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPercentageData(data);

        if (data.allRoundItems) {
          const initial: { [round: string]: number } = {};
          data.allRoundItems.forEach((item: RoundItem) => (initial[item.title] = 1));
          setMinMatchesPerRound(initial);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPercentages();
  }, [year, selectedSurfaces, selectedLevels, activeSubTab]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!percentageData) return <div className="text-white text-center py-10">No data available</div>;

  const { sortedOverall = [], allRoundItems = [] } = percentageData;

  const filteredOverall = sortedOverall.filter(p => p.wins + p.losses >= minMatchesOverall);
  const topOverall = filteredOverall.slice(0, 10);

  const updatedRoundItems = allRoundItems.map(item => {
    const minMatches = minMatchesPerRound[item.title] || 1;
    const filtered = item.fullList.filter(p => p.wins + p.losses >= minMatches);
    return {
      ...item,
      list: filtered.slice(0, 10),
      fullFilteredList: filtered,
      minMatches,
    };
  });

  const PlayerTable = ({ data }: { data: PlayerPercentage[] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">Wins</th>
          <th className="text-left py-1 text-white">Losses</th>
          <th className="text-left py-1 text-white">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ""}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white">{item.wins}</td>
            <td className="py-1 text-white">{item.losses}</td>
            <td className="py-1 text-white">{item.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleMinMatchesChange = (round: string, value: number) => {
    setMinMatchesPerRound(prev => ({ ...prev, [round]: value }));
  };

  // Modal con overlay totale
  const Modal = ({ title, data, onClose, minMatches }: { title: string; data: PlayerPercentage[]; onClose: () => void; minMatches?: number }) => {
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
          <h2 className="text-xl font-bold mb-4 text-white">{title} {minMatches ? `(Min Matches: ${minMatches})` : ''}</h2>
          <PlayerTable data={data} />
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
      {/* Overall Tab */}
      {activeSubTab === 'overall' && (
        <div className="border rounded p-4" style={cardStyle}>
          <h3 className="font-medium mb-2 text-white">Overall Win Percentage</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {minMatchesOverall}</label>
            <input
              type="range"
              min="1"
              max="50"
              value={minMatchesOverall}
              onChange={(e) => setMinMatchesOverall(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {topOverall.length > 0 ? (
            <>
              <PlayerTable data={topOverall} />
              <button
                onClick={() => setShowOverallModal(true)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View All
              </button>
            </>
          ) : (
            <p className="text-gray-400">No data available.</p>
          )}
        </div>
      )}

      {/* Rounds Tab */}
      {activeSubTab === 'rounds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {updatedRoundItems.map((item) => (
            <div key={item.title} className="border rounded p-4" style={cardStyle}>
              <h4 className="font-medium mb-2 text-white">{item.title}</h4>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {item.minMatches}</label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={item.minMatches}
                  onChange={(e) => handleMinMatchesChange(item.title, Number(e.target.value))}
                  className="w-full"
                />
              </div>
              {item.list.length > 0 ? (
                <>
                  <PlayerTable data={item.list} />
                  <button
                    onClick={() => setModalData({ title: item.title, list: item.fullFilteredList })}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View All
                  </button>
                </>
              ) : (
                <p className="text-gray-400">No data available.</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modali */}
      {showOverallModal && (
        <Modal
          title="All Overall Win Percentages"
          data={filteredOverall}
          onClose={() => setShowOverallModal(false)}
          minMatches={minMatchesOverall}
        />
      )}
      {modalData && (
        <Modal
          title={`All Win Percentages for ${modalData.title}`}
          data={modalData.list}
          onClose={() => setModalData(null)}
          minMatches={minMatchesPerRound[modalData.title] || 1}
        />
      )}
    </section>
  );
}
