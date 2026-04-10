"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteModal from './RouteModal';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import { getPlayerHref } from '@/lib/utils';

export default function CountModalOutlet({ id }: { id: string }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tourneyName, setTourneyName] = useState<string>(String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const [openError, setOpenError] = useState<string | null>(null);

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
    // proactively hide any server-injected modal on mount to avoid race conditions with open-modal events
    try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}
    try { document.querySelectorAll('.server-modal-content').forEach((el: any) => { (el as HTMLElement).style.display = 'none'; }); } catch (e) {}

    // capture events that may fire before the main handler is attached so we don't miss open-modal payloads
    const __earlyHandler = (e: any) => { try { (window as any).__lastOpenModalPayload = e?.detail; } catch (err) {} };
    window.addEventListener('open-modal', __earlyHandler);

    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
    if (!currentPath) return;

    const parts = currentPath.split('/').filter(Boolean);
    const recordsIndex = parts.indexOf('records');
    const maybeSection = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;
    const maybeParent = recordsIndex >= 0 && parts.length > recordsIndex + 1 ? parts[recordsIndex + 1] : null;

    const allowedSections = ['wins','played','entries','titles'];

    const openWithPayload = (detail: any) => {
      const sec = detail?.section;
      // only accept whitelisted count sections to avoid collisions with other outlets
      if (!sec || (typeof sec === 'string' && !allowedSections.includes(String(sec)))) return;
      setSection(sec);
      setShow(true);
      setLoading(true);
      setOpenError(null);
      try { const { hideServerModals } = require('./hideServerModals'); hideServerModals(); } catch (e) {}

      if (detail?.list && Array.isArray(detail.list)) {
        setList(detail.list);
        setLoading(false);
        return;
      }

      const url = `/api/tournaments/${id}/records/count?section=${encodeURIComponent(sec)}&full=true`; // fetching count list
      fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          setList(data.fullList ?? []);
        })
        .catch((e: any) => { setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => setLoading(false));
    };

    // auto-open from history state when the parent path is '/records/count'.
    // If an inner segment (e.g., 'wins') is present and allowed, use it; otherwise default to 'wins'.
    if (isModal && maybeParent === 'count') {
      const chosenSection = (maybeSection && allowedSections.includes(String(maybeSection))) ? String(maybeSection) : 'wins';
      openWithPayload({ section: chosenSection, list: null });
    } else {
      setShow(false);
      setList(null);
      setSection(null);
      setOpenError(null);
      try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
    }

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      if (!detail || !detail.section) return;
      openWithPayload(detail);
    };

    window.addEventListener('open-modal', handleOpenModal as EventListener);

    const handleCloseModal = () => {
      setShow(false); setList(null); setSection(null); setOpenError(null);
      try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
      try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
    };

    window.addEventListener('close-modal', handleCloseModal as EventListener);

    // If an early event was captured before main handler was attached, consume it now
    try {
      const last = (window as any).__lastOpenModalPayload;
      if (last && last.section && ['wins','played','entries','titles'].includes(String(last.section))) {
        openWithPayload(last);
        try { delete (window as any).__lastOpenModalPayload; } catch (e) {}
      }
    } catch (e) {}

    return () => { window.removeEventListener('open-modal', handleOpenModal as EventListener); window.removeEventListener('close-modal', handleCloseModal as EventListener); try { window.removeEventListener('open-modal', __earlyHandler); } catch (e) {} };
  }, [pathname, id]);

  if (!show) return null;

  const headingText = (() => {
    if (section === 'titles') return `Most Titles at ${tourneyName}`;
    if (section === 'wins') return `Most Wins At ${tourneyName}`;
    if (section === 'entries') return `Most Entries at ${tourneyName}`;
    if (section === 'played') return `Most matches played at ${tourneyName}`;
    if (section) return `All ${section.charAt(0).toUpperCase() + section.slice(1)} at ${tourneyName}`;
    return `Counts at ${tourneyName}`;
  })();

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{headingText}</h3>
        </div>

        {loading ? (
          <p className="text-white text-center p-6">Loading...</p>
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
                  <th className="text-center py-2 text-gray-300">Count</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((item: any) => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Flag ioc={item.ioc} className="w-4 h-3" />
                        <Link href={getPlayerHref(item.slug ?? String(item.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{item.name}</Link>
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
