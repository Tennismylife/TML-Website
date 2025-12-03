'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal';

interface PlayerStatAge {
  id: string | number;
  name: string;
  ioc: string;
  age: number;
  year: number;
}

interface AgesData {
  topOldest?: PlayerStatAge[];
  topYoungest?: PlayerStatAge[];
  topYoungestWinners?: PlayerStatAge[];
  topOldestWinners?: PlayerStatAge[];
  oldestPlayers?: PlayerStatAge[];
  youngestPlayers?: PlayerStatAge[];
  youngestWinners?: PlayerStatAge[];
  oldestWinners?: PlayerStatAge[];
  allYoungestItems?: { title: string; list: PlayerStatAge[]; fullList: PlayerStatAge[] }[];
  allOldestItems?: { title: string; list: PlayerStatAge[]; fullList: PlayerStatAge[] }[];
}

interface AgesSectionProps {
  id: string;
  activeSubTab: 'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds';
}

export default function AgesSection({ id, activeSubTab }: AgesSectionProps) {
  const [agesData, setAgesData] = useState<AgesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerStatAge[] } | null>(null);

  useEffect(() => {
    const fetchAges = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${id}/records/ages/${activeSubTab}`);
        if (!res.ok) throw new Error('Failed to fetch ages data');
        const data = await res.json();
        setAgesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchAges();
  }, [id, activeSubTab]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;
  if (!agesData) return <div className="text-white">No data</div>;

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.round((age - years) * 365.25);
    return `${years}y ${days}d`;
  };

  const handleViewAll = async (
    type: 'topYoungest' | 'topOldest' | 'topYoungestWinners' | 'topOldestWinners' | 'allYoungestItems' | 'allOldestItems',
    title?: string
  ) => {
    try {
      const res = await fetch(`/api/tournaments/${id}/records/ages/${activeSubTab}?full=true`);
      if (!res.ok) throw new Error('Failed to fetch full data');
      const data = await res.json();

      let list: PlayerStatAge[] = [];
      if (type === 'topYoungest') list = data.youngestPlayers;
      if (type === 'topOldest') list = data.oldestPlayers;
      if (type === 'topYoungestWinners') list = data.youngestWinners;
      if (type === 'topOldestWinners') list = data.oldestWinners;
      if (type === 'allYoungestItems' || type === 'allOldestItems') {
        const items = type === 'allYoungestItems' ? data.allYoungestItems : data.allOldestItems;
        const item = items.find((i: any) => i.title === title);
        if (item) list = item.fullList;
      }

      setModalData({ title: title || type, list });
    } catch (err) {
      console.error(err);
    }
  };

  const renderTable = (data: PlayerStatAge[], showYear = true) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">Age</th>
          {showYear && <th className="text-left py-1 text-white">Year</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((p, index) => (
          <tr key={`${p.id}-${p.year}-${index}`} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{flagEmoji(iocToIso2(p.ioc)) || ''}</span>
              <Link href={`/players/${encodeURIComponent(String(p.id))}`} className="text-blue-400 hover:underline">{p.name}</Link>
            </td>
            <td className="py-1 text-white">{formatAge(p.age)}</td>
            {showYear && <td className="py-1 text-white">
              <Link href={`/tournaments/${encodeURIComponent(p.year)}`} className="text-blue-400 hover:underline">{p.year}</Link>
            </td>}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  // --- Layout per tab principale ---
  if (activeSubTab === 'main' || activeSubTab === 'titles') {
    const leftData = activeSubTab === 'main' ? agesData.topYoungest : agesData.topYoungestWinners;
    const rightData = activeSubTab === 'main' ? agesData.topOldest : agesData.topOldestWinners;
    const leftTitle = activeSubTab === 'main' ? "Youngest Players" : "Youngest Winners";
    const rightTitle = activeSubTab === 'main' ? "Oldest Players" : "Oldest Winners";

    return (
      <section className="rounded border p-4 grid md:grid-cols-2 gap-4" style={cardStyle}>
        <div className="border rounded p-4" style={cardStyle}>
          <h3 className="text-white font-medium mb-2">{leftTitle}</h3>
          {renderTable(leftData || [])}
          <button onClick={() => handleViewAll(activeSubTab === 'main' ? 'topYoungest' : 'topYoungestWinners')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
        </div>
        <div className="border rounded p-4" style={cardStyle}>
          <h3 className="text-white font-medium mb-2">{rightTitle}</h3>
          {renderTable(rightData || [])}
          <button onClick={() => handleViewAll(activeSubTab === 'main' ? 'topOldest' : 'topOldestWinners')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
        </div>
        {modalData && <Modal title={modalData.title} onClose={() => setModalData(null)}>{renderTable(modalData.list)}</Modal>}
      </section>
    );
  }

  // --- Rounds ---
  const items = activeSubTab === 'youngestrounds' ? agesData.allYoungestItems || [] : agesData.allOldestItems || [];
  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="text-white font-bold mb-4 text-lg">
        {activeSubTab === 'youngestrounds' ? 'Youngest per Round' : 'Oldest per Round'}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {items.map(item => (
          <div key={item.title} className="border rounded p-4" style={cardStyle}>
            <h4 className="text-white font-medium mb-2">{item.title}</h4>
            {renderTable(item.list)}
            <button
              onClick={() => handleViewAll(activeSubTab === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems', item.title)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              View All
            </button>
          </div>
        ))}
      </div>

      {modalData && <Modal title={modalData.title} onClose={() => setModalData(null)}>{renderTable(modalData.list)}</Modal>}
    </section>
  );
}
