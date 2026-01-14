"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteModal from './RouteModal';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';

export default function CountModalOutlet({ id }: { id: string }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tourneyName, setTourneyName] = useState<string>(String(id));
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
    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
    if (!currentPath) return;

    const parts = currentPath.split('/').filter(Boolean);
    const recordsIndex = parts.indexOf('records');
    const maybeSection = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;

    const openWithPayload = (detail: any) => {
      console.debug('[CountModalOutlet] openWithPayload', detail);
      const sec = detail?.section;
      if (!sec) return;
      setSection(sec);
      setShow(true);
      setLoading(true);
      setOpenError(null);
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = 'none'; } catch (e) {}

      if (detail?.list && Array.isArray(detail.list)) {
        setList(detail.list);
        setLoading(false);
        return;
      }

      const url = `/api/tournaments/${id}/records/count?section=${encodeURIComponent(sec)}&full=true`;
      console.debug('[CountModalOutlet] fetching', url);
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

    if (isModal && maybeSection) {
      console.debug('[CountModalOutlet] opening via history state', maybeSection);
      openWithPayload({ section: maybeSection, list: null });
    } else {
      setShow(false);
      setList(null);
      setSection(null);
      setOpenError(null);
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = ''; } catch (e) {}
    }

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      console.debug('[CountModalOutlet] handleOpenModal', detail);
      if (!detail || !detail.section) return;
      openWithPayload(detail);
    };

    window.addEventListener('open-modal', handleOpenModal as EventListener);
    return () => window.removeEventListener('open-modal', handleOpenModal as EventListener);
  }, [pathname, id]);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{section ? `All ${section.charAt(0).toUpperCase() + section.slice(1)} at ${tourneyName}` : `Counts at ${tourneyName}`}</h3>
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