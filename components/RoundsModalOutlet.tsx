"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteModal from './RouteModal';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

export default function RoundsModalOutlet({ id }: { id: string }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [round, setRound] = useState<string | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tourneyName, setTourneyName] = useState<string>(String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));

  useEffect(() => {
    let mounted = true;
    const p = fetchTournamentHeaderCached(id);
    (p && (p as any).then ? (p as any).then((t: any) => {
      if (!mounted || !t) return;
      const raw = (t && t.name) ? (Array.isArray(t.name) ? (t.name.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean).pop()) : t.name) : `Tournament ${t?.id}`;
      setTourneyName(String(raw).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    }) : (async () => { const t = await p; if (!mounted || !t) return; const raw = (t && t.name) ? (Array.isArray(t.name) ? (t.name.map((x: any) => (typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean).pop()) : t.name) : `Tournament ${t?.id}`; setTourneyName(String(raw).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())); })());
    return () => { mounted = false; };
  }, [id]);

  useEffect(() => {
    let mounted = true;

    const openWithPayload = (detail: any) => {
      try { console.debug('[RoundsModalOutlet] openWithPayload', detail); } catch (e) {}
      // Accept both older payloads ({ round, list }) and namespaced ({ section: 'rounds', title, list })
      const sec = detail?.section ? String(detail.section) : null;
      const titleParam = detail?.title ?? detail?.round ?? null;
      if (sec && sec !== 'rounds') return; // ignore unrelated sections

      if (!titleParam) return;
      setRound(String(titleParam));
      setShow(true);
      setLoading(true);
      setOpenError(null);

      // hide server-injected modal
      try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}

      if (detail?.list && Array.isArray(detail.list)) {
        setList(detail.list);
        setLoading(false);
        return;
      }

      fetch(`/api/tournaments/${id}/records/rounds?round=${encodeURIComponent(String(titleParam))}&full=true`)
        .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); })
        .then((data) => {
          if (!mounted) return;
          setList(data.roundItems?.[0]?.fullList ?? []);
        })
        .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => { if (!mounted) return; setLoading(false); });
    };

    // fallback: check last open-modal payload stored on window
    try {
      const last = (window as any).__lastOpenModalPayload;
      if (last && (last.round || last.title || (last.section && last.section === 'rounds'))) {
        try { console.debug('[RoundsModalOutlet] consuming __lastOpenModalPayload', last); } catch (e) {}
        openWithPayload(last);
        try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
      }
    } catch (e) {}

    // detect modal via history state + pathname as a fallback
    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : null);
    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      const maybeParent = recordsIndex >= 0 && parts.length > recordsIndex + 1 ? parts[recordsIndex + 1] : null;
      const maybeRound = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;

      if (isModal && maybeParent === 'rounds' && maybeRound) {
        openWithPayload({ section: 'rounds', title: maybeRound });
      } else {
        setShow(false); setRound(null); setList(null); setOpenError(null);
        try { document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = ''; }); } catch (e) {}
      }
    } else {
      setShow(false); setRound(null); setList(null); setOpenError(null);
    }

    const handleOpenModal = (e: any) => {
      let detail = e?.detail;
      if ((!detail || (!detail.title && !detail.round && !detail.section)) && (window as any).__lastOpenModalPayload) {
        detail = (window as any).__lastOpenModalPayload;
      }
      if (!detail) return;
      openWithPayload(detail);
    };

    const handleCloseModal = () => {
      try { console.debug('[RoundsModalOutlet] handleCloseModal'); } catch (e) {}
      setShow(false); setRound(null); setList(null); setOpenError(null);
        try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
      try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    };

    window.addEventListener('open-modal', handleOpenModal);
    window.addEventListener('close-modal', handleCloseModal);

    return () => { mounted = false; window.removeEventListener('open-modal', handleOpenModal); window.removeEventListener('close-modal', handleCloseModal); };
  }, [pathname, id]);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{round ? `Most ${round} Appearances at the ${tourneyName}` : `Most Reaches at the ${tourneyName}`}</h3>
        </div>

        {loading ? (
          <p className="text-white text-center p-6">Loading...</p>
        ) : openError ? (
          <p className="text-red-400 text-center p-6">{openError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
              <colgroup>
                <col style={{ width: '70%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-center py-2 text-gray-300">Player</th>
                  <th className="text-center py-2 text-gray-300">Reaches</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-base">{getFlagFromIOC(item.ioc) || ''}</span>
                        <Link href={`/players/${encodeURIComponent(String(item.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{item.name}</Link>
                      </div>
                    </td>
                    <td className="py-2 text-center text-lg md:text-xl">{item.count}</td>
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
