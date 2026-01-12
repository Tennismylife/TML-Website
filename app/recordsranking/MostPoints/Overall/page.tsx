import React from 'react';
import { prisma } from "@/lib/prisma";
import { getFlagFromIOC } from "@/lib/utils";

interface No1MaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  date: string;
}

export default async function No1MaxPointsRanking({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const includeAll = (sp.includeAll as string) === '1';
  // replicate API logic server-side
  const grouped = await prisma.ranking.groupBy({ by: ["playerId"], _max: { points: true }, orderBy: [{ _max: { points: 'desc' } }], take: 100 });
  const playerIds = grouped.map(g => g.playerId);
  const playersRaw = await prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, atpname: true, ioc: true } });
  const playersMap = new Map(playersRaw.map(p => [p.id, p]));

  const candidates = await prisma.ranking.findMany({ where: { OR: grouped.map(g => ({ playerId: g.playerId, points: g._max.points! })) }, select: { playerId: true, points: true, rankingDate: { select: { date: true } }, player: { select: { atpname: true, ioc: true } } } });

  const candidateMap = new Map<string, typeof candidates[number]>();
  for (const row of candidates) {
    if (!candidateMap.has(row.playerId)) candidateMap.set(row.playerId, row);
  }

  const result: No1MaxPointsItem[] = grouped.map(g => {
    const row = candidateMap.get(g.playerId);
    return {
      name: row?.player?.atpname ?? playersMap.get(g.playerId)?.atpname ?? 'Unknown',
      country: row?.player?.ioc ?? playersMap.get(g.playerId)?.ioc ?? 'UNK',
      points: Number(g._max.points ?? 0),
      date: row?.rankingDate?.date ? row.rankingDate.date.toISOString().slice(0,10) : 'N/A',
    };
  });

  const rows = includeAll ? result : result.slice(0, 20);

  const renderTable = (list: No1MaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.name}-${r.date}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.country && <span className="text-base">{getFlagFromIOC(r.country)}</span>}<span>{r.name}</span></div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.points.toLocaleString()}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">Most ATP Points</h2>

      <div className="mb-4 flex justify-end">
        <a href={`?includeAll=1`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">View All</a>
      </div>

      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}