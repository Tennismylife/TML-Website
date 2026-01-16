import React from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { getTournamentName, makeLeastLabel } from '@/lib/recordMetadata';

import { metadataBase } from '@/lib/site';

async function fetchData(id: string, title?: string) {
  const q = title ? `?full=true&round=${encodeURIComponent(String(title))}` : '?full=true';
  const url = new URL(`/api/tournaments/${id}/records/least${q}`, metadataBase).toString();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export default async function LeastFull({ id, title }: { id: string; title?: string }) {
  const data = await fetchData(id, title);
  const tourneyName = await getTournamentName(id);

  let items: any[] = [];
  if (title) {
    const all = data.roundItems ?? [];
    const found = all.find((it: any) => String(it.round) === String(title) || decodeURIComponent(String(it.round)) === String(title));
    items = (found?.fullFilteredList ?? found?.fullList ?? found?.data ?? found?.list ?? []);
  } else {
    items = (data.roundItems || []).flatMap((it: any) => it.data ?? it.list ?? []);
  }

  return (
    <div className="w-full mx-auto p-8 text-white">
      <h1 className="text-3xl font-bold mb-4">{title ? `${makeLeastLabel(title)} at ${tourneyName}` : `Least Records at ${tourneyName}`}</h1>

      {items.length === 0 ? (
        <p className="text-gray-400">No data available</p>
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
              {items.map((r: any, i: number) => (
                <tr key={`${String(r.id ?? r.player?.id ?? i)}-${i}`} className="border-b border-gray-700">
                  <td className="py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Flag ioc={r.player?.ioc || r.ioc} className="w-4 h-3" />
                      <Link href={`/players/${encodeURIComponent(String(r.player?.id ?? r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.player?.name ?? r.name}</Link>
                    </div>
                  </td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{r.minGamesLost ?? r.games ?? r.value}</td>
                  <td className="py-2 text-center text-lg md:text-xl text-white"><Link href={`/tournaments/${r.tourney_id ?? id}/${r.year}`} className="text-blue-400 hover:underline">{r.year}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}