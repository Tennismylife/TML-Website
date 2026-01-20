"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteModal from './RouteModal';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import { getPlayerHref, getRoundFullName } from '@/lib/utils';

export default function PercentageModalOutlet({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tourneyName, setTourneyName] = useState<string>(String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const pathname = usePathname();

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
      try { console.debug('[PercentageModalOutlet] openWithPayload detail:', detail); } catch (e) {}
      // normalize incoming section to namespaced form
      let secRaw = detail?.section as string | undefined ?? 'percentage-wins';
      let sec = String(secRaw);
      if (!sec.startsWith('percentage-')) sec = `percentage-${sec}`;
      const titleParam = detail?.title as string | undefined ?? null;
      setSection(sec as any);
      setTitle(titleParam);
      setShow(true);
      setLoading(true);
      setOpenError(null);

      // hide any server-injected modal (direct @modal) so client modal can overlay it cleanly
      try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}

      const url = sec === 'percentage-rounds'
        ? `/api/tournaments/${id}/records/percentage/rounds?full=true${titleParam ? `&round=${encodeURIComponent(String(titleParam))}` : ''}`
        : `/api/tournaments/${id}/records/percentage/wins?full=true`;
      fetch(url)
        .then(res => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); })
        .then((data) => {
          let items: any[] = [];
          if (sec === 'percentage-rounds') {
            const all = data.allRoundItems ?? [];
            if (titleParam) {
              const found = all.find((it: any) => String(it.title) === String(titleParam) || decodeURIComponent(String(it.title)) === String(titleParam) || String(it.title) === decodeURIComponent(String(titleParam)));
              items = (found?.fullFilteredList ?? found?.fullList ?? found?.list ?? []);
            } else {
              items = (all || []).flatMap((it: any) => it.list ?? []);
            }
          } else {
            // wins overall
            items = data.sortedOverall ?? data.topOverall ?? [];
          }

          if (!mounted) return;
          setList(items);
        })
        .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => { if (!mounted) return; setLoading(false); });
    };

    // fallback: check last open-modal payload stored on window (in case event fired before outlet mounted)
    let consumedEarlyPayload = false;
    try {
      const last = (window as any).__lastOpenModalPayload;
      const allowedSections = ['percentage-wins','percentage-rounds'];

      if (last && last.section && allowedSections.includes(String(last.section).startsWith('percentage-') ? String(last.section) : `percentage-${String(last.section)}`)) {
        consumedEarlyPayload = true;
        try { console.debug('[PercentageModalOutlet] consuming __lastOpenModalPayload', last); } catch (e) {}
        openWithPayload({ section: last.section, title: last.title });
        try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
      }
    } catch (e) {}

    // detect modal via history state + pathname, but only auto-open when parent is '/records/percentage' and inner segment is allowed
    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : null);
    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      const maybeParent = recordsIndex >= 0 && parts.length > recordsIndex + 1 ? parts[recordsIndex + 1] : null;
      const maybeSection = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;
      const allowedRaw = ['wins', 'rounds'];

      // Extra robustness: if history state already names the section (useful in tests and some navigation flows), prefer it
      if (isModal && state && (state as any).section && String((state as any).section).startsWith('percentage-')) {
        openWithPayload({ section: (state as any).section, title: (state as any).title });
      } else if (isModal && maybeParent === 'percentage' && maybeSection && allowedRaw.includes(String(maybeSection))) {
        const titleParam = maybeSection === 'rounds' ? (parts.length > recordsIndex + 3 ? parts[recordsIndex + 3] : null) : null;
        openWithPayload({ section: `percentage-${maybeSection}`, title: titleParam });
      } else if (!consumedEarlyPayload) {
        setShow(false); setSection(null); setList(null); setOpenError(null); setTitle(null);
        try { document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = ''; }); } catch (e) {}
      }
    } else if (!consumedEarlyPayload) {
      setShow(false); setSection(null); setList(null); setOpenError(null); setTitle(null);
    }

    const handleOpenModal = (e: any) => {
      try { console.debug('[PercentageModalOutlet] handleOpenModal event detail:', e?.detail); } catch (ex) {}
      let detail = e?.detail;
      // fallback to global payload in case the event had no detail or outlet mounted late
      if ((!detail || !detail.section) && (window as any).__lastOpenModalPayload) {
        try { console.debug('[PercentageModalOutlet] using __lastOpenModalPayload fallback', (window as any).__lastOpenModalPayload); } catch (e) {}
        detail = (window as any).__lastOpenModalPayload;
      }
      // only accept explicitly namespaced "percentage-" sections to avoid collisions
      if (!detail || !detail.section) return;
      const secRaw = String(detail.section);
      if (!secRaw.startsWith('percentage-')) return; // ignore generic sections like 'wins'
      const allowedSections = ['percentage-wins','percentage-rounds'];
      if (!allowedSections.includes(secRaw)) return;
      openWithPayload({ section: secRaw, title: detail.title ?? null });
    };

    const handleCloseModal = () => {
      try { console.debug('[PercentageModalOutlet] handleCloseModal'); } catch (e) {}
      setShow(false);
      setList(null);
      setSection(null);
      setOpenError(null);
      setTitle(null);
        try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
      try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    };

    window.addEventListener('open-modal', handleOpenModal);
    window.addEventListener('close-modal', handleCloseModal);

    return () => { mounted = false; window.removeEventListener('open-modal', handleOpenModal); window.removeEventListener('close-modal', handleCloseModal); };
  }, [id, pathname]);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{section && section.startsWith('percentage-rounds') ? (title ? `Best winning percentage in ${getRoundFullName(title)} at ${tourneyName}` : `Best winning percentage per Round at ${tourneyName}`) : `Overall Win Percentage at ${tourneyName}`}</h3>
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
                <col style={{ width: '13%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-center py-2 text-gray-300">Player</th>
                  <th className="text-center py-2 text-gray-300">Wins</th>
                  <th className="text-center py-2 text-gray-300">Losses</th>
                  <th className="text-center py-2 text-gray-300">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((r: any) => (
                  <tr key={String(r.id)} className="border-b border-gray-700">
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {r.ioc && <Flag ioc={r.ioc} className="w-5 h-4" />}
                        <Link href={getPlayerHref(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                      </div>
                    </td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.wins}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.losses}</td>
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
