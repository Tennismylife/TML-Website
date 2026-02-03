"use client";

import React, { useEffect, useState } from 'react';
import RouteModal from './RouteModal';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

import { makeLeastLabel } from '@/lib/recordMetadata';
import { playerMatchesUrl } from '../app/records/nav';

export default function LeastModalOutlet({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const [title, setTitle] = useState<string | null>(null);

  const makeLeastHeading = (t: string) => makeLeastLabel(t);  const [list, setList] = useState<any[] | null>(null);
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
      const titleParam = detail?.title as string | undefined ?? null;
      setTitle(titleParam);
      setShow(true);
      setLoading(true);
      setOpenError(null);

      try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}

      const url = `/api/tournaments/${id}/records/least?full=true${titleParam ? `&round=${encodeURIComponent(String(titleParam))}` : ''}`;
      fetch(url)
        .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); })
        .then((data) => {
          let items: any[] = [];
          if (titleParam) {
            const all = data.roundItems ?? [];
            const found = all.find((it: any) => String(it.round) === String(titleParam) || decodeURIComponent(String(it.round)) === String(titleParam));
            items = (found?.fullFilteredList ?? found?.fullList ?? found?.data ?? found?.list ?? []);
          } else {
            items = (data.roundItems || []).flatMap((it: any) => it.data ?? it.list ?? []);
          }

          if (!mounted) return;
          setList(items);
        })
        .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => { if (!mounted) return; setLoading(false); });
    };

    // consume last open payload fallback
    try {
      const last = (window as any).__lastOpenModalPayload;
      if (last && last.section === 'least') { openWithPayload(last); try { delete (window as any).__lastOpenModalPayload; } catch (e) {} }
    } catch (e) {}

    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;

    // open if history state indicates modal (pushState open)
    if (isModal && state?.section === 'least') {
      openWithPayload(state);
    }

    // NOTE: do not auto-open modal on direct pathname navigation since a server page exists for /records/least/rounds/{title}
    // direct server-side rendering will show the full table; the outlet should only open when history.state indicates a modal push
    // (handled above) or when an explicit 'open-modal' event fires.

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      const sec = String(detail.section || '');
      // Only accept explicit least namespace or exact 'least' section.
      if (sec !== 'least' && !sec.startsWith('least-')) return;
      openWithPayload(detail);
    };

    const handleCloseModal = () => {
      setShow(false); setList(null); setTitle(null); setOpenError(null);
      try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
      try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    };

    window.addEventListener('open-modal', handleOpenModal);
    window.addEventListener('close-modal', handleCloseModal);

    return () => { mounted = false; window.removeEventListener('open-modal', handleOpenModal); window.removeEventListener('close-modal', handleCloseModal); };
  }, [id]);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{title ? `${makeLeastLabel(title)} at ${tourneyName}` : `Least Records at ${tourneyName}`}</h3>
        </div>

        {loading ? (
          <p className="text-white text-center p-6">Loading...</p>
        ) : openError ? (
          <p className="text-red-400 text-center p-6">{openError}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
              <colgroup>
                <col style={{ width: '60%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-center py-2 text-gray-300">Player</th>
                  <th className="text-center py-2 text-gray-300">Games</th>
                  <th className="text-center py-2 text-gray-300">Year</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((r: any, i: number) => {
                  // Ensure unique and stable key even when r.id may repeat (same player multiple rows)
                  const rawId = r.id ?? r.player?.id ?? `row-${i}`;
                  const rowKey = `${String(rawId)}-${title ?? 'all'}-${i}-${String(r.year ?? '')}-${String(r.minGamesLost ?? r.games ?? r.value ?? '')}`;
                  return (
                    <tr key={rowKey} className="border-b border-gray-700">
                      <td className="py-2 text-center"><div className="flex items-center justify-center gap-2">{(r.player?.ioc || r.ioc) && <Flag ioc={r.player?.ioc || r.ioc} className="w-5 h-4" />}<Link href={playerMatchesUrl(r.player?.slug ?? (r.player?.id ?? r.id ?? rawId))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.player?.name ?? r.name}</Link></div></td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{r.minGamesLost ?? r.games ?? r.value}</td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{r.year}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </RouteModal>
  );
}
