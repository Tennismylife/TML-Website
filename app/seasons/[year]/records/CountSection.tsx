'use client';

import { useState, useEffect } from 'react';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import { getPlayerHrefWithTab } from '@/lib/utils';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';

interface PlayerStat {
  id: string | number;
  slug?: string | null;
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

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [loadingModal, setLoadingModal] = useState(false);

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  // incremental reveal on mobile
  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(4, { initialVisible: 1, debounceMs: 1000 });

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

  const fetchFullList = async (label: string) => {
    try {
      setLoadingModal(true);
      const surfaces = Array.from(selectedSurfaces).join(',');
      const query = new URLSearchParams();
      if (surfaces) query.set('surfaces', surfaces);
      if (selectedLevels) query.set('levels', selectedLevels);
      query.set('limit', '0'); // tutti

      const res = await fetch(`/api/seasons/${year}/records/count?${query}`);
      const data: Stats = await res.json();

      // Mappa label a key
      const keyMap: Record<string, keyof Stats> = {
        Titles: 'topTitles',
        Wins: 'topWins',
        Played: 'topPlayed',
        Entries: 'topEntries',
      };
      const key = keyMap[label];
      if (key) {
        setStats(prev => prev ? { ...prev, [key]: { ...prev[key], fullList: data[key].fullList || [] } } : null);
        setActiveModal(key);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingModal(false);
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
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--col-1)' }} />
        <col style={{ width: 'var(--col-2)' }} />
      </colgroup>
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Count</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <Flag ioc={p.ioc} className="w-4 h-3" />
              <Link href={getPlayerHrefWithTab(p.slug ?? String(p.id), 'matches')} className="text-blue-400 hover:underline">{p.name}</Link>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{p.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTable = (data: PlayerStat[], title: string) => (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <PlayerTable data={data} />
    </div>
  );

  const sectionsArr = [
    { key: 'topTitles', title: 'Top Titles' },
    { key: 'topWins', title: 'Top Wins' },
    { key: 'topPlayed', title: 'Top Played' },
    { key: 'topEntries', title: 'Top Entries' },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {sections.slice(0, visibleCount).map((section) => (
          <div key={section.label} className="p-1 border border-white bg-transparent rounded-none" style={{ ['--col-1' as any]: '70%', ['--col-2' as any]: '30%' }}>
            <div className="p-3">
              <h4 className="font-medium mb-2 text-white">{section.label}</h4>
              {section.data.list.length > 0 ? (
                <>
                  <table className="w-full text-sm border-collapse table-fixed">
                    <colgroup>
                      <col style={{ width: 'var(--col-1)' }} />
                      <col style={{ width: 'var(--col-2)' }} />
                    </colgroup>
                    <thead className="bg-gray-900">
                      <tr className="border-b border-gray-600">
                        <th className="text-left py-1 text-white">Player</th>
                        <th className="text-right py-1 text-white whitespace-nowrap">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.data.list.map((p) => (
                        <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                          <td className="py-1 flex items-center gap-2 text-white min-w-0">
                            <Flag ioc={p.ioc} className="w-4 h-3" />
                            <Link href={getPlayerHrefWithTab(p.slug ?? String(p.id), 'matches')} className="text-blue-400 hover:underline truncate block min-w-0">{p.name}</Link>
                          </td>
                          <td className="py-1 text-white text-right whitespace-nowrap">{p.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

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
          </div>
        ))}

        {isMobile && visibleCount < sections.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>

      {activeModal && (
        <ModalTournamentsSeasons
          title={sectionsArr.find((s) => s.key === activeModal)?.title || ''}
          onClose={() => setActiveModal(null)}
        >
          {loadingModal ? (
            <p className="text-white text-center">Loading...</p>
          ) : (
            <div style={{ ['--col-1' as any]: '70%', ['--col-2' as any]: '30%' }}>
              {renderTable(
                stats?.[activeModal as keyof Stats]?.fullList ?? [],
                sectionsArr.find((s) => s.key === activeModal)?.title || ''
              )}
            </div>
          )}
        </ModalTournamentsSeasons>
      )}
    </div>
  );
}
