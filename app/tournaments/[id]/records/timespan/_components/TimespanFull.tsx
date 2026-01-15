import React from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { metadataBase } from '@/lib/site';
import { getTournamentName } from '@/lib/recordMetadata';

type Props = { id: string; title?: string; section?: string };

async function fetchTimespanApi(id: string, full = true, round?: string) {
  const q = full ? '?full=true' : '';
  const url = new URL(`/api/tournaments/${id}/records/timespan${q}${round ? `&round=${encodeURIComponent(String(round))}` : ''}`, metadataBase).toString();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch timespan (${res.status})`);
  return res.json();
}

export default async function TimespanFull({ id, title, section = 'rounds' }: Props) {
  if (!id) return <div className="text-white">No tournament id provided.</div>;

  try {
    const data = await fetchTimespanApi(id, true, title);
    const items = data.allRoundItems ?? [];

    if (title) {
      const found = items.find((it: any) => String(it.title) === String(title) || String(it.title) === decodeURIComponent(String(title)));
      const rows = found ? (found.fullList ?? found.list ?? []) : [];
      // fetch tournament display name (humanized) if possible
      const tourneyName = await getTournamentName(id);

      return (
        <div className="text-white">
          <div className="mb-3 text-center"><h3 className="text-2xl font-semibold">{`Biggest timespan between 2 ${title}s at ${tourneyName}`}</h3></div>
          <div className="p-1 border border-gray-700 bg-gray-800 rounded"><div className="p-3 overflow-x-auto">
            <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
              <colgroup>
                <col style={{ width: '40%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
              </colgroup>
              <thead className="bg-gray-800">
                <tr>
                  <th className="text-center py-2 text-gray-300">Player</th>
                  <th className="text-center py-2 text-gray-300">First Date</th>
                  <th className="text-center py-2 text-gray-300">Last Date</th>
                  <th className="text-center py-2 text-gray-300">Timespan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={`${String(r.id)}-${i}`} className="border-b border-gray-700">
                    <td className="py-2 text-center"><div className="flex items-center justify-center gap-2"><span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span><Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link></div></td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.firstDate ? String(r.firstDate).slice(0,10) : ''}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{r.lastDate ? String(r.lastDate).slice(0,10) : ''}</td>
                    <td className="py-2 text-center text-lg md:text-xl text-white">{String(r.days)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div></div>
        </div>
      );
    }

    // default: render per-round cards with a View All link (use humanized tournament name)
    const tourneyName = await getTournamentName(id);
    return (
      <div className="text-white">
        <div className="mb-3 text-center"><h3 className="text-2xl font-semibold">Timespans per Round at {tourneyName}</h3></div>
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item: any) => (
            <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded"><div className="p-3">
              <h4 className="text-white font-medium mb-2">{item.title}</h4>
              <div className="overflow-x-auto">{/* small preview table */}
                <table className="w-full text-lg md:text-xl border-collapse table-fixed text-center">
                  <tbody>
                    {(item.list || []).slice(0,5).map((r: any, i: number) => (
                      <tr key={`${String(r.id)}-${i}`} className="border-b border-gray-700"><td className="py-2 text-center"><div className="flex items-center justify-center gap-2"><span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span><Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link></div></td><td className="py-2 text-center text-white">{r.days}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-2"><a href={`/tournaments/${id}/records/timespan/rounds/${encodeURIComponent(String(item.title))}`} className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded">View All</a></div>
            </div></div>
          ))}
        </div>
      </div>
    );
  } catch (err: any) {
    return <div className="text-white"><div className="mb-3 text-center"><h3 className="text-2xl font-semibold">Timespan</h3></div><div className="p-4 text-red-400">Error loading timespan data: {String(err?.message ?? err)}</div></div>;
  }
}
