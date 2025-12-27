'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';

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
  title,
  data,
  onOpen,
  loading
}: {
  title: string;
  data: PlayerItem[];
  onOpen: (key: string) => void;
  loading?: boolean;
}) {
  // Card is now content-only; visual wrapper is applied by the parent to avoid nested containers
  return (
    <>
      <h3 className="font-medium mb-2 text-white">{title}</h3>
      <table className="w-full text-sm border-collapse table-fixed">
        <colgroup>
          <col style={{ width: 'calc(100% - 80px)' }} />
          <col style={{ width: '80px' }} />
        </colgroup>
        <thead>
          <tr>
            <th className="text-left py-1 font-medium text-gray-300">Player</th>
            <th className="text-right py-1 font-medium text-gray-300">{title}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id} className="border-b border-gray-700">
              <td className="py-1 min-w-0">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-base">{getFlagFromIOC(item.ioc) || ''}</span>
                  <Link href={`/players/${encodeURIComponent(String(item.id))}`} prefetch={false} className="text-blue-400 hover:underline truncate">
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
    </>
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
  const [activeModal, setActiveModal] = useState<null | string>(null);
  const [loadingModal, setLoadingModal] = useState(false);

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
  // Apri modal e fetch fullList solo se non esiste
  const openModal = useCallback(async (sectionKey: string) => {
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
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingModal(false);
    }
  }, [sections, tournamentId]);

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
          <tr key={item.id} className="hover:bg-gray-100">
            <td className="py-1 flex items-center gap-2">
              <span className="text-base">{getFlagFromIOC(item.ioc) || ''}</span>
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
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {sectionsArr.slice(0, visibleCards).map((sec) => {
          const sectionData = sections[sec.key] ?? { list: [] };
          const list = sectionData.list ?? [];

          return (
            <div key={sec.key}>
              <SectionCard title={sec.title} data={list} onOpen={openModal} loading={loadingModal && activeModal === sec.key} />
            </div>
          );
        })}
      </div>

      {/* sentinel for incremental reveal on mobile */}
      {isMobile && visibleCards < sectionsArr.length && (
        <div ref={sentinelRef} className="cards-sentinel h-4" />
      )}


      {activeModal && (
        <ModalTournamentsSeasons
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
        </ModalTournamentsSeasons>
      )}
    </div>
  );
}
