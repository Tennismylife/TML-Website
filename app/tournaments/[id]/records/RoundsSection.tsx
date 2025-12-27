'use client'

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from "@/lib/utils";
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

export default function RoundsSection({ tournamentId }: { tournamentId: string }) {
  const [roundItems, setRoundItems] = useState<RoundItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ title: string; list: PlayerStat[] } | null>(null);
  const [loadingRounds, setLoadingRounds] = useState<{ [round: string]: boolean }>({});

  // how many round cards to show (initially 1 on mobile, all on desktop)
  const [visibleCards, setVisibleCards] = useState<number>(1);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const isLoadingMoreRef = useRef<boolean>(false);

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

  // observe a single sentinel at the end to progressively reveal one card at a time on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (visibleCards >= roundItems.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        // prevent rapid repeat triggers
        if (isLoadingMoreRef.current) return;
        isLoadingMoreRef.current = true;

        // unobserve the current sentinel to avoid multiple callbacks before DOM updates
        try { obs.unobserve(entry.target); } catch (e) { /* no-op */ }

        // reveal next card
        setVisibleCards(prev => Math.min(prev + 1, roundItems.length));

        // allow next increment after a short delay to avoid jank
        setTimeout(() => { isLoadingMoreRef.current = false; }, 250);
      });
    }, { rootMargin: '200px', threshold: 0.1 });

    const sentinel = document.querySelector('.cards-sentinel');
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
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
          <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
            <td className="py-1 flex items-center gap-2 text-white">
              <span className="text-base">{getFlagFromIOC(item.ioc) || ''}</span>
              <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline">
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
  const openModal = async (roundTitle: string) => {
    const round = roundItems.find(r => r.title === roundTitle);
    if (!round) return;

    if (round.fullList?.length) {
      setModalData({ title: roundTitle, list: round.fullList });
      return;
    }

    setLoadingRounds(prev => ({ ...prev, [roundTitle]: true }));
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/records/rounds?round=${roundTitle}&full=true`
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
  };



  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  return (
    <section className="rounded border p-4" style={cardStyle}>
      <h3 className="font-medium mb-4 text-white">Reaches per Round</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {roundItems.slice(0, visibleCards).map(item => (
          <div key={item.title} className="border rounded p-4" style={cardStyle}>
            <h4 className="font-medium mb-2 text-white">{item.title}</h4>
            {item.list?.length > 0 ? (
              <>
                {renderTable(item.list, 'Reaches')}
                <button
                  onClick={() => openModal(item.title)}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  {loadingRounds[item.title] ? 'Loading...' : 'View All'}
                </button>
              </>
            ) : (
              <p className="text-gray-400">No data available</p>
            )}
          </div>
        ))}

        {isMobile && visibleCards < roundItems.length && (
          <div className="cards-sentinel h-2" />
        )}
      </div>

      {modalData && (
        <ModalTournamentsSeasons title={`All Reaches for ${modalData.title}`} onClose={() => setModalData(null)}>
          {renderTable(modalData.list, 'Reaches')}
        </ModalTournamentsSeasons>
      )}
    </section>
  );
}
