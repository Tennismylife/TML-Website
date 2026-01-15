"use client";

import React, { useEffect, useState } from 'react';
import RouteModal from './RouteModal';
import Link from 'next/link';

export default function RoundOnEntriesModalOutletRecords() {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState<string | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const openWithPayload = (detail: any) => {
      const titleParam = detail?.title as string | undefined ?? null;
      setTitle(titleParam);
      setShow(true);
      setLoading(true);
      setOpenError(null);

      // hide any server-injected modal
      try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}

      const url = titleParam ? `/api/records/roundsonentries?full=true&round=${encodeURIComponent(String(titleParam))}` : `/api/records/roundsonentries?full=true`;
      fetch(url)
        .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); })
        .then((data) => {
          let items: any[] = [];
          if (titleParam) {
            const all = data.allRoundItems ?? [];
            const found = all.find((it: any) => String(it.title) === String(titleParam) || decodeURIComponent(String(it.title)) === String(titleParam));
            items = (found?.fullFilteredList ?? found?.fullList ?? found?.list ?? []);
          } else {
            const all = data.allRoundItems ?? [];
            items = (all || []).flatMap((it: any) => it.list ?? []);
          }

          if (!mounted) return;
          setList(items);
        })
        .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => { if (!mounted) return; setLoading(false); });
    };

    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;

    // fallback consume last payload
    try {
      const last = (window as any).__lastOpenModalPayload;
      if (last && (last.section === 'roundsonentries' || last.section === 'rounds' || last.section === 'titles')) {
        openWithPayload(last);
        try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
      }
    } catch (e) {}

    if (isModal && (state?.section === 'roundsonentries' || state?.section === 'rounds' || state?.section === 'titles')) {
      openWithPayload(state);
    }

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      if (detail.section !== 'roundsonentries' && detail.section !== 'rounds' && detail.section !== 'titles') return;
      openWithPayload(detail);
    };

    window.addEventListener('open-modal', handleOpenModal as EventListener);

    const handlePop = () => {
      const st = (typeof window !== 'undefined' && window.history.state) || null;
      const isModalNow = st && st.modal && st.background;
      if (!isModalNow) {
        setShow(false); setTitle(null); setList(null); setOpenError(null);
        try { document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = ''; }); } catch (e) {}
      }
    };

    const handleCloseModal = () => {
      try { console.debug('[RoundOnEntriesModalOutletRecords] handleCloseModal'); } catch (e) {}
      setShow(false); setTitle(null); setList(null); setOpenError(null);
        try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
      try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    };

    window.addEventListener('popstate', handlePop as EventListener);
    window.addEventListener('close-modal', handleCloseModal as EventListener);

    return () => { mounted = false; window.removeEventListener('open-modal', handleOpenModal as EventListener); window.removeEventListener('popstate', handlePop as EventListener); window.removeEventListener('close-modal', handleCloseModal as EventListener); };
  }, []);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          {(() => {
            if (!title) return <h3 className="text-2xl font-semibold">Round on Entries</h3>;
            const normalized = String(title || '').trim();
            const displayTitle = normalized.toLowerCase() === 'winner' ? 'Titles' : `${normalized}s`;
            return <h3 className="text-2xl font-semibold">Most {displayTitle} on Entries</h3>;
          })()}
        </div>

        {loading ? (
          <p className="text-white text-center p-6">Loading...</p>
        ) : openError ? (
          <p className="text-red-400 text-center p-6">{openError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-center py-2 text-gray-300">Player</th>
                  <th className="text-center py-2 text-gray-300">Reaches</th>
                  <th className="text-center py-2 text-gray-300">Entries</th>
                  <th className="text-center py-2 text-gray-300">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((r: any, i: number) => (
                  <tr key={`${String(r.id)}-${i}`} className="border-b border-gray-700">
                    <td className="py-2 text-center"><div className="flex items-center justify-center gap-2"><span className="text-base">{r.ioc || ''}</span><Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link></div></td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.reaches}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.totalEntries}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{(r.percentage ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RouteModal>
  );
}
