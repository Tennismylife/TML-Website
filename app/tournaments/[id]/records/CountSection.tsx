'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { iocToIso2, flagEmoji } from '../../../../utils/flags';
import Modal from './Modal';

interface PlayerItem {
  id: string | number;
  name: string;
  ioc: string;
  count: number;
}

interface SectionData {
  list: PlayerItem[];
  fullList?: PlayerItem[];
}

export default function CountSection({ tournamentId }: { tournamentId: string }) {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    titles: { list: [] },
    wins: { list: [] },
    played: { list: [] },
    entries: { list: [] },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<null | string>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const sectionsArr = [
    { key: 'titles', title: 'Titles' },
    { key: 'wins', title: 'Wins' },
    { key: 'played', title: 'Played' },
    { key: 'entries', title: 'Entries' },
  ];

  // Fetch iniziale solo top 10
  useEffect(() => {
    const fetchTopData = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/records/count`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();

        setSections({
          titles: { list: data.titles ?? [] },
          wins: { list: data.wins ?? [] },
          played: { list: data.played ?? [] },
          entries: { list: data.entries ?? [] },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTopData();
  }, [tournamentId]);

  // Apri modal e fetch fullList solo se non esiste
  const openModal = async (sectionKey: string) => {
    const section = sections[sectionKey];

    // se già presente, non rifare la richiesta
    if (section?.fullList?.length) {
      setActiveModal(sectionKey);
      return;
    }

    setLoadingModal(true);

    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/records/count?section=${sectionKey}`
      );
      if (!res.ok) throw new Error('Failed to fetch full list');

      const data = await res.json();

      setSections((prev) => ({
        ...prev,
        [sectionKey]: {
          ...prev[sectionKey],
          fullList: data.fullList ?? [],
        },
      }));

      setActiveModal(sectionKey);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingModal(false);
    }
  };

  const renderTable = (data: PlayerItem[], title: string) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th className="text-left py-1 font-medium text-white">Player</th>
          <th className="text-left py-1 font-medium text-white">{title}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="hover:bg-gray-100 transition-colors">
            <td className="py-1 flex items-center gap-2">
              <span className="text-base">{flagEmoji(iocToIso2(item.ioc)) || ''}</span>
              <Link
                href={`/players/${encodeURIComponent(String(item.id))}`}
                className="text-blue-700 hover:underline"
              >
                {item.name}
              </Link>
            </td>
            <td className="py-1">{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <section
      className="rounded border p-4 bg-background"
      style={{ backgroundColor: 'rgba(31,41,55,0.95)', backdropFilter: 'blur(4px)' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {sectionsArr.map((sec) => {
          const sectionData = sections[sec.key] ?? { list: [] };
          const list = sectionData.list ?? [];

          return (
            <div
              key={sec.key}
              className="border rounded p-4 bg-card"
              style={{ backgroundColor: 'rgba(31,41,55,0.95)', backdropFilter: 'blur(4px)' }}
            >
              <h3 className="font-medium mb-2 text-white">{sec.title}</h3>
              {list.length > 0 ? (
                <>
                  {renderTable(list, sec.title)}
                  <button
                    onClick={() => openModal(sec.key)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                  >
                    View All
                  </button>
                </>
              ) : (
                <p className="text-gray-400">No data available.</p>
              )}
            </div>
          );
        })}
      </div>

      {activeModal && (
        <Modal
          title={sectionsArr.find((s) => s.key === activeModal)?.title || ''}
          onClose={() => setActiveModal(null)}
        >
          {loadingModal ? (
            <p className="text-white text-center">Loading...</p>
          ) : (
            renderTable(
              sections[activeModal]?.fullList ?? [],
              sectionsArr.find((s) => s.key === activeModal)?.title || ''
            )
          )}
        </Modal>
      )}
    </section>
  );
}
