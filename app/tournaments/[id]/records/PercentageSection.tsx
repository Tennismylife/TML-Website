'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import { playerMatchesUrl } from '../../../records/nav';

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

export default function PercentageSection({ id, activeSubTab }: { id: string; activeSubTab: 'overall' | 'rounds' }) {
  const [percentageData, setPercentageData] = useState<PercentageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ title: string; list: PlayerPercentage[] } | null>(null);
  const [minMatchesOverall, setMinMatchesOverall] = useState(1);
  const [minMatchesPerRound, setMinMatchesPerRound] = useState<{ [round: string]: number }>({});

  // call incremental hook early so hooks order is stable even before data loads
  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(percentageData?.allRoundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  // Next.js router hook (used to mount percentage layout via SPA navigation)
  const router = useRouter();

  // Debug: global click listener to see why View All clicks might be swallowed
  useEffect(() => {
    const onDocClick = (e: any) => {
      try { console.debug('[GlobalClickDebug] click', { target: e.target, closestViewAll: e.target?.closest ? e.target.closest('[data-view-all]') : null }); } catch (err) {}
    };
    document.addEventListener('click', onDocClick, true);

    // debug: global listener to see any open-modal events received at window scope
    const onOpenModalDebug = (e: any) => {
      try { console.debug('[GlobalOpenModalDebug] event received at window:', e?.detail); } catch (err) {}
    };
    window.addEventListener('open-modal', onOpenModalDebug as EventListener);

    return () => { document.removeEventListener('click', onDocClick, true); window.removeEventListener('open-modal', onOpenModalDebug as EventListener); };
  }, []);


  // --- Fetch data ---
  useEffect(() => {
    const fetchPercentages = async () => {
      try {
        setLoading(true);
        let url = `/api/tournaments/${id}/records/percentage`;
        if (activeSubTab === 'rounds') url = `/api/tournaments/${id}/records/percentage/rounds`;
        if (activeSubTab === 'overall') url = `/api/tournaments/${id}/records/percentage/wins`;

        const res = await fetch(url);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch percentage data');
        setPercentageData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchPercentages();
  }, [id, activeSubTab]);

  // --- Initialize minMatchesPerRound ---
  useEffect(() => {
    if (percentageData?.allRoundItems) {
      const initial: { [round: string]: number } = {};
      percentageData.allRoundItems.forEach(item => (initial[item.title] = minMatchesOverall));
      setMinMatchesPerRound(initial);
    }
  }, [percentageData, minMatchesOverall]);

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!percentageData) return <div className="text-white text-center py-10">No data available</div>;

  const { sortedOverall = [], allRoundItems = [] } = percentageData;

  // update hook with actual number of round items when data is available
  // (we call hook always above to keep hooks order stable)
  // Refresh visible count when number of rounds changes
  const _ = ((): void => {
    // update sentinel/visible behavior by calling hook side-effectically via reset/showAll if needed
    // Here we only pass updated total by using useEffect in hook; since hook stored internal state, pass total via param isn't reactive.
  })();

  const filteredOverall = sortedOverall.filter(p => p.wins + p.losses >= minMatchesOverall);
  const topOverall = filteredOverall.slice(0, 10);

  const updatedRoundItems = allRoundItems.map(item => {
    const minMatches = minMatchesPerRound[item.title] || 1;
    const filtered = item.fullList.filter(p => p.wins + p.losses >= minMatches);
    return { ...item, list: filtered.slice(0, 10), fullFilteredList: filtered, minMatches };
  });

  // which round cards to render (on mobile we reveal them progressively)
  const visibleRoundItems = updatedRoundItems.slice(0, visibleCount);

  // --- Table component ---
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
        {data.map(item => (
          <tr key={item.id} className="border-b border-gray-700">
            <td className="py-1 flex items-center gap-2 text-white min-w-0">
              <Flag ioc={item.ioc} className="w-4 h-3" />
              <div className="truncate">
                <Link href={playerMatchesUrl((item as any).slug ?? String(item.id))} className="text-blue-400 hover:underline">{item.name}</Link>
              </div>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.wins}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.losses}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.percentage.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleViewAll = (list: PlayerPercentage[], title: string) => {
    try {
      const sectionSegment = activeSubTab === 'overall' ? 'percentage-wins' : 'percentage-rounds';
      const baseId = id;
      const newPath = sectionSegment === 'percentage-rounds' ? `/tournaments/${baseId}/records/percentage/rounds/${encodeURIComponent(String(title))}` : `/tournaments/${baseId}/records/percentage/wins`;

      if (typeof window !== 'undefined') {
        const state = { modal: true, background: window.location.pathname, section: sectionSegment, title };
        // debug: indicate handler ran and state
        try { console.debug('[PercentageSection] handleViewAll start (navigation first, no pre-push)', { newPath, state }); } catch (e) {}
        // store on window so late-mounted outlets can pick it up if needed
        try { (window as any).__lastOpenModalPayload = state; } catch (e) {}

        const doReplaceAndDispatch = () => {
          try {
            // replace to ensure modal flag is preserved on the current (navigated) entry
            window.history.replaceState(state, '', newPath);
            // explicitly hide any server-injected modal that may have been rendered during navigation
            try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = 'none'; } catch (e) {}
            // ensure fallback global is updated
            try { (window as any).__lastOpenModalPayload = state; } catch (e) {}
            try { console.debug('[PercentageSection] replace-and-dispatch'); } catch (e) {}
            // single dispatch (plus one retry)
            window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: sectionSegment, title } }));
            setTimeout(() => { try { window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: sectionSegment, title } })); } catch(e) {} }, 150);
          } catch (e) { console.error('[PercentageSection] replace-and-dispatch failed', e); }
        };

        // SPA navigation first to mount the percentage layout
        try {
          const nav: any = router.push(newPath);
          try { console.debug('[PercentageSection] initiated router.push', newPath, 'nav:', nav); } catch (e) {}
          if (nav && typeof nav.then === 'function') {
            nav.then(() => {
              try { (window as any).__modalOpenedByPush = true; } catch (e) {}
              doReplaceAndDispatch();
            }).catch(() => setTimeout(doReplaceAndDispatch, 300));
          } else {
            // router might not return a promise; wait a bit and then run replace+dispatch
            setTimeout(doReplaceAndDispatch, 350);
          }
        } catch (e) {
          // if router fails, fall back to replacing history and dispatching immediately
          try { console.debug('[PercentageSection] router.push threw, falling back to history.replaceState'); } catch (ex) {}
          window.history.replaceState(state, '', newPath);
          window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: sectionSegment, title } }));
        }
      }

      // Re-apply the modal state after a short delay in case navigation triggered server-rendered modal
      // some router implementations don't return a promise; reapply state after next tick
      setTimeout(() => {
        try {
          if (typeof window !== 'undefined') {
            const state = { modal: true, background: window.location.pathname, section: sectionSegment, title };
            // replace to ensure modal flag is preserved for direct hydration checks
            window.history.replaceState(state, '', newPath);
            // explicitly hide any server-injected modal that may have been rendered during navigation
            try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = 'none'; } catch (e) {}
            // ensure fallback global is updated
            try { (window as any).__lastOpenModalPayload = state; } catch (e) {}
            try { console.debug('[PercentageSection] replaced state and updated __lastOpenModalPayload'); } catch (e) {}
            window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: sectionSegment, title } }));
            // extra retry dispatch in case the outlet mounts slightly later
            setTimeout(() => { try { window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: sectionSegment, title } })); } catch(e) {} }, 50);
          }
        } catch (e) { /* ignore */ }
      }, 300);
    } catch (err) {
      console.error(err);
      setModalData({ title, list });
    }
  };

  const handleMinMatchesChange = (round: string, value: number) => {
    setMinMatchesPerRound(prev => ({ ...prev, [round]: value }));
  };

  const cardStyle = { backgroundColor: 'rgba(31,41,55,0.95)', backdropFilter: 'blur(4px)' };

  return (
    <div>
      {activeSubTab === 'overall' ? (
        <div className="p-1 border border-gray-700 bg-gray-800 rounded">
          <div className="p-3">
            {topOverall.length > 0 ? (
              <div className="w-full md:w-1/2 mx-auto">
                <h3 className="font-medium mb-2 text-white">Overall Win Percentage</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-white">Minimum Matches: {minMatchesOverall}</label>
                  <input type="range" min="1" max="50" value={minMatchesOverall} onChange={e => setMinMatchesOverall(Number(e.target.value))} className="w-full" />
                </div>

                <PlayerTable data={topOverall} />
                <div className="text-center mt-2">
                  <button type="button" data-view-all="overall" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); } catch(ex) {} ; handleViewAll(filteredOverall, 'Overall Win Percentage'); }} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
                </div>
              </div>
            ) : (<p className="text-gray-400">No data available.</p>)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleRoundItems.map(item => (
            <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ ['--pcol-1' as any]: '40%', ['--pcol-2' as any]: '20%', ['--pcol-3' as any]: '20%', ['--pcol-4' as any]: '20%' }}>
              <div className="p-3">
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-white">
                    Minimum Matches ({item.title}): {item.minMatches}
                  </label>
                  <input type="range" min="1" max="50" value={item.minMatches} onChange={e => handleMinMatchesChange(item.title, Number(e.target.value))} className="w-full" />
                </div>

                <h4 className="font-medium mb-2 text-white">{item.title}</h4>
                <PlayerTable data={item.list} />

                <button type="button" data-view-all="round" onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); console.debug('[PercentageSection] View All round clicked (preventDefault)', item.title); } catch(ex) {} ; handleViewAll(item.fullFilteredList, item.title); }} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
                  View All
                </button>
              </div>
            </div>
          ))}
          {isMobile && visibleCount < updatedRoundItems.length && (
            <div ref={sentinelRef} className="cards-sentinel h-4" />
          )}
        </div>
      )}


    </div>
  );
}
