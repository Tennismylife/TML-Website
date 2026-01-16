'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';

interface PlayerStat {
  id: string | number;
  name: string;
  ioc: string;
  count: number;
}

interface RoundItem {
  title: string;
  list: PlayerStat[];
  fullList?: PlayerStat[];
}

// RoundCard with table-like appearance (header, rows, links)
const RoundCard = React.memo(function RoundCard({
  item,
  onOpen,
  loading
}: {
  item: RoundItem;
  onOpen: (title: string) => void;
  loading?: boolean;
}) {
  return (
    <div className="border rounded p-4 bg-gray-900 text-white overflow-hidden">
      <div className="pb-2">
        <h4 className="font-medium">{item.title}</h4>
      </div>

      <table className="w-full text-sm border-collapse table-fixed">
        <colgroup>
          <col style={{ width: 'calc(100% - 80px)' }} />
          <col style={{ width: '80px' }} />
        </colgroup>
        <thead>
          <tr className="bg-gray-800">
            <th className="text-left py-1 text-gray-300">Player</th>
            <th className="text-right py-1 text-gray-300 whitespace-nowrap">Reaches</th>
          </tr>
        </thead>
        <tbody>
          {item.list?.map((it, idx) => (
            <tr key={it.id} className={`border-b border-gray-700 ${idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800'}`}>
              <td className="py-1 flex items-center gap-2 text-white min-w-0">
                <Flag ioc={it.ioc} className="w-4 h-3" />
                <div className="truncate">
                  <Link href={`/players/${encodeURIComponent(String(it.id))}`} prefetch={false} className="text-blue-400 hover:underline">
                    {it.name}
                  </Link>
                </div>
              </td>
              <td className="py-1 text-white text-right whitespace-nowrap overflow-hidden max-w-[80px]">{it.count}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2">
        <button
          onClick={() => onOpen(item.title)}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {loading ? 'Loading...' : 'View All'}
        </button>
      </div>
    </div>
  );
});

export default function RoundsSection({ tournamentId }: { tournamentId: string }) {
  const [roundItems, setRoundItems] = useState<RoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ title: string; list: PlayerStat[] } | null>(null);
  const [loadingRounds, setLoadingRounds] = useState<{ [round: string]: boolean }>({});
  const [tourneyName, setTourneyName] = useState<string>(String(tournamentId));

  // tournament name for modal headings
  useEffect(() => {
    let mounted = true;
    const { fetchTournamentHeaderCached } = require('@/lib/tournamentHeaderCache');
    const p = fetchTournamentHeaderCached(tournamentId);
    (p && (p as any).then ? (p as any).then((t: any) => {
      if (!mounted || !t) return;
      const raw = (t && t.name) ? (Array.isArray(t.name) ? (t.name.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean).pop()) : t.name) : `Tournament ${t?.id}`;
      setTourneyName(String(raw).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }) : (async () => { const t = await p; if (!mounted || !t) return; const raw = (t && t.name) ? (Array.isArray(t.name) ? (t.name.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean).pop()) : t.name) : `Tournament ${t?.id}`; setTourneyName(String(raw).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())); })());
    return () => { mounted = false; };
  }, [tournamentId]);

  // how many round cards to show (initially 1 on mobile, all on desktop)
  const [visibleCards, setVisibleCards] = useState<number>(1);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const isLoadingMoreRef = useRef<boolean>(false);
  // timer handle for scheduled reveals (cleared on cleanup)
  const loadTimerRef = useRef<number | null>(null);
  // sentinel ref so we don't query the DOM repeatedly
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // ─── Open modal: fetch fullList lazy ───
  const handleOpenModal = useCallback(async (roundTitle: string) => {
    const round = roundItems.find(r => r.title === roundTitle);
    if (!round) return;

    // show client fallback modal immediately
    const existing = round.fullList ?? null;
    setModalData({ title: roundTitle, list: existing ?? [] });

    // hide server-injected modal if present
    try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = 'none'; } catch (e) {}

    // push history state so the outlet recognizes modal navigation
    const target = `/tournaments/${tournamentId}/records/rounds/${encodeURIComponent(roundTitle)}`;
    const background = typeof window !== 'undefined' ? window.location.pathname + window.location.search : undefined;
    try {
      window.history.pushState({ ...(window.history.state || {}), modal: true, background }, '', target);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.dispatchEvent(new CustomEvent('modalchange'));

      // notify outlet with payload (namespaced to avoid collisions)
      const payload = { section: 'rounds', title: roundTitle, list: existing ?? null };
      window.dispatchEvent(new CustomEvent('open-modal', { detail: payload }));
    } catch (e) {
      // ignore
    }

    if (existing) return;

    setLoadingRounds(prev => ({ ...prev, [roundTitle]: true }));
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/records/rounds?round=${encodeURIComponent(roundTitle)}&full=true`
      );
      if (!res.ok) throw new Error('Failed to fetch full round');

      const data = await res.json();
      const fullRound = data.roundItems[0]; // solo il round richiesto
      if (fullRound) {
        setRoundItems(prev =>
          prev.map(r =>
            r.title === roundTitle ? { ...r, fullList: fullRound.fullList } : r
          )
        );
        setModalData({ title: roundTitle, list: fullRound.fullList });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingRounds(prev => ({ ...prev, [roundTitle]: false }));
    }
  }, [roundItems, tournamentId]);

  // ─── Primo fetch: top10 per round ───
  useEffect(() => {
    const fetchTop10 = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/records/rounds`);
        if (!res.ok) throw new Error('Failed to fetch rounds');
        const data = await res.json();
        setRoundItems(
          data.roundItems.map((r: any) => ({
            title: r.title,
            list: r.list,  // solo top10
          }))
        );


      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchTop10();
  }, [tournamentId]);

  // detect mobile (tailwind md breakpoint ~768px)
  useEffect(() => {
    const m = window.matchMedia('(max-width: 767.98px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile((e as MediaQueryListEvent).matches ?? (e as MediaQueryList).matches);
    setIsMobile(m.matches);
    m.addEventListener('change', handler as any);
    return () => m.removeEventListener('change', handler as any);
  }, []);

  // keep visibleCards in sync with device/available rounds
  useEffect(() => {
    if (!isMobile) {
      setVisibleCards(roundItems.length);
    } else {
      setVisibleCards(prev => Math.max(1, Math.min(prev, roundItems.length)));
    }
  }, [isMobile, roundItems.length]);

  // Close modal when a global 'close-modal' event is dispatched
  useEffect(() => {
    const handleCloseModal = () => {
      setModalData(null);
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = ''; } catch (e) {}
    };
    window.addEventListener('close-modal', handleCloseModal as EventListener);
    return () => window.removeEventListener('close-modal', handleCloseModal as EventListener);
  }, []);

  // observe a single sentinel at the end to progressively reveal one card at a time on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (visibleCards >= roundItems.length) return;

    const DEBOUNCE_MS = 1200; // increase debounce to avoid jank on low-end devices

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
          setVisibleCards(prev => Math.min(prev + 1, roundItems.length));
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
  }, [isMobile, roundItems.length, visibleCards]);

  if (loading) return <div className="text-white">Loading...</div>;
  if (error) return <div className="text-white">Error: {error}</div>;

  // ─── Helper per render tabella ───
  const renderTable = (data: PlayerStat[], title: string) => (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-left py-1 text-white">{title}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr key={item.id} className="border-b border-gray-700">
            <td className="py-1 flex items-center gap-2 text-white">
              <Flag ioc={item.ioc} className="w-4 h-3" />
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} prefetch={false} className="text-blue-400">
                {item.name}
              </Link>
            </td>
            <td className="py-1 text-white">{item.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ─── Open modal: fetch fullList lazy ───
  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)'
  };

  return (
    <div>
      <h3 className="font-medium mb-4 text-white">Reaches per Round</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roundItems.slice(0, visibleCards).map((item) => (
          <RoundCard key={item.title} item={item} onOpen={handleOpenModal} loading={loadingRounds[item.title]} />
        ))}
      </div>

      {/* sentinel placed after the grid to avoid layout thrashing while adding cards */}
      {isMobile && visibleCards < roundItems.length && (
        <div ref={sentinelRef} className="cards-sentinel h-4" />
      )}

      {modalData && (
        <ModalTournamentsSeasons title={`Most ${modalData.title} Appearances at the ${tourneyName}`} onClose={() => setModalData(null)}>
          <div className="text-center text-lg md:text-xl">
            {renderTable(modalData.list, 'Reaches')}
          </div>
        </ModalTournamentsSeasons>
      )}
    </div>
  );
}
