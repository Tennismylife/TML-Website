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
  const [tourneyName, setTourneyName] = useState<string>(String(id));

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
    const maybeRound = recordsIndex >= 0 && parts.length > recordsIndex + 2 ? parts[recordsIndex + 2] : null;

    if (isModal && maybeRound) {
      setRound(maybeRound);
      setShow(true);
      setLoading(true);

      // hide server modal
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = 'none'; } catch (e) {}

      fetch(`/api/tournaments/${id}/records/rounds?round=${encodeURIComponent(maybeRound)}&full=true`)
        .then(res => res.json())
        .then((data) => {
          setList(data.roundItems?.[0]?.fullList ?? []);
        })
        .catch(() => setList([]))
        .finally(() => setLoading(false));
    } else {
      setShow(false);
      setRound(null);
      setList(null);
      try { const sm = document.getElementById('server-modal'); if (sm) sm.style.display = ''; } catch (e) {}
    }
  }, [pathname, id]);

  if (!show) return null;

  return (
    <RouteModal>
      <div className="text-white">
        <div className="mb-3 text-center">
          <h3 className="text-2xl font-semibold">{round ? `All Reaches at ${tourneyName} — ${round}` : `All Reaches at ${tourneyName}`}</h3>
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
