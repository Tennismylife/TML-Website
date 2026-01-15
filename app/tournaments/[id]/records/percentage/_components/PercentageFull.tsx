import React from 'react';
import Link from 'next/link';
import { getFlagFromIOC } from '@/lib/utils';
import { metadataBase } from '@/lib/site';
import { getTournamentName } from '@/lib/recordMetadata';

type Props = { id: string; section?: string; title?: string };

async function fetchPercApi(id: string, segment: string, full = true) {
  const q = full ? '?full=true' : '';
  const url = new URL(`/api/tournaments/${id}/records/percentage/${segment}${q}`, metadataBase).toString();
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to fetch ${segment} (${res.status})`);
  return res.json();
}

export default async function PercentageFull({ id, section = 'wins', title }: Props) {
  if (!id) return <div className="text-white">No tournament id provided.</div>;

  const seg = section ?? 'wins';

  try {
    if (seg === 'wins') {
      const data = await fetchPercApi(id, 'wins', true);
      const list = data.sortedOverall ?? data.topOverall ?? [];
      const tournamentName = await getTournamentName(id);

      return (
        <div className="text-white">
          <div className="mb-3 text-center">
            <h3 className="text-2xl font-semibold">Overall Win Percentage at {tournamentName}</h3>
          </div>
          <div className="p-1 border border-gray-700 bg-gray-800 rounded">
            <div className="p-3 overflow-x-auto">
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
                  {list.map((r: any) => (
                    <tr key={String(r.id)} className="border-b border-gray-700">
                      <td className="py-2 text-center"><div className="flex items-center justify-center gap-2"><span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span><Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link></div></td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{r.wins}</td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{r.losses}</td>
                      <td className="py-2 text-center text-lg md:text-xl text-white">{(r.percentage ?? 0).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (seg === 'rounds') {
      const data = await fetchPercApi(id, 'rounds', true);
      const items = data.allRoundItems ?? [];
      const tournamentName = await getTournamentName(id);

      const renderTable = (rows: any[]) => (
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
              {rows.map((r: any) => (
                <tr key={String(r.id)} className="border-b border-gray-700">
                  <td className="py-2 text-center"><div className="flex items-center justify-center gap-2"><span className="text-base">{getFlagFromIOC(r.ioc) || ''}</span><Link href={`/players/${encodeURIComponent(String(r.id))}`} className="text-blue-400 hover:underline text-lg md:text-xl">{r.name}</Link></div></td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{r.wins}</td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{r.losses}</td>
                  <td className="py-2 text-center text-lg md:text-xl text-white">{(r.percentage ?? 0).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

      if (title) {
        const found = items.find((it: any) => String(it.title) === String(title) || String(it.title) === decodeURIComponent(String(title)));
        const rows = found ? (found.fullFilteredList ?? found.fullList ?? found.list ?? []) : [];
        return (
          <div className="text-white">
            <div className="mb-3 text-center"><h3 className="text-2xl font-semibold">Best winning percentage in {title} at {tournamentName}</h3></div>
            <div className="p-1 border border-gray-700 bg-gray-800 rounded"><div className="p-3">{renderTable(rows)}</div></div>
          </div>
        );
      }

      return (
        <div className="text-white">
          <div className="mb-3 text-center"><h3 className="text-2xl font-semibold">Best winning percentage per Round at {tournamentName}</h3></div>
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((item: any) => (
              <div key={item.title} className="p-1 border border-gray-700 bg-gray-800 rounded"><div className="p-3"><h4 className="text-white font-medium mb-2">{item.title}</h4>{renderTable(item.list ?? [])}<div className="mt-2"><a href={`/tournaments/${id}/records/percentage/rounds/${encodeURIComponent(String(item.title))}`} className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded">View All</a></div></div></div>
            ))}
          </div>
        </div>
      );
    }

    return <div className="text-white"><p>Unknown section</p></div>;
  } catch (err: any) {
    return <div className="text-white"><div className="mb-3 text-center"><h3 className="text-2xl font-semibold">Percentage</h3></div><div className="p-4 text-red-400">Error loading percentage data: {String(err?.message ?? err)}</div></div>;
  }
}