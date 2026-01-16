import React from 'react';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';

export default async function EoyTopXStreaks({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const page = Number((sp.page as string) ?? 1);
  const perPage = 20;

  if (!Number.isInteger(top) || top < 1 || top > 50) {
    return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid 'top' param</div></section>);
  }

  // Date bounds from optional params
  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
  const dateWhere: any = {};
  if (fromYear !== null || toYear !== null) {
    dateWhere.date = {};
    if (fromYear !== null) dateWhere.date.gte = new Date(Date.UTC(fromYear,0,1));
    if (toYear   !== null) dateWhere.date.lt  = new Date(Date.UTC(toYear+1,0,1));
  }

  // 1) ranking dates
  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? dateWhere : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(years.map(async (year)=>{
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year:number; id:number; date:Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);
  const lastDateIds = validLast.map(d=>d.id);

  // 2) get rankings
  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, rankingDateId: { in: lastDateIds } }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  // 3) aggregate per player
  const byPlayer = new Map<string, { name: string; ioc: string | null; years: number[] }>();
  for (const r of rows) {
    const id = String(r.playerId);
    const year = r.rankingDate.date.getUTCFullYear();
    let rec = byPlayer.get(id);
    if (!rec) { if (!r.player) continue; rec = { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null, years: [] }; byPlayer.set(id, rec); }
    rec.years.push(year);
  }

  function computeStreaks(sortedYears: number[]): number[][] {
    const streaks: number[][] = [];
    if (sortedYears.length === 0) return streaks;
    let curr: number[] = [sortedYears[0]];
    for (let i = 1; i < sortedYears.length; i++) {
      const y = sortedYears[i];
      if (y === curr[curr.length - 1] + 1) curr.push(y); else { streaks.push(curr); curr = [y]; }
    }
    streaks.push(curr);
    return streaks;
  }

  const data = Array.from(byPlayer.entries()).flatMap(([id, info]) => {
    const years = Array.from(new Set(info.years)).sort((a,b)=>a-b);
    const streaks = computeStreaks(years);
    return streaks.map(s=>({ id, name: info.name, ioc: info.ioc, longestTopStreak: s.length, seasons: s }));
  }).sort((a,b)=> b.longestTopStreak - a.longestTopStreak || (b.seasons[b.seasons.length-1] - a.seasons[a.seasons.length-1]) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: typeof pageRows, startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Streak Length</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Years</th></tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={`${p.id}-${p.seasons[0]}-${p.seasons[p.seasons.length-1]}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{p.ioc && <Flag ioc={p.ioc} />}<span>{p.name}</span></div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.longestTopStreak}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{p.seasons.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[1,2,3,4,5,6,7,8,9,10,20,30,50,100].map(n=>({ value: String(n), label: `Top ${n}`}))} />
      </div>
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">Consecutive Seasons at Year-End Top {top}</h2>

      {pageRows.length === 0 ? (<div className="text-gray-400 py-4 text-center">No data available.</div>) : renderTable(pageRows, start)}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const q = new URLSearchParams(); q.set('top', String(top)); if (fromYear !== null) q.set('fromYear', String(fromYear)); if (toYear !== null) q.set('toYear', String(toYear)); if (p > 1) q.set('page', String(p));
            const href = `/recordsranking/EndOfTheSeason/StreakTop${q.toString() ? `?${q.toString()}` : ''}`;
            return <a key={p} href={href} className={`px-2 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'}`}>{p}</a>;
          })}
        </div>
      )} 
    </section>
  );
}