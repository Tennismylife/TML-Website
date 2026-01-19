
'use client'

import React, { useState, useEffect } from 'react';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import { getPlayerHref } from '@/lib/utils';

interface Player {
  id: string | number;
  name: string;
  ioc: string;
}

interface RoundData {
  year: number;
  minGamesLost: number; // ✅ allineato alla signature originale dell'endpoint
  player: Player;
  tourney_id?: string | number;
}

interface RoundItem {
  round: string;
  data: RoundData[]; // 10 elementi (initial)
}

interface LeastData {
  roundItems: RoundItem[];
}

export default function LeastSection({ id, linkId }: { id: string; linkId?: string | number }) {
  const [leastData, setLeastData] = useState<LeastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalData, setModalData] = useState<{ round: string; data: RoundData[] } | null>(null);
  const [modalLoadingRound, setModalLoadingRound] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeast = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/tournaments/${id}/records/least`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch least data');
        setLeastData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchLeast();
  }, [id]);

  // blocca scroll quando il modal è aperto (kept for server-modals compatibility via global state)
  useEffect(() => {
    const checkModal = () => {
      const st = (typeof window !== 'undefined' && window.history.state) || null;
      if (st && st.modal) document.body.style.overflow = 'hidden'; else document.body.style.overflow = '';
    };
    checkModal();
    window.addEventListener('popstate', checkModal);
    return () => { window.removeEventListener('popstate', checkModal); document.body.style.overflow = ''; };
  }, []);

  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(leastData?.roundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!leastData) return <div className="text-white text-center py-10">No data available</div>;

  const roundItems = leastData?.roundItems ?? [];
  const roundOrder = ['W', 'F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];
  const sortedRoundItems = roundItems.slice().sort(
    (a, b) => roundOrder.indexOf(a.round) - roundOrder.indexOf(b.round)
  );

  const visibleRoundItems = sortedRoundItems.slice(0, visibleCount);

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const PlayerTable = ({ data }: { data: RoundData[] }) => (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: 'var(--col-1)' }} />
        <col style={{ width: 'var(--col-2)' }} />
        <col style={{ width: 'var(--col-3)' }} />
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white">Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Games</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Year</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr
            key={`${item.player.id}-${item.year}`}
            className="border-b border-gray-700"
          >
            <td className="py-1 min-w-0">
              <div className="flex items-center gap-2 truncate">
                {item.player?.ioc && <Flag ioc={item.player.ioc} className="w-4 h-3" />}
                <Link href={getPlayerHref((item.player as any).slug ?? String(item.player.id))} className="text-blue-400 hover:underline truncate">
                  {item.player.name}
                </Link>
              </div>
            </td>
            {/* ✅ usa minGamesLost per compatibilità con l'endpoint */}
            <td className="py-1 text-white text-right whitespace-nowrap">{item.minGamesLost}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">
              <Link href={`/tournaments/${item.tourney_id ?? linkId ?? id}/${item.year}`} className="text-blue-400 hover:underline">
                {item.year}
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const handleViewAll = async (round: string) => {
    try {
      // store a last-open fallback so outlets that mount after the click still open
      try { (window as any).__lastOpenModalPayload = { section: 'least', title: round }; } catch (e) { /* ignore */ }

      // open modal via shared outlet and push history state so direct links work
      try { window.history.pushState({ modal: true, background: `/tournaments/${id}/records`, section: 'least', title: round }, '', `/tournaments/${id}/records/least/rounds/${encodeURIComponent(String(round))}`); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent('open-modal', { detail: { section: 'least', title: round } })); } catch (e) { /* lastOpenModalPayload is already set */ }
    } finally {
      setModalLoadingRound(null);
    }
  };

  return (
    <div>
      <h3 className="font-medium mb-4 text-white">Min Cumulative Games Lost to reach a round</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleRoundItems.map((item) => (
          <div key={item.round} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ ...(cardStyle as any), ['--col-1' as any]: '60%', ['--col-2' as any]: '20%', ['--col-3' as any]: '20%' }}>
            <div className="p-3">
              <h4 className="font-medium mb-2 text-white">{item.round}</h4>

            {item.data.length > 0 ? (
              <>
                <PlayerTable data={item.data} />

                        <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={() => handleViewAll(item.round)}
                  className="px-4 py-2 bg-blue-500 text-white rounded"
                  disabled={modalLoadingRound === item.round}
                >
                  {modalLoadingRound === item.round ? 'Loading...' : 'View All'}
                </button>
              </div>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
            </div>
          </div>
        ))}

        {isMobile && visibleCount < sortedRoundItems.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>

           {/* --- nuovo modal esterno --- */}
      {modalData && (
        <ModalTournamentsSeasons
          title={`Details for ${modalData.round}`}
          onClose={() => setModalData(null)}
        >
          <div style={{ ['--col-1' as any]: '60%', ['--col-2' as any]: '20%', ['--col-3' as any]: '20%' }}>
            <PlayerTable data={modalData.data} />
          </div>
        </ModalTournamentsSeasons>
      )}
    </div>
  );
};