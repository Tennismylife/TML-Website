'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';

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

  // incremental reveal on mobile (hook called unconditionally to preserve hook order)
  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(roundData?.allRoundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!roundData || !Array.isArray(roundData.allRoundItems)) return <div className="text-white text-center py-10">No data available</div>;

  const sections = roundData.allRoundItems;

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const renderTable = (data: PlayerStat[], title: string) => (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--col-1)' }} />
        <col style={{ width: 'var(--col-2)' }} />
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">{title}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <Flag ioc={item.ioc} className="w-4 h-3" />
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Rimossa definizione inline del Modal

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
    <section className="mb-4">
      <h3 className="font-medium mb-4 text-white">Reaches per Round</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sections.slice(0, visibleCount).map((section) => (
          <div key={section.title} className="p-1 border border-white bg-transparent rounded-none" style={{ ['--col-1' as any]: '70%', ['--col-2' as any]: '30%' }}>
            <div className="p-3">
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
                <p className="text-gray-400">No data available</p>
              )}
            </div>
          </div>
        ))}

        {isMobile && visibleCount < sections.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>

      {modalData && (
        <ModalTournamentsSeasons title={`All Reaches for ${modalData.title}`} onClose={() => setModalData(null)}>
          {renderTable(modalData.list, modalData.title)}
        </ModalTournamentsSeasons>
      )}
    </section>
  );
}
