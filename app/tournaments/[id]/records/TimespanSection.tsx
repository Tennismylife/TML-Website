'use client'

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useIncrementalCards from '@/lib/hooks/useIncrementalCards';
import Link from 'next/link';
import Flag from '@/components/Flag';
import ModalTournamentsSeasons from '@/components/ModalTournamentsSeasons';
import { getPlayerHref } from '@/lib/utils';

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface PlayerTimespan {
  id: string | number;
  name: string;
  ioc: string;
  firstDate: string | Date;
  lastDate: string | Date;
  days: string;
}

interface RoundItem {
  title: string;
  list: PlayerTimespan[];
  fullList?: PlayerTimespan[];
}

interface TimespanData {
  allRoundItems: RoundItem[];
}

export default function TimespanSection({ id }: { id: string }) {
  const [timespanData, setTimespanData] = useState<TimespanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingViewAll, setLoadingViewAll] = useState<string | null>(null);
  const [modalData, setModalData] = useState<{ title: string; list: PlayerTimespan[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { isMobile, visibleCount, sentinelRef } = useIncrementalCards(timespanData?.allRoundItems?.length ?? 0, { initialVisible: 1, debounceMs: 1000 });

  // Primo caricamento: solo Top 10
  useEffect(() => {
    const fetchInitial = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/tournaments/${id}/records/timespan`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch timespan data');
        setTimespanData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    fetchInitial();
  }, [id]);

  const PlayerTable = ({ data }: { data: PlayerTimespan[] }) => (
    <table className="w-full text-sm border-collapse table-fixed">
      <colgroup>
        <col style={{ width: '240px' }} />
        <col style={{ width: '110px' }} />
        <col style={{ width: '110px' }} />
        <col style={{ width: '80px' }} />
      </colgroup>
      <thead className="bg-gray-900">
        <tr className="border-b border-gray-600">
          <th className="text-left py-1 text-white" style={{ paddingLeft: 0 }}>Player</th>
          <th className="text-right py-1 text-white whitespace-nowrap">First Date</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Last Date</th>
          <th className="text-right py-1 text-white whitespace-nowrap">Timespan</th>
        </tr>
      </thead>
      <tbody>
        {data.map((item, idx) => (
          <tr key={`${item.id}-${idx}`} className="border-b border-gray-700">
            <td className="py-1 min-w-0" style={{ maxWidth: '240px', paddingLeft: 0 }}>
              <div className="flex items-center gap-2 truncate min-w-0">
                <Flag ioc={item.ioc} className="w-4 h-3 shrink-0" />
                <Link href={getPlayerHref((item as any).slug ?? String(item.id))} className="text-blue-400 hover:underline truncate block min-w-0 overflow-hidden">
                  {item.name}
                </Link>
              </div>
            </td>
            <td className="py-1 text-white text-right whitespace-nowrap">{fmtDate(item.firstDate)}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{fmtDate(item.lastDate)}</td>
            <td className="py-1 text-white text-right whitespace-nowrap">{item.days}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const cardStyle = {
    backgroundColor: 'rgba(31,41,55,0.95)',
    backdropFilter: 'blur(4px)',
  };

  const router = useRouter();

  // Carica la fullList solo al click su "View All" using intercepted-route modal flow
  const handleViewAll = async (roundTitle: string) => {
    try {
      const section = 'timespan';
      const newPath = `/tournaments/${id}/records/timespan/rounds/${encodeURIComponent(String(roundTitle))}`;
      const state = { modal: true, background: window.location.pathname, section, title: roundTitle };

      try { console.debug('[TimespanSection] handleViewAll start', { newPath, state }); } catch (e) {}

      // write fallback payload
      try { (window as any).__lastOpenModalPayload = state; (window as any).__modalBackgroundPath = state.background; } catch (e) {}

      // navigate SPA to mount the layout
      try {
        const nav: any = router.push(newPath);
        try { console.debug('[TimespanSection] initiated router.push', newPath, 'nav:', nav); } catch (e) {}
        if (nav && typeof nav.then === 'function') {
          nav.then(() => {
            try { (window as any).__modalOpenedByPush = true; } catch (e) {}
            try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (e) {}
          }).catch(() => {
            setTimeout(() => { try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch(e) {} }, 300);
          });
        } else {
          // some routers don't return a promise; delay then dispatch
          setTimeout(() => { try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch(e) {} }, 350);
        }
      } catch (e) {
        // fallback: replace state and dispatch immediately
        try { window.history.replaceState(state, '', newPath); window.dispatchEvent(new CustomEvent('open-modal', { detail: state })); } catch (err) {}
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-white text-center py-10">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-10">Error: {error}</div>;
  if (!timespanData) return <div className="text-white text-center py-10">No data available</div>;

  return (
    <div>
      <h3 className="font-medium mb-4 text-white">Longest Timespan per Round</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timespanData.allRoundItems.slice(0, visibleCount).map((item) => (
          <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded" style={{ ...(cardStyle as any), ['--col-1' as any]: '240px', ['--col-2' as any]: '110px', ['--col-3' as any]: '110px', ['--col-4' as any]: '80px' }}>
            <div className="p-3">
              <h4 className="font-medium mb-2 text-white">{item.title}</h4>

            {item.list && item.list.length > 0 ? (
              <>
                <PlayerTable data={item.list} />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={(e) => { try { e.preventDefault(); e.stopPropagation(); console.debug('[TimespanSection] View All clicked', item.title); } catch(ex) {} ; handleViewAll(item.title); }}
                    className="px-4 py-2 bg-blue-500 text-white rounded"
                    disabled={loadingViewAll === item.title}
                  >
                    {loadingViewAll === item.title ? 'Loading...' : 'View All'}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-400">No data available.</p>
            )}
            </div>
          </div>
        ))}

        {isMobile && visibleCount < timespanData.allRoundItems.length && (
          <div ref={sentinelRef} className="cards-sentinel h-4" />
        )}
      </div>

      {modalData && (
        <ModalTournamentsSeasons
          title={`All Timespans for ${modalData.title}`}
          onClose={() => setModalData(null)}
        >
          <div style={{ ['--col-1' as any]: '240px', ['--col-2' as any]: '110px', ['--col-3' as any]: '110px', ['--col-4' as any]: '80px' }}>
            <PlayerTable data={modalData.list} />
          </div>
        </ModalTournamentsSeasons>
      )}
    </div>
  );
}
