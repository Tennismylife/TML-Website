'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal'; // <--- IMPORT DEL NUOVO COMPONENT
// rimosso createPortal perché non serve più

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

export default function PercentageSection({ id, activeSubTab }: { id: string; activeSubTab: 'overall' | 'rounds' }) {
  const [percentageData, setPercentageData] = useState<PercentageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ title: string; list: PlayerPercentage[] } | null>(null);
  const [minMatchesOverall, setMinMatchesOverall] = useState(1);
  const [minMatchesPerRound, setMinMatchesPerRound] = useState<{ [round: string]: number }>({});

  // --- Fetch data ---
  useEffect(() => {
    const fetchPercentages = async () => {
      try {
        setLoading(true);
        let url = `/api/tournaments/${id}/records/percentage`;
        if (activeSubTab === 'rounds') url = `/api/tournaments/${id}/records/percentage/rounds`;
        if (activeSubTab === 'overall') url = `/api/tournaments/${id}/records/percentage/wins`;

        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch percentage data');
        setPercentageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPercentages();
  }, [id, activeSubTab]);

  // --- Initialize minMatchesPerRound ---
  useEffect(() => {
    if (percentageData?.allRoundItems) {
      const initial: { [round: string]: number } = {};
      percentageData.allRoundItems.forEach(item => (initial[item.title] = minMatchesOverall));
      setMinMatchesPerRound(initial);
    }
  }, [percentageData, minMatchesOverall]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!percentageData) return <div className="text-white text-center py-10">No data available</div>;

  const { sortedOverall = [], allRoundItems = [] } = percentageData;

  const filteredOverall = sortedOverall.filter(p => p.wins + p.losses >= minMatchesOverall);
  const topOverall = filteredOverall.slice(0, 10);

  const updatedRoundItems = allRoundItems.map(item => {
    const minMatches = minMatchesPerRound[item.title] || 1;
    const filtered = item.fullList.filter(p => p.wins + p.losses >= minMatches);
    return { ...item, list: filtered.slice(0, 10), fullFilteredList: filtered, minMatches };
  });

  // --- Table component ---
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
        {data.map(item => (
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ""}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">{item.name}</Link>
            </td>
            <td className="py-1 text-white">{item.wins}</td>
            <td className="py-1 text-white">{item.losses}</td>
            <td className="py-1 text-white">{item.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleViewAll = (list: PlayerPercentage[], title: string) => {
    setModalData({ title, list });
  };

  const handleMinMatchesChange = (round: string, value: number) => {
    setMinMatchesPerRound(prev => ({ ...prev, [round]: value }));
  };

  const cardStyle = { backgroundColor: 'rgba(31,41,55,0.95)', backdropFilter: 'blur(4px)' };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      {activeSubTab === 'overall' ? (
        <div className="border rounded p-4" style={cardStyle}>
          <h3 className="font-medium mb-2 text-white">Overall Win Percentage</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {minMatchesOverall}</label>
            <input type="range" min="1" max="50" value={minMatchesOverall} onChange={e => setMinMatchesOverall(Number(e.target.value))} className="w-full" />
          </div>
          {topOverall.length > 0 ? (
            <>
              <PlayerTable data={topOverall} />
              <button onClick={() => handleViewAll(filteredOverall, 'Overall Win Percentage')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
            </>
          ) : (<p className="text-gray-400">No data available.</p>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {updatedRoundItems.map(item => (
            <div key={item.title} className="border rounded p-4" style={cardStyle}>
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1 text-white">
                  Minimum Matches ({item.title}): {item.minMatches}
                </label>
                <input type="range" min="1" max="50" value={item.minMatches} onChange={e => handleMinMatchesChange(item.title, Number(e.target.value))} className="w-full" />
              </div>

              <h4 className="font-medium mb-2 text-white">{item.title}</h4>
              <PlayerTable data={item.list} />

              <button onClick={() => handleViewAll(item.fullFilteredList, item.title)} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                View All
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- USA IL NUOVO MODAL QUI --- */}
      {modalData && (
        <Modal title={modalData.title} onClose={() => setModalData(null)}>
          <PlayerTable data={modalData.list} />
        </Modal>
      )}
    </section>
  );
}
