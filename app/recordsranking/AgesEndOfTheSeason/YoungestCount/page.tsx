import { prisma } from "@/lib/prisma";
import { getFlagFromIOC } from "@/lib/utils";
import React from 'react';
import EndSeasonCountControls from '../../EndOfTheSeason/Count/EndSeasonCountControls';

interface YoungestEoyItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "19y 9m 2d"
  year: number;     // solo anno
}

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

export default async function YoungestEoyAtRank({ searchParams }: { searchParams?: Record<string, string | string[]> }) {
  const rank = Number((searchParams?.rank as string) ?? 1);
  const limit = Math.min(500, Math.max(1, Number((searchParams?.limit as string) ?? 200)));

  // years
  const dateWhere: any = {};
  if (searchParams?.fromYear) dateWhere.gte = new Date(Date.UTC(Number(searchParams.fromYear as string), 0, 1));
  if (searchParams?.toYear) dateWhere.lt = new Date(Date.UTC(Number(searchParams.toYear as string) + 1, 0, 1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' }});
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const last = (lastPerYear.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (last.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastIds = last.map(x => x.id);
  const yearById = new Map<number, number>(last.map(x => [x.id, x.year]));

  const rowsData = await prisma.ranking.findMany({ where: { rank, rankingDateId: { in: lastIds } }, select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true } }, rankingDateId: true, rankingDate: { select: { date: true } } } });

  const bestByPlayer = new Map<string, { name: string; ioc: string | null; year: number; date: Date; birth: Date; ageDays: number }>();
  for (const r of rowsData) {
    const id = String(r.playerId);
    const birth = r.player.birthdate;
    if (!birth) continue;
    const ref = r.rankingDate.date;
    if (ref < birth) continue;

    const ageDays = Math.floor((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const recYear = yearById.get(r.rankingDateId)!;

    const prev = bestByPlayer.get(id);
    if (!prev || ageDays < prev.ageDays || (ageDays === prev.ageDays && ref < prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, year: recYear, date: ref, birth, ageDays });
    }
  }

  const data: YoungestEoyItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => {
    const { y, m, d } = diffYMD(v.birth, v.date);
    return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, year: v.year };
  }).sort((a, b) => a.ageDays - b.ageDays).slice(0, limit);

  const perPage = 20;
  const page = Number((searchParams?.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: YoungestEoyItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at EOY No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Year</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.year}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.ioc && <span className="text-base">{getFlagFromIOC(r.ioc)}</span>}<span>{r.name}</span></div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.year}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank:</label>
      </div>
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <EndSeasonCountControls initialRank={rank} hideLabel />
      </React.Suspense>
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">Youngest Players at Year-End No. {rank}</h2>

      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <a key={i} href={`?rank=${rank}&page=${i + 1}`} className={`px-3 py-1 rounded ${i + 1 === page ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-200'}`}>{i + 1}</a>
          ))}
        </div>
      )}
    </section>
  );
}
