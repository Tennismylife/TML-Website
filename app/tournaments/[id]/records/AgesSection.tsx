'use client'

import React, { useState, useEffect } from 'react';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import Flag from '@/components/Flag';

import { useRouter } from 'next/navigation';

interface PlayerStatAge {
  id: string | number;
  name: string;
  ioc: string;
  age: number;
  year: number;
  tourney_id?: string | number;
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
  linkId?: string | number;
  activeSubTab: 'main' | 'winners' | 'titles' | 'youngestrounds' | 'oldestrounds';
}

export default function AgesSection({ id, linkId, activeSubTab }: AgesSectionProps) {
  const [agesData, setAgesData] = useState<AgesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // keep modal state hook in place to preserve hook order for consistent hydration
  const [modalData, setModalData] = useState<{ title: string; list: PlayerStatAge[] } | null>(null);


  // call incremental hook at top-level to keep hooks order stable across renders
  const totalItemsForHook = agesData ? (activeSubTab === 'youngestrounds' ? (agesData.allYoungestItems?.length ?? 0) : (agesData.allOldestItems?.length ?? 0)) : 0;
  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(totalItemsForHook, { initialVisible: 1, debounceMs: 1000 });

  // Next.js router hook (must remain at top-level and keep position stable)
  const router = useRouter();

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

  // Close modal when a global 'close-modal' event is dispatched
  useEffect(() => {
    const handleCloseModal = () => {
      try { setModalData(null); } catch (e) {}
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = ''; } catch (e) {}
    };
    window.addEventListener('close-modal', handleCloseModal as EventListener);
    return () => window.removeEventListener('close-modal', handleCloseModal as EventListener);
  }, []);

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;
  if (!agesData) return <div className="text-white">No data</div>;

  const formatAge = (age: number) => {
    const years = Math.floor(age);
    const days = Math.round((age - years) * 365.25);
    return `${years}y ${days}d`;
  };

  const handleViewAll = (
    type: 'topYoungest' | 'topOldest' | 'topYoungestWinners' | 'topOldestWinners' | 'allYoungestItems' | 'allOldestItems',
    title?: string
  ) => {
    try {
      const isYoung = ['topYoungest', 'topYoungestWinners', 'allYoungestItems'].includes(type);
      const which = isYoung ? 'youngest' : 'oldest';
      const sectionSegment = activeSubTab === 'titles' ? 'titles' : (activeSubTab === 'youngestrounds' || activeSubTab === 'oldestrounds' ? activeSubTab : 'main');

      const baseId = linkId ?? id;
      const newPath = (sectionSegment === 'youngestrounds' || sectionSegment === 'oldestrounds') && title
        ? `/tournaments/${baseId}/records/ages/${sectionSegment}/${encodeURIComponent(String(title))}`
        : `/tournaments/${baseId}/records/ages/${sectionSegment}/${which}`;

      if (typeof window !== 'undefined') {
        const dispatchedSection = `ages-${sectionSegment}`;
        const state = { modal: true, background: window.location.pathname, which, title, section: dispatchedSection };

        // write fallback payload for non-promise routers
        try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}

        // Navigate first, then replace state + dispatch open-modal after navigation completes so the modal outlet is mounted
        try {
          const nav: any = router.push(newPath);
          if (nav && typeof nav.then === 'function') {
            nav.then(() => {
              try { (window as any).__modalOpenedByPush = true; } catch (e) {}
              try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
            }).catch(() => {
              setTimeout(() => { try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {} }, 300);
            });
          } else {
            // fallback for routers that don't return a promise
            setTimeout(() => { try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {} }, 350);
          }
        } catch (e) {
          // ultimate fallback: replace state and dispatch
          try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (err) {}
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const items = activeSubTab === 'youngestrounds' ? agesData.allYoungestItems || [] : agesData.allOldestItems || [];
  const visibleItems = items.slice(0, visibleCount);



  const renderTable = (data: PlayerStatAge[], showYear = true) => (    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--col-1)' }} />
        <col style={{ width: showYear ? 'var(--col-2)' : 'var(--col-2-alt)' }} />
        {showYear && <col style={{ width: 'var(--col-3)' }} />}
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Age</th>
          {showYear && <th className="text-right py-1 text-white whitespace-nowrap">Year</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((p, index) => (
          <tr key={`${p.id}-${p.year}-${index}`} className="border-b border-gray-700">
            <td className="py-1 min-w-0">
              <div className="flex items-center gap-2 truncate">
                <Flag ioc={p.ioc} className="w-4 h-3" />
                <Link href={`/players/${encodeURIComponent(String(p.id))}`} className="text-blue-400 hover:underline truncate">{p.name}</Link>
              </div>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{formatAge(p.age)}</td>
            {showYear && <td className="py-1 text-white text-right whitespace-nowrap">
              <Link href={`/tournaments/${p.tourney_id ?? linkId ?? id}/${p.year}`} className="text-blue-400 hover:underline">{p.year}</Link>
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
      <div className="grid md:grid-cols-2 gap-4" style={{ ['--col-1' as any]: '60%', ['--col-2' as any]: '20%', ['--col-2-alt' as any]: '40%', ['--col-3' as any]: '20%' }}>
        <div className="p-1 border border-gray-700 bg-gray-800 rounded">
          <div className="p-3">
            <h3 className="text-white font-medium mb-2">{leftTitle}</h3>
            {renderTable(leftData || [])}
            <button onClick={() => handleViewAll(activeSubTab === 'main' ? 'topYoungest' : 'topYoungestWinners')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
          </div>
        </div>

        <div className="p-1 border border-gray-700 bg-gray-800 rounded">
          <div className="p-3">
            <h3 className="text-white font-medium mb-2">{rightTitle}</h3>
            {renderTable(rightData || [])}
            <button onClick={() => handleViewAll(activeSubTab === 'main' ? 'topOldest' : 'topOldestWinners')} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">View All</button>
          </div>
        </div>
      </div>
    );
  }

  // --- Rounds ---
  return (
    <div>
      <h3 className="text-white font-bold mb-4 text-lg">
        {activeSubTab === 'youngestrounds' ? 'Youngest per Round' : 'Oldest per Round'}
      </h3>

      <div className="grid md:grid-cols-2 gap-4">
        {visibleItems.map(item => (
          <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ ['--col-1' as any]: '60%', ['--col-2' as any]: '20%', ['--col-2-alt' as any]: '40%', ['--col-3' as any]: '20%' }}>
            <div className="p-3">
              <h4 className="text-white font-medium mb-2">{item.title}</h4>
              {renderTable(item.list)}
              <button
                onClick={() => handleViewAll(activeSubTab === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems', item.title)}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
              >
                View All
              </button>
            </div>
          </div>
        ))}

        {isMobile && visibleCount < items.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>

    </div>
  );
}
