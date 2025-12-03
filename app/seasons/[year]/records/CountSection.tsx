'use client';

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

interface StatsSection {
  list: PlayerStat[]; // iniziali 10
  fullList?: PlayerStat[]; // completa
}

interface Stats {
  topTitles: StatsSection;
  topWins: StatsSection;
  topPlayed: StatsSection;
  topEntries: StatsSection;
}

interface CountSectionProps {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
}

export default function CountSection({ year, selectedSurfaces, selectedLevels }: CountSectionProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ title: string; list: PlayerStat[] } | null>(null);
  const [modalLoading, setModalLoading] = useState<string | null>(null);

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const surfaces = Array.from(selectedSurfaces).join(',');
        const query = new URLSearchParams();
        if (surfaces) query.set('surfaces', surfaces);
        if (selectedLevels) query.set('levels', selectedLevels);
        query.set('limit', '10'); // iniziali 10

        const res = await fetch(`/api/seasons/${year}/records/count?${query}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch stats');
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [year, selectedSurfaces, selectedLevels]);

  // blocca scroll se modal aperto
  useEffect(() => {
    if (modalData) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
  }, [modalData]);

  const fetchFullList = async (title: string) => {
    try {
      setModalLoading(title);
      const surfaces = Array.from(selectedSurfaces).join(',');
      const query = new URLSearchParams();
      if (surfaces) query.set('surfaces', surfaces);
      if (selectedLevels) query.set('levels', selectedLevels);
      query.set('limit', '0'); // tutti

      const res = await fetch(`/api/seasons/${year}/records/count?${query}`);
      const data: Stats = await res.json();

      switch (title) {
        case 'Titles':
          setModalData({ title, list: data.topTitles.fullList || [] });
          break;
        case 'Wins':
          setModalData({ title, list: data.topWins.fullList || [] });
          break;
        case 'Played':
          setModalData({ title, list: data.topPlayed.fullList || [] });
          break;
        case 'Entries':
          setModalData({ title, list: data.topEntries.fullList || [] });
          break;
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setModalLoading(null);
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!stats) return <div className="text-white text-center py-10">No data available</div>;

  const sections = [
    { data: stats.topTitles, label: 'Titles' },
    { data: stats.topWins, label: 'Wins' },
    { data: stats.topPlayed, label: 'Played' },
    { data: stats.topEntries, label: 'Entries' },
  ];

  const PlayerTable = ({ data }: { data: PlayerStat[] }) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">Count</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span>{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
              <Link href={`/players/${p.id}`} className="text-blue-400 hover:underline">{p.name}</Link>
            </td>
            <td className="py-1 text-white">{p.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const Modal = ({ title, list, onClose }: { title: string; list: PlayerStat[]; onClose: () => void }) => {
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }, []);
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90" onClick={onClose}>
        <div
          className="bg-card p-6 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto relative"
          style={{ width: 'min(90%, 600px)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
          <PlayerTable data={list} />
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-red-500 text-white rounded">Close</button>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sections.map((section) => (
          <div key={section.label} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{section.label}</h4>
            {section.data.list.length > 0 ? (
              <>
                <PlayerTable data={section.data.list} />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={() => fetchFullList(section.label)}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                    disabled={modalLoading === section.label}
                  >
                    {modalLoading === section.label ? 'Loading...' : 'View All'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400">No data available</p>
            )}
          </div>
        ))}
      </div>

      {modalData && <Modal title={modalData.title} list={modalData.list} onClose={() => setModalData(null)} />}
    </section>
  );
}
