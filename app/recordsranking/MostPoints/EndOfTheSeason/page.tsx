import React from 'react';
import { prisma } from "@/lib/prisma";
import { getFlagFromIOC } from "@/lib/utils";

interface YearEndMaxPointsItem {
  name: string;
  country: string; // IOC code
  points: number;
  year: number | string;
}

export default async function No1YearEndMaxPointsRanking({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const includeAll = (searchParams?.includeAll as string) === '1';

  // Server-side replication of API logic
  const allDates = await prisma.rankingDate.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(allYears.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDateIds = validLast.map(d => d.id);

  const grouped = await prisma.ranking.groupBy({ by: ["playerId"], where: { rankingDateId: { in: lastDateIds } }, _max: { points: true }, orderBy: [{ _max: { points: 'desc' } }], take: 100 });

  const candidates = await prisma.ranking.findMany({ where: { OR: grouped.map(g => ({ playerId: g.playerId, points: g._max.points!, rankingDateId: { in: lastDateIds } })) }, select: { playerId: true, points: true, rankingDate: { select: { date: true } }, player: { select: { atpname: true, ioc: true } } } });

  const candidateMap = new Map<string, typeof candidates[number]>();
  for (const row of candidates) { if (!candidateMap.has(row.playerId)) candidateMap.set(row.playerId, row); }

  const result: YearEndMaxPointsItem[] = grouped.map(g => {
    const row = candidateMap.get(g.playerId);
    const year = row?.rankingDate?.date ? row.rankingDate.date.getUTCFullYear() : null;
    return { name: row?.player?.atpname ?? 'Unknown', country: row?.player?.ioc ?? 'UNK', points: Number(g._max.points ?? 0), year: year ?? 'N/A' };
  });

  const rows = includeAll ? result : result.slice(0, 20);

  const renderTable = (list: YearEndMaxPointsItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Points</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Year</th></tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (<tr key={`${r.name}-${r.year}-${idx}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.country && <span className="text-base">{getFlagFromIOC(r.country)}</span>}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.points.toLocaleString()}</td><td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.year}</td></tr>))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <h2 className="text-xl text-gray-100 font-semibold mb-3">Most ATP Points (Year-End)</h2>
      <div className="mb-4 flex justify-end"><a href={`?includeAll=1`} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500">View All</a></div>
      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}
