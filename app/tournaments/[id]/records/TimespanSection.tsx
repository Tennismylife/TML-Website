'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal';

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PlayerTimespan {
  id: string | number;
  name: string;
  ioc: string;
  firstDate: string | Date;
  lastDate: string | Date;
  days: string;
}

interface RoundItem {
  title: string;
  list: PlayerTimespan[];
  fullList?: PlayerTimespan[];
}

interface TimespanData {
  allRoundItems: RoundItem[];
}

export default function TimespanSection({ id }: { id: string }) {
  const [timespanData, setTimespanData] = useState<TimespanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingViewAll, setLoadingViewAll] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerTimespan[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Primo caricamento: solo Top 10
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tournaments/${id}/records/timespan`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch timespan data');
        setTimespanData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [id]);

  const PlayerTable = ({ data }: { data: PlayerTimespan[] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">First Date</th>
          <th className="text-left py-1 text-white">Last Date</th>
          <th className="text-left py-1 text-white">Timespan</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={`${item.id}-${idx}`} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ''}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white">{fmtDate(item.firstDate)}</td>
            <td className="py-1 text-white">{fmtDate(item.lastDate)}</td>
            <td className="py-1 text-white">{item.days}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  // Carica la fullList solo al click su "View All"
  const handleViewAll = async (roundTitle: string) => {
    if (!timespanData) return;
    const round = timespanData.allRoundItems.find(r => r.title === roundTitle);
    if (!round) return;

    if (round.fullList?.length) {
      setModalData({ title: roundTitle, list: round.fullList });
      return;
    }

    try {
      setLoadingViewAll(roundTitle);
      const res = await fetch(`/api/tournaments/${id}/records/timespan?full=true&round=${encodeURIComponent(roundTitle)}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch full round data');

      const fullRound = Array.isArray(data.allRoundItems)
        ? data.allRoundItems.find((r: any) => r.title === roundTitle)
        : null;

      const fullList = fullRound?.fullList ?? [];
      // Aggiorna localmente
      setTimespanData(prev => prev ? {
        allRoundItems: prev.allRoundItems.map(r =>
          r.title === roundTitle ? { ...r, fullList } : r
        )
      } : prev);

      setModalData({ title: roundTitle, list: fullList });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingViewAll(null);
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!timespanData) return <div className="text-white text-center py-10">No data available</div>;

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">Longest Timespan per Round</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timespanData.allRoundItems.map((item) => (
          <div key={item.title} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{item.title}</h4>

            {item.list && item.list.length > 0 ? (
              <>
                <PlayerTable data={item.list} />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => handleViewAll(item.title)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                    disabled={loadingViewAll === item.title}
                  >
                    {loadingViewAll === item.title ? 'Loading...' : 'View All'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
          </div>
        ))}
      </div>

      {modalData && (
        <Modal
          title={`All Timespans for ${modalData.title}`}
          onClose={() => setModalData(null)}
        >
          <PlayerTable data={modalData.list} />
        </Modal>
      )}
    </section>
  );
}
