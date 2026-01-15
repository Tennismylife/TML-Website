'use client'

import { useState, useEffect } from 'react';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getFlagFromIOC } from "@/lib/utils";

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
  const router = useRouter();
  const [loadingViewAll, setLoadingViewAll] = useState<string | null>(null);

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

  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(roundsData?.allRoundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!roundsData) return <div className="text-white text-center py-10">No data available</div>;

  const allRoundItems = roundsData?.allRoundItems ?? []; 

  const handleMinEntriesChange = (round: string, value: number) => {
    setMinEntriesPerRound(prev => ({ ...prev, [round]: value }));
  };

  const updatedRoundItems = allRoundItems.map(item => {
    const minEntries = minEntriesPerRound[item.title] || 1;
    const filtered = (item.fullList ?? []).filter(p => p.totalEntries >= minEntries);
    return {
      ...item,
      list: (filtered.slice(0, 10)),
      fullFilteredList: filtered,
      minEntries,
    };
  });

  const visibleRoundItems = updatedRoundItems.slice(0, visibleCount);

  // Intercepted-route modal flow like other sections (router.push -> history.replaceState -> dispatch open-modal)
  const handleViewAll = async (roundTitle: string) => {
    try {
      setLoadingViewAll(roundTitle);
      const section = 'roundsonentries';
      const newPath = `/tournaments/${id}/records/roundsonentries/rounds/${encodeURIComponent(String(roundTitle))}`;
      const state = { modal: true, background: window.location.pathname, section, title: roundTitle } as any;
      try { console.debug('[RoundsOnEntries] handleViewAll start', { newPath, state }); } catch (e) {}

      // write fallback payloads for late-mounted outlets
      try {
        (window as any).__lastOpenModalPayload = state;
        (window as any).__modalBackgroundPath = state.background;
      } catch (e) {}

      // navigate SPA to mount the layout
      try {
        const nav: any = router.push(newPath as any);
        const doReplaceAndDispatch = () => {
          try { window.history.replaceState(state, '', newPath); } catch (e) {}
          try { window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
        };

        if (nav && typeof nav.then === 'function') {
          nav.then(() => {
            try { (window as any).__modalOpenedByPush = true; } catch (e) {}
            doReplaceAndDispatch();
          }).catch(() => doReplaceAndDispatch());
        } else {
          setTimeout(doReplaceAndDispatch, 120);
        }
      } catch (e) {
        try { console.warn('[RoundsOnEntries] handleViewAll navigation failed, dispatching anyway', e); } catch (ex) {}
        try { window.history.replaceState(state, '', newPath); } catch (e) {}
        try { window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
      } finally {
        setLoadingViewAll(null);
      }
    } catch (err) {
      try { console.warn('[RoundsOnEntries] handleViewAll failed', err); } catch (e) {}
      setLoadingViewAll(null);
    }
  };

  const PlayerTable = ({ data }: { data: PlayerRoundEntry[] }) => (
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
          <th className="text-right py-1 text-white whitespace-nowrap">Reaches</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Entries</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Percentage</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={`${item.id}-${item.reaches}`} className="border-b border-gray-700">
            <td className="py-1 flex items-center gap-2 text-white min-w-0">
              <span className="text-base">{getFlagFromIOC(item.ioc) || ""}</span>
              <div className="truncate">
                <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
                  {item.name}
                </Link>
              </div>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.reaches}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.totalEntries}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.percentage.toFixed(1)}%</td>
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
    <div>
      <h3 className="font-medium mb-4 text-white">
        Percentage of Round Reached out of Entries
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleRoundItems.map(item => (
          <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ ...(cardStyle as any), ['--pcol-1' as any]: '40%', ['--pcol-2' as any]: '20%', ['--pcol-3' as any]: '20%', ['--pcol-4' as any]: '20%' }}>
            <div className="p-3">
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
                  type="button"
                  onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); console.debug('[RoundsOnEntries] View All clicked', item.title); } catch (ex) {} ; handleViewAll(item.title); }}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={loadingViewAll === item.title}
                >
                  {loadingViewAll === item.title ? 'Loading...' : 'View All'}
                </button>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
            </div>
          </div>
        ))}

        {isMobile && visibleCount < updatedRoundItems.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>


    </div>
  );
}
