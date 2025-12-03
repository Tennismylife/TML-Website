'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal'; // <-- usa il tuo nuovo Modal

interface Player {
  id: string | number;
  name: string;
  ioc: string;
}

interface RoundData {
  year: number;
  minGamesLost: number;
  player: Player;
}

interface RoundItem {
  round: string;
  data: RoundData[]; // 10 elementi (initial)
}

interface LeastData {
  roundItems: RoundItem[];
}

export default function LeastSection({ id }: { id: string }) {
  const [leastData, setLeastData] = useState<LeastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ round: string; data: RoundData[] } | null>(null);
  const [modalLoadingRound, setModalLoadingRound] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeast = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${id}/records/least`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch least data');
        setLeastData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchLeast();
  }, [id]);

  // blocca scroll quando il modal è aperto
  useEffect(() => {
    if (modalData) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [modalData]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!leastData) return <div className="text-white text-center py-10">No data available</div>;

  const { roundItems } = leastData;
  const roundOrder = ['W', 'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];
  const sortedRoundItems = roundItems.slice().sort(
    (a, b) => roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round)
  );

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const PlayerTable = ({ data }: { data: RoundData[] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">Games</th>
          <th className="text-left py-1 text-white">Year</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr
            key={`${item.player.id}-${item.year}`}
            className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors"
          >
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.player.ioc)) || ""}</span>
              <Link href={`/players/${encodeURIComponent(String(item.player.id))}`} className="text-blue-400 hover:underline">
                {item.player.name}
              </Link>
            </td>
            <td className="py-1 text-white">{item.minGamesLost}</td>
            <td className="py-1 text-white">
              <Link href={`/tournaments/${id}/${item.year}`} className="text-blue-400 hover:underline">
                {item.year}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleViewAll = async (round: string) => {
    try {
      setModalLoadingRound(round);

      // richiedo full dataset
      const res = await fetch(`/api/tournaments/${id}/records/least?full=true`);
      const data = await res.json();

      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch full data');

      const returnedRound = Array.isArray(data.roundItems)
        ? data.roundItems.find((r: any) => r.round === round)
        : null;

      const fullList: RoundData[] = returnedRound ? returnedRound.data : [];

      setModalData({ round, data: fullList });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setModalLoadingRound(null);
    }
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">Min Cumulative Games Lost to reach a round</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedRoundItems.map((item) => (
          <div key={item.round} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{item.round}</h4>

            {item.data.length > 0 ? (
              <>
                <PlayerTable data={item.data} />

                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleViewAll(item.round)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                    disabled={modalLoadingRound === item.round}
                  >
                    {modalLoadingRound === item.round ? 'Loading...' : 'View All'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
          </div>
        ))}
      </div>

      {/* --- nuovo modal esterno --- */}
      {modalData && (
        <Modal
          title={`Details for ${modalData.round}`}
          onClose={() => setModalData(null)}
        >
          <PlayerTable data={modalData.data} />
        </Modal>
      )}
    </section>
  );
}
