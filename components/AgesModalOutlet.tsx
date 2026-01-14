"use client";

import React, { useEffect, useState } from 'react';
import RouteModal from './RouteModal';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';

export default function AgesModalOutlet({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const [which, setWhich] = useState<'youngest' | 'oldest' | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tourneyName, setTourneyName] = useState<string>(String(id));
  const [section, setSection] = useState<'main'|'titles'>('main');

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
      const w = detail?.which as 'youngest' | 'oldest' | undefined;
      const sec = detail?.section as 'main' | 'titles' | undefined ?? 'main';
      if (!w) return;
      setWhich(w);
      setSection(sec);
      setShow(true);
      setLoading(true);
      setOpenError(null);

      const url = `/api/tournaments/${id}/records/ages/${sec}?full=true`;
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
          return res.json();
        })
        .then((data) => {
          let items: any[] = [];
          if (sec === 'titles') {
            items = w === 'youngest' ? (data.youngestWinners ?? data.topYoungestWinners ?? []) : (data.oldestWinners ?? data.topOldestWinners ?? []);
          } else {
            items = w === 'youngest' ? (data.youngestPlayers ?? data.topYoungest ?? []) : (data.oldestPlayers ?? data.topOldest ?? []);
          }

          if (!mounted) return;
          setList(items);
        })
        .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
        .finally(() => { if (!mounted) return; setLoading(false); });
    };

    // open via history state when route has modal state
    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const pathname = typeof window !== 'undefined' ? window.location.pathname : null;
    const parts = pathname ? pathname.split('/').filter(Boolean) : [];
    const maybeWhich = parts.length > 0 && parts[parts.length - 1] === 'youngest' ? 'youngest' : (parts.length > 0 && parts[parts.length - 1] === 'oldest' ? 'oldest' : null);

    if (isModal && maybeWhich) {
      const maybeSection = parts.length > 1 ? parts[parts.length - 2] : 'main';
      const sec = maybeSection === 'titles' ? 'titles' : 'main';
      openWithPayload({ which: maybeWhich, section: sec });
    } else {
      setShow(false); setWhich(null); setList(null); setOpenError(null);
    }

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      if (!detail || !detail.which) return;
      openWithPayload(detail);
    };

    window.addEventListener('open-modal', handleOpenModal as EventListener);

    const handlePop = () => {
      const st = (typeof window !== 'undefined' && window.history.state) || null;
      const isModalNow = st && st.modal && st.background;
      const pathname = typeof window !== 'undefined' ? window.location.pathname : null;
      const parts = pathname ? pathname.split('/').filter(Boolean) : [];
      const maybeWhich = parts.length > 0 && parts[parts.length - 1] === 'youngest' ? 'youngest' : (parts.length > 0 && parts[parts.length - 1] === 'oldest' ? 'oldest' : null);

      if (!isModalNow || !maybeWhich) {
        setShow(false); setWhich(null); setList(null); setOpenError(null);
      }
    };

    window.addEventListener('popstate', handlePop as EventListener);

    return () => { mounted = false; window.removeEventListener('open-modal', handleOpenModal as EventListener); window.removeEventListener('popstate', handlePop as EventListener); };
  }, [id]);

  if (!show) return null;

  const formatAge = (age: number) => {
    const a = Number(age) || 0;
    const years = Math.floor(a);
    const days = Math.round((a - years) * 365.25);
    return `${years}y ${days}d`;
  };

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{which === 'youngest' ? (section === 'titles' ? `Youngest Winners in Main Draw at ${tourneyName}` : `Youngest Players in Main Draw at ${tourneyName}`) : (section === 'titles' ? `Oldest Winners in Main Draw at ${tourneyName}` : `Oldest Players in Main Draw at ${tourneyName}`)}</h3>
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
                  <th className="text-center py-2 text-gray-300">Age</th>
                  <th className="text-center py-2 text-gray-300">Year</th>
                </tr>
              </thead>
              <tbody>
                {(list || []).map((r: any) => (
                  <tr key={`${r.id}-${r.year}-${String(r.age || '')}`} className="border-b border-gray-700">
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span>
                        <Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                      </div>
                    </td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{formatAge(r.age)}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white"><Link href={`/tournaments/${r.tourney_id ?? id}/${r.year}`} className="text-blue-400 hover:underline">{r.year}</Link></td>
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
