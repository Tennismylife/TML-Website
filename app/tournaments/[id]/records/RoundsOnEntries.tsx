'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal';

interface PlayerRoundEntry {
  id: string | number;
  name: string;
  ioc: string;
  reaches: number;
  totalEntries: number;
  percentage: number;
}

interface RoundItem {
  title: string;
  list: PlayerRoundEntry[];
  fullList: PlayerRoundEntry[];
}

interface RoundsOnEntriesData {
  allRoundItems: RoundItem[];
}

export default function RoundsOnEntries({ id }: { id: string }) {
  const [roundsData, setRoundsData] = useState<RoundsOnEntriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [minEntriesPerRound, setMinEntriesPerRound] = useState<{ [round: string]: number }>({});
  const [modalData, setModalData] = useState<{ title: string; list: PlayerRoundEntry[] } | null>(null);

  // Fetch rounds data
  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await fetch(`/api/tournaments/${id}/records/roundsonentries`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch rounds data');
        setRoundsData(data);

        const initial: { [round: string]: number } = {};
        data.allRoundItems.forEach((item: any) => (initial[item.title] = 1));
        setMinEntriesPerRound(initial);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchRounds();
  }, [id]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!roundsData) return <div className="text-white text-center py-10">No data available</div>;

  const { allRoundItems } = roundsData;

  const handleMinEntriesChange = (round: string, value: number) => {
    setMinEntriesPerRound(prev => ({ ...prev, [round]: value }));
  };

  const updatedRoundItems = allRoundItems.map(item => {
    const minEntries = minEntriesPerRound[item.title] || 1;
    const filtered = item.fullList.filter(p => p.totalEntries >= minEntries);
    return {
      ...item,
      list: filtered.slice(0, 10),
      fullFilteredList: filtered,
      minEntries,
    };
  });

  const PlayerTable = ({ data }: { data: PlayerRoundEntry[] }) => (
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
        {data.map((item) => (
          <tr key={`${item.id}-${item.reaches}`} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ""}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white">{item.reaches}</td>
            <td className="py-1 text-white">{item.totalEntries}</td>
            <td className="py-1 text-white">{item.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">
        Percentage of Round Reached out of Total Entries
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {updatedRoundItems.map(item => (
          <div key={item.title} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{item.title}</h4>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-white">
                Minimum Entries: {item.minEntries}
              </label>
              <input
                type="range"
                min={1}
                max={50}
                value={item.minEntries}
                onChange={(e) => handleMinEntriesChange(item.title, Number(e.target.value))}
                className="w-full"
              />
            </div>

            {item.list.length > 0 ? (
              <>
                <PlayerTable data={item.list} />
                <button
                  onClick={() => setModalData({ title: item.title, list: item.fullFilteredList })}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
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

      {modalData && (
        <Modal title={`${modalData.title}s reached on entries`} onClose={() => setModalData(null)}>
          <PlayerTable data={modalData.list} />
        </Modal>
      )}
    </section>
  );
}
