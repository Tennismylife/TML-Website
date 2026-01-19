'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import RouteModal from '@/components/RouteModal';
import Flag from '@/components/Flag';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import { getPlayerHref } from '@/lib/utils';

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

// Memoized Section card for counts (keeps layout but optimized)
const SectionCard = React.memo(function SectionCard({
  id,
  title,
  data,
  onOpen,
  loading
}: {
  id?: string;
  title: string;
  data: PlayerItem[];
  onOpen: (key: string) => void;
  loading?: boolean;
}) {
  const headingMap: Record<string, string> = {
    Titles: 'Most Titles',
    Wins: 'Most Wins',
    Played: 'Most Matches Played',
    Entries: 'Most Entries',
  };

  const heading = headingMap[title] ?? title;
  const headingId = id ? `${id}-label` : `section-${title.toLowerCase().replace(/\s+/g, '-')}-label`;

  return (
    <section id={id} aria-labelledby={headingId} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ backgroundColor: 'rgba(31,41,55,0.95)', ['--col-1' as any]: 'calc(100% - 80px)', ['--col-2' as any]: '80px' }}>
      <div className="p-3">
        <h2 id={headingId} className="font-medium mb-2 text-white">{heading}</h2>
        <table className="w-full text-sm border-collapse table-fixed">
          <colgroup>
            <col style={{ width: 'var(--col-1)' }} />
            <col style={{ width: 'var(--col-2)' }} />
          </colgroup>
          <thead className="bg-gray-900">
            <tr>
              <th className="text-left py-1 font-medium text-gray-300">Player</th>
              <th className="text-right py-1 font-medium text-gray-300 whitespace-nowrap">{title}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.id} className="border-b border-gray-700">
                <td className="py-1 min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <Flag ioc={item.ioc} className="w-4 h-3" />
                    <Link href={getPlayerHref((item as any).slug ?? String(item.id))} prefetch={false} className="text-blue-400 hover:underline truncate">
                      {item.name}
                    </Link>
                  </div>
                </td>
                <td className="py-1 text-right whitespace-nowrap max-w-[80px]">{item.count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-2">
          <button onClick={() => onOpen(title.toLowerCase())} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            {loading ? 'Loading...' : 'View All'}
          </button>
        </div>
      </div>
    </section>
  );
});

// Simple in-memory cache and dedupe for counts fetch
const countsCache = new Map<string, Record<string, SectionData>>();
const countsFetchInFlight = new Map<string, Promise<Record<string, SectionData>>>();

export default function CountSection({ tournamentId }: { tournamentId: string }) {
  const [sections, setSections] = useState<Record<string, SectionData>>({
    titles: { list: [] },
    wins: { list: [] },
    played: { list: [] },
    entries: { list: [] },
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // mobile incremental cards: how many section cards to show (1 on mobile, all on desktop)
  const [visibleCards, setVisibleCards] = useState<number>(1);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const isLoadingMoreRef = useRef<boolean>(false);
  const loadTimerRef = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const sectionsArr = [
    { key: 'titles', title: 'Titles' },
    { key: 'wins', title: 'Wins' },
    { key: 'played', title: 'Played' },
    { key: 'entries', title: 'Entries' },
  ];

  // Fetch iniziale solo top 10 (deduped + cached)
  useEffect(() => {
    let mounted = true;

    // return cached immediately if present
    if (countsCache.has(tournamentId)) {
      setSections(countsCache.get(tournamentId) as any);
      setLoading(false);
      return;
    }

    // If a fetch is already in flight for this id, reuse its promise
    const inFlight = countsFetchInFlight.get(tournamentId);
    if (inFlight) {
      inFlight.then((cached) => {
        if (!mounted) return;
        setSections(cached as any);
        setLoading(false);
      }).catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
      return;
    }

    // otherwise start the fetch and store the promise
    const fetchPromise = (async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/records/count`);
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();

        const parsed = {
          titles: { list: data.titles ?? [] },
          wins: { list: data.wins ?? [] },
          played: { list: data.played ?? [] },
          entries: { list: data.entries ?? [] },
        } as Record<string, SectionData>;

        countsCache.set(tournamentId, parsed);
        return parsed;
      } catch (err) {
        throw err;
      } finally {
        countsFetchInFlight.delete(tournamentId);
      }
    })();

    countsFetchInFlight.set(tournamentId, fetchPromise);

    fetchPromise.then((parsed) => {
      if (!mounted) return;
      setSections(parsed as any);
      setLoading(false);
    }).catch((err) => {
      if (!mounted) return;
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    });

    return () => { mounted = false; };
  }, [tournamentId]);

  // detect mobile (tailwind md breakpoint ~768px)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as MediaQueryListEvent).matches ?? (e as MediaQueryList).matches);
    setIsMobile(m.matches);
    m.addEventListener('change', handler as any);
    return () => m.removeEventListener('change', handler as any);
  }, []);

  // keep visibleCards in sync with device/available sections
  useEffect(() => {
    if (!isMobile) {
      setVisibleCards(sectionsArr.length);
    } else {
      setVisibleCards(prev => Math.max(1, Math.min(prev, sectionsArr.length)));
    }
  }, [isMobile, sectionsArr.length]);

  // incremental reveal sentinel (mobile)
  useEffect(() => {
    if (!isMobile) return;
    if (visibleCards >= sectionsArr.length) return;

    const DEBOUNCE_MS = 1000;

    const scheduleReveal = (cb: () => void) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(cb, { timeout: DEBOUNCE_MS });
      } else {
        const t = setTimeout(cb, DEBOUNCE_MS);
        loadTimerRef.current = t as unknown as number;
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;

        scheduleReveal(() => {
          setVisibleCards(prev => Math.min(prev + 1, sectionsArr.length));
          isLoadingMoreRef.current = false;
        });
      });
    }, { rootMargin: '200px', threshold: 0.6 });

    const sentinel = sentinelRef.current;
    if (sentinel) observer.observe(sentinel);
    return () => {
      observer.disconnect();
      if (loadTimerRef.current) {
        clearTimeout(loadTimerRef.current);
        loadTimerRef.current = null;
        isLoadingMoreRef.current = false;
      }
    };
  }, [isMobile, sectionsArr.length, visibleCards]);
  // Open modal by navigating to canonical intercepted route
  const router = useRouter();

  // Client-side modal fallback state
  const [clientModal, setClientModal] = useState<{ open: boolean; section?: string; list?: PlayerItem[] | null; loading?: boolean }>({ open: false });
  const [tourneyName, setTourneyName] = useState<string>(String(tournamentId));

  function extractFirst(value: any): string {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.map(extractFirst).find(Boolean) || '';
    if (typeof value === 'object') return Object.values(value).map(extractFirst).find(Boolean) || '';
    return '';
  }
  function humanizeName(name: string) {
    return name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  useEffect(() => {
    let mounted = true;
    const p = fetchTournamentHeaderCached(tournamentId);
    (p && (p as any).then ? (p as any).then((t: any) => {
      if (!mounted || !t) return;
      const raw = extractFirst(t.name) || `Tournament ${t.id}`;
      setTourneyName(humanizeName(raw));
    }) : (async () => { const t = await p; if (!mounted || !t) return; const raw = extractFirst(t.name) || `Tournament ${t.id}`; setTourneyName(humanizeName(raw)); })());
    return () => { mounted = false; };
  }, [tournamentId]);

  useEffect(() => {
    const onPop = () => {
      const st = (typeof window !== 'undefined' && window.history.state) || null;
      if (!st || !st.modal) {
        setClientModal({ open: false });
      }
    };
    window.addEventListener('popstate', onPop);

    const handleCloseModal = () => {
      setClientModal({ open: false });
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = ''; } catch (e) {}
    };
    window.addEventListener('close-modal', handleCloseModal as EventListener);

    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('close-modal', handleCloseModal as EventListener); };
  }, []);

  const openModal = useCallback((sectionKey: string) => {
    // If already open for same section, ignore
    if (clientModal.open && clientModal.section === sectionKey) return;

    // show client modal immediately (fallback) and start loading if needed
    const existing = (sections as any)?.[sectionKey]?.fullList ?? null;
    setClientModal({ open: true, section: sectionKey, list: existing, loading: !existing });

    if (!existing) {
      fetch(`/api/tournaments/${tournamentId}/records/count?section=${sectionKey}`)
        .then((r) => r.json())
        .then((data) => setClientModal({ open: true, section: sectionKey, list: data.fullList ?? [], loading: false }))
        .catch(() => setClientModal({ open: true, section: sectionKey, list: [], loading: false }));
    }

    const target = `/tournaments/${tournamentId}/records/count/${encodeURIComponent(sectionKey)}`;
    const background = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined;

    try {
      console.debug('[CountSection] pushing modal state (fallback open)', { target, background, prevState: window.history.state });
      window.history.pushState({ ...(window.history.state || {}), modal: true, background }, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new CustomEvent('modalchange'));
      // notify outlet that we opened (with payload)
      const payload = { section: sectionKey, list: existing ?? null };
      window.dispatchEvent(new CustomEvent('open-modal', { detail: payload }));
      console.debug('[CountSection] state pushed (fallback)', window.history.state, 'payload:', payload);
    } catch (e) {
      // fallback navigation
      router.push(target);
    }
  }, [tournamentId, router, clientModal.open, clientModal.section, sections]);

  const renderTable = (data: PlayerItem[], title: string) => (
    <div style={{ ['--col-1' as any]: '70%', ['--col-2' as any]: '30%' }}>
      <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
        <colgroup>
          <col style={{ width: 'var(--col-1)' }} />
          <col style={{ width: 'var(--col-2)' }} />
        </colgroup>
        <thead className="bg-gray-900">
          <tr>
            <th className="text-center py-1 font-medium text-white">Player</th>
            <th className="text-center py-1 font-medium text-white whitespace-nowrap">{title}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-gray-100">
              <td className="py-1 text-center">
                <div className="flex items-center justify-center gap-2">
                  <Flag ioc={item.ioc} className="w-4 h-3" />
                  <Link
                    href={getPlayerHref((item as any).slug ?? String(item.id))}
                    className="text-blue-700 hover:underline text-lg md:text-xl"
                  >
                    {item.name}
                  </Link>
                </div>
              </td>
              <td className="py-1 text-center whitespace-nowrap text-lg md:text-xl">{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {sectionsArr.slice(0, visibleCards).map((sec) => {
          const sectionData = sections[sec.key] ?? { list: [] };
          const list = sectionData.list ?? [];

          return (
            <SectionCard key={sec.key} title={sec.title} data={list} onOpen={openModal} />
          );
        })}
      </div>

      {/* sentinel for incremental reveal on mobile */}
      {isMobile && visibleCards < sectionsArr.length && (
        <div ref={sentinelRef} className="cards-sentinel h-4" />
      )}

      {/* Client-side fallback modal (opens immediately on click) */}
      {clientModal.open && (
        // @ts-ignore
        <RouteModal onClose={() => { window.history.state && window.history.state.modal ? window.history.back() : setClientModal({ open: false }); }}>
          <div className="text-white">
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{clientModal.section === 'titles' ? `Most Titles at ${tourneyName}` : clientModal.section === 'wins' ? `Most Wins at ${tourneyName}` : clientModal.section === 'played' ? `Most Matches Played at ${tourneyName}` : `Most Entries at ${tourneyName}`}</h3>
            </div>

            {clientModal.loading ? (
              <p className="text-white text-center p-6">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                {/* render table using same renderer */}
                {/* @ts-ignore */}
                {renderTable(clientModal.list ?? [], sectionsArr.find((s) => s.key === clientModal.section)?.title || '')}
              </div>
            )}
          </div>
        </RouteModal>
      )}

    </div>
  );
}
