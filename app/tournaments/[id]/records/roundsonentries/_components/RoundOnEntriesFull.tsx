import React from 'react';
import Link from 'next/link';
import { getTournamentName } from '@/lib/recordMetadata';
import { getRoundFullName } from '@/lib/utils';
import HydrationDebugClient from '@/components/HydrationDebugClient';
import Flag from '@/components/Flag';

type Props = {
  params: { id: string, title?: string },
};

import { metadataBase } from '@/lib/site';
import { getPlayerHref } from '@/lib/utils';

async function fetchFull(id: string) {
  const url = new URL(`/api/tournaments/${id}/records/roundsonentries?full=true`, metadataBase).toString();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to load');
  return res.json();
}

export default async function RoundOnEntriesFull({ params }: Props) {
  const { id, title } = params;
  const data = await fetchFull(String(id));
  const rounds = data?.allRoundItems ?? [];

  // use getTournamentName to ensure humanized fallback for slug ids (e.g., 'australian-open')
  const tourneyName = await getTournamentName(id);

  if (title) {
    const found = rounds.find((r: any) => String(r.title) === String(title) || decodeURIComponent(String(r.title)) === String(title));
    const list = found?.fullFilteredList ?? found?.fullList ?? found?.list ?? [];
    const normalized = String(title || '').trim();
    const displayTitle = normalized.toLowerCase() === 'winner' ? 'Titles' : getRoundFullName(normalized);
    const tableId = `roundonentries-${encodeURIComponent(String(normalized))}`;
    return (
      <div className="max-w-4xl mx-auto text-white p-4">
        <h1 className="text-3xl font-extrabold mb-4 text-center mx-0">Most {displayTitle} on Entries at {tourneyName}</h1>
        {/* Keep an sr-only H2 for accessibility like CountFull */}
        <h2 className="sr-only">Most {displayTitle} on Entries at {tourneyName}</h2>
        <div className="rounded-2xl bg-gray-900/80 p-4 text-center">
          <div className="overflow-x-auto">
            <table id={tableId} className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
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
              <tbody data-ssr-rows={list.length}>
                {list.map((r: any, i: number) => (
                  <tr key={`${String(r.id)}-${i}`} className="border-b border-gray-700">
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Flag ioc={r.ioc} className="w-4 h-3" />
                        <Link href={getPlayerHref(r.slug ?? String(r.id))} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link>
                      </div>
                    </td>
                    <td className="py-2 text-center">{r.reaches}</td>
                    <td className="py-2 text-center">{r.totalEntries}</td>
                    <td className="py-2 text-center">{(r.percentage ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <HydrationDebugClient tableId={tableId} expected={list.length} />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Round on Entries at {tourneyName}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rounds.map((r: any) => (
          <div key={r.title} className="bg-white rounded shadow p-4">
            <h3 className="text-lg font-semibold">{r.title}</h3>
            <p className="text-sm text-gray-600">Top: {r.list?.slice(0,3).map((it:any)=>it.name).join(', ')}</p>
            <div className="mt-3"><Link href={`/tournaments/${id}/records/roundsonentries/rounds/${encodeURIComponent(String(r.title))}`} className="text-blue-600 hover:underline">View All</Link></div>
          </div>
        ))}
      </div>
    </div>
  );
}
