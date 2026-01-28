"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import RouteModal from './RouteModal';
import { fetchTournamentHeaderCached } from '@/lib/tournamentHeaderCache';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getPlayerHref } from '@/lib/utils';

export default function AgesModalOutlet({ id }: { id: string }) {
  const [show, setShow] = useState(false);
  const [which, setWhich] = useState<'youngest' | 'oldest' | null>(null);
  const [list, setList] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);
  const [tourneyName, setTourneyName] = useState<string>(String(id).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  const pathname = usePathname();
  const [section, setSection] = useState<'main'|'titles'|'youngestrounds'|'oldestrounds'>('main');
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

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
      // accept both legacy sections (e.g., 'main') and namespaced 'ages-main'
      const rawSec = detail?.section as string | undefined;
      const sec = rawSec ? String(rawSec).replace(/^ages-/, '') : 'main';
      const titleParam = detail?.title as string | undefined;
      // For per-round sections, we only open a modal when a specific round title is provided.
      if ((sec === 'youngestrounds' || sec === 'oldestrounds') && (!titleParam || String(titleParam) === sec)) {
        return;
      }
      if (!w && !(sec === 'youngestrounds' || sec === 'oldestrounds')) return;
      setWhich(w ?? null);
      setSection(sec as any);
      setActiveTitle(titleParam ?? null);
      setShow(true);
      setLoading(true);
      setOpenError(null);

      // First fetch a short/top response so the modal can show quickly, then fetch the full response to replace it
      const shortUrl = `/api/tournaments/${id}/records/ages/${sec}`;
      const fullUrl = `${shortUrl}?full=true`;

      try { console.debug('[AgesModalOutlet] openWithPayload normalized (short fetch)', { rawSec, sec, shortUrl, fullUrl }); } catch (e) {}

      if (sec === 'titles') {
        // For titles, fetch the full data immediately (keeps existing behavior and tests expectations)
        try { console.debug('[AgesModalOutlet] fetching titles full list directly', fullUrl); } catch (e) {}
        fetch(fullUrl)
          .then((res) => { if (!res.ok) throw new Error(`${res.status} ${res.statusText}`); return res.json(); })
          .then((data) => {
            const items = w === 'youngest' ? (data.youngestWinners ?? data.topYoungestWinners ?? []) : (data.oldestWinners ?? data.topOldestWinners ?? []);
            if (!mounted) return; setList(items);
          })
          .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); })
          .finally(() => { if (!mounted) return; setLoading(false); });
      } else {
        // Short fetch (no full) -> show top lists immediately, then background full fetch
        fetch(shortUrl)
          .then((res) => {
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
            return res.json();
          })
          .then((data) => {
            let items: any[] = [];

            if (sec === 'youngestrounds' || sec === 'oldestrounds') {
              const listKey = sec === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
              const all = data[listKey] ?? [];
              if (titleParam) {
                const found = all.find((it: any) => String(it.title) === String(titleParam) || String(it.title) === decodeURIComponent(String(titleParam)));
                items = (found?.list ?? []) as any[]; // top list only
              } else {
                // flatten to a simple rows list if no specific title requested
                items = (all || []).flatMap((it: any) => it.list ?? []);
              }
            } else {
              items = w === 'youngest' ? (data.topYoungest ?? data.youngestPlayers ?? []) : (data.topOldest ?? data.oldestPlayers ?? []);
            }

            if (!mounted) return;
            setList(items);

            // now fetch the full data in background and replace when ready
            setLoading(true);
            fetch(fullUrl)
              .then((res2) => {
                if (!res2.ok) throw new Error(`${res2.status} ${res2.statusText}`);
                return res2.json();
              })
              .then((fullData) => {
                let fullItems: any[] = [];
                if (sec === 'youngestrounds' || sec === 'oldestrounds') {
                  const listKey = sec === 'youngestrounds' ? 'allYoungestItems' : 'allOldestItems';
                  const all = fullData[listKey] ?? [];
                  if (titleParam) {
                    const found = all.find((it: any) => String(it.title) === String(titleParam) || String(it.title) === decodeURIComponent(String(titleParam)));
                    fullItems = (found?.fullList ?? found?.list ?? []) as any[];
                  } else {
                    fullItems = (all || []).flatMap((it: any) => it.fullList ?? it.list ?? []);
                  }
                } else {
                  fullItems = w === 'youngest' ? (fullData.youngestPlayers ?? fullData.topYoungest ?? []) : (fullData.oldestPlayers ?? fullData.topOldest ?? []);
                }

                if (!mounted) return;
                setList(fullItems);
              })
              .catch((e: any) => { if (!mounted) return; /* keep short list and show error inline */ setOpenError(e?.message || 'Failed to load full list'); })
              .finally(() => { if (!mounted) return; setLoading(false); });
          })
          .catch((e: any) => { if (!mounted) return; setList([]); setOpenError(e?.message || 'Failed to load'); });
      }
    };

    // fallback: consume a global lastOpenModal payload if present (in case event fired before outlet mounted)
    let consumedEarlyPayload = false;
    try {
      const last = (window as any).__lastOpenModalPayload;
      if (last && last.section && String(last.section).startsWith('ages-')) {
        consumedEarlyPayload = true;
        const sec = String(last.section).replace(/^ages-/, '');
        const titleParam = last.title ?? null;
        const whichParam = last.which ?? null;
        try { console.debug('[AgesModalOutlet] consuming __lastOpenModalPayload', last); } catch(e) {}
        openWithPayload({ section: last.section, which: whichParam, title: titleParam });
        try { delete (window as any).__lastOpenModalPayload; } catch(e) {}
      }
    } catch (e) {}

    // open via history state when route has modal state
    const state = (typeof window !== 'undefined' && window.history.state) || null;
    const isModal = state && state.modal && state.background;
    const currentPath = pathname || (typeof window !== 'undefined' ? window.location.pathname : null);

    if (currentPath) {
      const parts = currentPath.split('/').filter(Boolean);
      const recordsIndex = parts.indexOf('records');
      const maybeParent = recordsIndex >= 0 && parts.length > recordsIndex + 1 ? parts[recordsIndex + 1] : null;
      const maybeSection = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;

      // prefer explicit history state if present (useful for tests/navigation)
      if (isModal && state && (state as any).section && String((state as any).section).startsWith('ages')) {
        // normalize legacy 'ages' history state when it stores title like 'youngest'/'oldest' to the Titles section
        if (String((state as any).section) === 'ages' && ((state as any).title === 'youngest' || (state as any).title === 'oldest')) {
          openWithPayload({ section: 'titles', which: (state as any).title, title: null });
        } else {
          openWithPayload({ section: (state as any).section, which: (state as any).which ?? null, title: (state as any).title ?? null });
        }
      } else if (isModal && maybeParent === 'ages' && maybeSection) {
        if (maybeSection === 'titles') {
          openWithPayload({ which: parts[parts.length - 1] === 'youngest' ? 'youngest' : 'oldest', section: 'titles' });
        } else if (maybeSection === 'youngestrounds' || maybeSection === 'oldestrounds') {
          // Only treat this as a modal route when a title segment exists after the section.
          const titleParam = parts.length > recordsIndex + 3 ? parts[recordsIndex + 3] : null;
          if (titleParam) openWithPayload({ section: maybeSection, title: titleParam });
        } else if (maybeSection === 'youngest' || maybeSection === 'oldest') {
          openWithPayload({ which: maybeSection as any, section: 'main' });
        } else if (!consumedEarlyPayload) {
          setShow(false); setWhich(null); setList(null); setOpenError(null); setActiveTitle(null);
        }
      } else if (!consumedEarlyPayload) {
        setShow(false); setWhich(null); setList(null); setOpenError(null); setActiveTitle(null);
      }
    } else if (!consumedEarlyPayload) {
      setShow(false); setWhich(null); setList(null); setOpenError(null); setActiveTitle(null);
    }

    const handleOpenModal = (e: any) => {
      const detail = e?.detail;
      if (!detail) return;
      openWithPayload(detail);
    };

    const handleCloseModal = () => {
      setShow(false);
      setWhich(null);
      setList(null);
      setOpenError(null);
      setActiveTitle(null);
      try { const { showServerModals } = require('./hideServerModals'); showServerModals(); } catch (e) {}
    };

    window.addEventListener('open-modal', handleOpenModal);
    window.addEventListener('close-modal', handleCloseModal);

    return () => {
      mounted = false;
      window.removeEventListener('open-modal', handleOpenModal);
      window.removeEventListener('close-modal', handleCloseModal);
    };
  }, [id, pathname]);

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
        {(() => {
          let headerText = '';
          if (section === 'titles') {
            // Titles: show "Title Winners" phrasing
            headerText = which === 'youngest' ? `Youngest Title Winners at ${tourneyName}` : `Oldest Title Winners at ${tourneyName}`;
          } else if (section === 'main') {
            headerText = which === 'youngest' ? `Youngest Players in Main Draw at ${tourneyName}` : `Oldest Players in Main Draw at ${tourneyName}`;
          } else if (section === 'youngestrounds' || section === 'oldestrounds') {
            const side = section === 'youngestrounds' ? 'Youngest' : 'Oldest';
            headerText = activeTitle ? `${side} Players in ${activeTitle} at ${tourneyName}` : `${side} Players at ${tourneyName}`;
          } else {
            headerText = which === 'youngest' ? `Youngest Players in Main Draw at ${tourneyName}` : `Oldest Players in Main Draw at ${tourneyName}`;
          }
          return (
            <div className="mb-3 text-center">
              <h3 className="text-2xl font-semibold">{headerText}</h3>
            </div>
          );
        })()}

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
                        <Flag ioc={r.ioc} className="w-4 h-3" />
                        <Link href={getPlayerHref(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
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
