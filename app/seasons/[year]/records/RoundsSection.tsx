'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';

interface PlayerStat {
  id: string | number;
  name: string;
  ioc: string;
  count: number;
}

interface RoundItem {
  title: string;
  list: PlayerStat[]; // limited (10) initially
  fullList?: PlayerStat[]; // full list fetched on View All
}

interface RoundsData {
  allRoundItems: RoundItem[];
  surfaceList: string[];
  levelList: string[];
}

export default function RoundsSection({
  year,
  selectedSurfaces,
  selectedLevels,
}: {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
}) {
  const [roundData, setRoundData] = useState<RoundsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerStat[] } | null>(null);
  const [modalLoadingTitle, setModalLoadingTitle] = useState<string | null>(null);

  // Fetch initial round data (10 per round)
  useEffect(() => {
    const fetchRounds = async () => {
      try {
        setLoading(true);
        setError(null);
        const surfaces = Array.from(selectedSurfaces).join(',');
        const levels = selectedLevels;
        const query = new URLSearchParams();
        if (surfaces) query.set('surfaces', surfaces);
        if (levels) query.set('levels', levels);

        const res = await fetch(`/api/seasons/${year}/records/rounds?${query}`);
        const data: RoundsData = await res.json();
        if (!res.ok) throw new Error('Failed to fetch round data');

        setRoundData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchRounds();
  }, [year, selectedSurfaces, selectedLevels]);

  // Block scroll while modal open
  useEffect(() => {
    if (modalData) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [modalData]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!roundData || !Array.isArray(roundData.allRoundItems)) return <div className="text-white text-center py-10">No data available</div>;

  const sections = roundData.allRoundItems;

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const renderTable = (data: PlayerStat[], title: string) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">{title}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ''}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white">{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const Modal = ({ title, data, onClose }: { title: string; data: PlayerStat[]; onClose: () => void }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }, []);

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90" onClick={onClose}>
        <div
          className="bg-card p-6 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto relative"
          style={{ width: 'min(90%, 600px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-white">All Reaches for {title}</h2>
          {renderTable(data, title)}
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">
            Close
          </button>
        </div>
      </div>,
      document.body
    );
  };

  // Lazy load full list for View All
  const handleViewAll = async (title: string) => {
    try {
      setModalLoadingTitle(title);
      const res = await fetch(`/api/seasons/${year}/records/rounds?full=true`);
      const data: RoundsData = await res.json();
      if (!res.ok) throw new Error('Failed to fetch round data');

      const found = data.allRoundItems.find((item) => item.title === title);
      const fullList = found?.fullList || [];
      setModalData({ title, list: fullList });
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setModalLoadingTitle(null);
    }
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">Reaches per Round</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{section.title}</h4>

            {section.list.length > 0 ? (
              <>
                {renderTable(section.list, section.title)}
                <button
                  onClick={() => handleViewAll(section.title)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                  disabled={modalLoadingTitle === section.title}
                >
                  {modalLoadingTitle === section.title ? 'Loading...' : 'View All'}
                </button>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
          </div>
        ))}
      </div>

      {modalData && <Modal title={modalData.title} data={modalData.list} onClose={() => setModalData(null)} />}
    </section>
  );
}
