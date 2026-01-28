'use client'

import React, { useState, useEffect } from 'react';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';

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

  // Client-side fallback modal state (like CountSection) - declare early to keep hooks order stable
  const [clientModal, setClientModal] = useState<{ open: boolean; section?: string; title?: string | null; list?: PlayerStatAge[] | null; loading?: boolean }>({ open: false });

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
      try { setClientModal({ open: false }); } catch(e) {}
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
      const sectionSegment = activeSubTab === 'titles' ? 'titles' : (activeSubTab === 'youngestrounds' || activeSubTab === 'oldestrounds' ? activeSubTab : 'main');
      // For rounds, pass title, for others pass which via which variable
      const isYoung = ['topYoungest', 'topYoungestWinners', 'allYoungestItems'].includes(type);
      const which = isYoung ? 'youngest' : 'oldest';

      if (sectionSegment === 'youngestrounds' || sectionSegment === 'oldestrounds') {
        openModal(sectionSegment, title ?? null);
      } else {
        // main or titles: open appropriate which
        openModal(sectionSegment, null, which);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const items = activeSubTab === 'youngestrounds' ? agesData.allYoungestItems || [] : agesData.allOldestItems || [];
  const visibleItems = items.slice(0, visibleCount);


  const openModal = (sectionKey: string, titleParam?: string | null, whichParam?: 'youngest' | 'oldest' | null) => {
    if (clientModal.open && clientModal.section === sectionKey && clientModal.title === titleParam && clientModal.list) return;

    // find existing fullList if present
    let existing: PlayerStatAge[] | null = null;

    if (sectionKey === 'main' || sectionKey === 'titles') {
      // if main/titles and which provided, existing lists are in agesData
      if (whichParam) {
        existing = whichParam === 'youngest' ? (agesData.topYoungest ?? null) as any : (agesData.topOldest ?? null) as any;
      }
    } else if (sectionKey === 'youngestrounds' || sectionKey === 'oldestrounds') {
      const listKey = sectionKey === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
      const all = (agesData as any)[listKey] ?? [];
      if (titleParam) {
        const found = all.find((it: any) => String(it.title) === String(titleParam) || String(it.title) === decodeURIComponent(String(titleParam)));
        existing = (found?.fullList ?? found?.list ?? null) as any;
      }
    }

    setClientModal({ open: true, section: sectionKey, title: titleParam ?? null, list: existing, loading: !existing });

    if (!existing) {
      // fetch full list
      const seg = sectionKey;
      const qs = new URLSearchParams();
      qs.set('full', 'true');
      if (titleParam) qs.set('title', String(titleParam));
      fetch(`/api/tournaments/${id}/records/ages/${seg}?${qs.toString()}`)
        .then((r) => r.json())
        .then((data) => {
          let rows: any[] = [];
          if (seg === 'titles') {
            rows = whichParam === 'youngest' ? (data.youngestWinners ?? data.topYoungestWinners ?? []) : (data.oldestWinners ?? data.topOldestWinners ?? []);
          } else if (seg === 'youngestrounds' || seg === 'oldestrounds') {
            const listKey = seg === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
            const all = data[listKey] ?? [];
            if (titleParam) {
              const found = all.find((it: any) => String(it.title) === String(titleParam) || String(it.title) === decodeURIComponent(String(titleParam)));
              rows = (found?.fullList ?? found?.list ?? []) as any[];
            } else {
              rows = (all || []).flatMap((it: any) => it.list ?? []);
            }
          } else {
            rows = whichParam === 'youngest' ? (data.topYoungest ?? data.youngestPlayers ?? []) : (data.topOldest ?? data.oldestPlayers ?? []);
          }
          setClientModal({ open: true, section: sectionKey, title: titleParam ?? null, list: rows as any[], loading: false });
        }).catch(() => setClientModal({ open: true, section: sectionKey, title: titleParam ?? null, list: [], loading: false }));
    }

    const target = sectionKey === 'main' || sectionKey === 'titles'
      ? `/tournaments/${id}/records/ages/${sectionKey}/${whichParam ?? ''}`
      : `/tournaments/${id}/records/ages/${sectionKey}/${titleParam ? encodeURIComponent(String(titleParam)) : ''}`;

    const background = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined;

    try {
      const payload = { section: `ages-${sectionKey}`, which: whichParam ?? null, title: titleParam ?? null, list: existing ?? null };
      window.history.pushState({ ...(window.history.state || {}), modal: true, background }, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new CustomEvent('modalchange'));
      window.dispatchEvent(new CustomEvent('open-modal', { detail: payload }));
    } catch (e) {
      router.push(target);
    }
  };



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
                <Link href={getPlayerHref((p as any).slug ?? String(p.id))} className="text-blue-400 hover:underline truncate">{p.name}</Link>
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
    const leftTitle = activeSubTab === 'main' ? "Youngest Players in Main Draw" : (activeSubTab === 'titles' ? "Youngest Title Winners" : "Youngest Winners");
    const rightTitle = activeSubTab === 'main' ? "Oldest Players in Main Draw" : (activeSubTab === 'titles' ? "Oldest Title Winners" : "Oldest Winners");

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
