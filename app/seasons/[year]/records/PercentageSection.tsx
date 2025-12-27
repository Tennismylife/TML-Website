'use client'

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import useIncrementalCards from '../../../tournaments/[id]/records/hooks/useIncrementalCards';

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

interface PercentageSectionProps {
  year: string;
  selectedSurfaces: Set<string>;
  selectedLevels: string;
  activeSubTab: 'overall' | 'rounds';
}

export default function PercentageSection({ year, selectedSurfaces, selectedLevels, activeSubTab }: PercentageSectionProps) {
  const [percentageData, setPercentageData] = useState<PercentageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showOverallModal, setShowOverallModal] = useState(false);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerPercentage[] } | null>(null);

  const [minMatchesOverall, setMinMatchesOverall] = useState(1);
  const [minMatchesPerRound, setMinMatchesPerRound] = useState<{ [round: string]: number }>({});

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(percentageData?.allRoundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  // Fetch data
  useEffect(() => {
    const fetchPercentages = async () => {
      setLoading(true);
      setError(null);
      try {
        const surfaces = Array.from(selectedSurfaces).join(',');
        const query = new URLSearchParams();
        if (surfaces) query.set('surfaces', surfaces);
        if (selectedLevels) query.set('levels', selectedLevels);

        let url = '';
        if (activeSubTab === 'overall') {
          url = `/api/seasons/${year}/records/percentage/wins?${query}`;
        } else if (activeSubTab === 'rounds') {
          url = `/api/seasons/${year}/records/percentage/rounds?${query}`;
        }

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setPercentageData(data);

        if (data.allRoundItems) {
          const initial: { [round: string]: number } = {};
          data.allRoundItems.forEach((item: RoundItem) => (initial[item.title] = 1));
          setMinMatchesPerRound(initial);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPercentages();
  }, [year, selectedSurfaces, selectedLevels, activeSubTab]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!percentageData) return <div className="text-white text-center py-10">No data available</div>;

  const { sortedOverall = [], allRoundItems = [] } = percentageData;

  const filteredOverall = sortedOverall.filter(p => p.wins + p.losses >= minMatchesOverall);
  const topOverall = filteredOverall.slice(0, 10);

  const updatedRoundItems = allRoundItems.map(item => {
    const minMatches = minMatchesPerRound[item.title] || 1;
    const filtered = item.fullList.filter(p => p.wins + p.losses >= minMatches);
    return {
      ...item,
      list: filtered.slice(0, 10),
      fullFilteredList: filtered,
      minMatches,
    };
  });

  const PlayerTable = ({ data }: { data: PlayerPercentage[] }) => (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--pcol-1)' }} />
        <col style={{ width: 'var(--pcol-2)' }} />
        <col style={{ width: 'var(--pcol-3)' }} />
        <col style={{ width: 'var(--pcol-4)' }} />
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Wins</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Losses</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{getFlagFromIOC(item.ioc) || ""}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.wins}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.losses}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleMinMatchesChange = (round: string, value: number) => {
    setMinMatchesPerRound(prev => ({ ...prev, [round]: value }));
  };

  return (
    <section className="mb-4">
      {/* Overall Tab */}
      {activeSubTab === 'overall' && (
        <div className="mb-4">
          <h3 className="font-medium mb-2 text-white">Overall Win Percentage</h3>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {minMatchesOverall}</label>
            <input
              type="range"
              min="1"
              max="50"
              value={minMatchesOverall}
              onChange={(e) => setMinMatchesOverall(Number(e.target.value))}
              className="w-full"
            />
          </div>
          {topOverall.length > 0 ? (
            <>
              <PlayerTable data={topOverall} />
              <button
                onClick={() => setShowOverallModal(true)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                View All
              </button>
            </>
          ) : (
            <p className="text-gray-400">No data available.</p>
          )}
        </div>
      )}

      {/* Rounds Tab */}
      {activeSubTab === 'rounds' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {updatedRoundItems.slice(0, visibleCount).map((item) => (
            <div key={item.title} className="p-1 border border-white bg-transparent rounded-none" style={{ ['--pcol-1' as any]: '40%', ['--pcol-2' as any]: '20%', ['--pcol-3' as any]: '20%', ['--pcol-4' as any]: '20%' }}>
              <div className="p-3">
                <h4 className="font-medium mb-2 text-white">{item.title}</h4>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {item.minMatches}</label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={item.minMatches}
                    onChange={(e) => handleMinMatchesChange(item.title, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
                {item.list.length > 0 ? (
                  <>
                    <PlayerTable data={item.list} />
                    <button
                      onClick={() => setModalData({ title: item.title, list: item.fullFilteredList })}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      View All
                    </button>
                  </>
                ) : (
                  <p className="text-gray-400">No data available.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modali */}
      {showOverallModal && (
        <ModalTournamentsSeasons title="All Overall Win Percentages" onClose={() => setShowOverallModal(false)}>
          <PlayerTable data={filteredOverall} />
        </ModalTournamentsSeasons>
      )}
      {modalData && (
        <ModalTournamentsSeasons title={modalData.title} onClose={() => setModalData(null)}>
          <PlayerTable data={modalData.list} />
        </ModalTournamentsSeasons>
      )}
    </section>
  );
}
