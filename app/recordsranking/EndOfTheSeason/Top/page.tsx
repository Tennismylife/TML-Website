import React from 'react';
import { prisma } from '@/lib/prisma';
import { getFlagFromIOC } from '@/lib/utils';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';

type Props = { searchParams?: Promise<Record<string,string | string[]>> };

export default async function RecordsTopX(props: Props) {
  const sp = await Promise.resolve(props.searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);

  // port API logic server-side
  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
  const dateWhere: any = {};
  if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear,0,1));
  if (toYear !== null)   dateWhere.lt  = new Date(Date.UTC(toYear+1,0,1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(allYears.map(async (year)=>{
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year:number; id:number; date:Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDateIds = validLast.map(d=>d.id);

  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, rankingDateId: { in: lastDateIds } }, select: { playerId: true, rank: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  type Agg = { name: string; ioc: string | null; endYearTopCount: number; seasons: Set<number> };
  const agg = new Map<string, Agg>();
  for (const r of rows) {
    const id = String(r.playerId);
    const year = r.rankingDate.date.getUTCFullYear();
    let a = agg.get(id);
    if (!a) { if (!r.player) continue; a = { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null, endYearTopCount: 0, seasons: new Set() }; agg.set(id, a); }
    if (!a.seasons.has(year)) { a.seasons.add(year); a.endYearTopCount += 1; }
  }

  const data = Array.from(agg.entries()).map(([id,v]) => ({ id, name: v.name, ioc: v.ioc, endYearTopCount: v.endYearTopCount, seasons: Array.from(v.seasons).sort((a,b)=>a-b) })).sort((a,b)=> b.endYearTopCount - a.endYearTopCount || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page-1)*perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: typeof pageRows, startIndex=0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Seasons</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Years</th></tr></thead>
        <tbody>{list.map((p, idx)=>(<tr key={p.id} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex+idx+1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{p.ioc && <span className="text-base">{getFlagFromIOC(p.ioc)}</span>}<span>{p.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.endYearTopCount}</td><td className="border border-white/10 px-4 py-2 text-gray-300">{p.seasons.join(', ')}</td></tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top Range:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[1,2,3,4,5,6,7,8,9,10,20,30,50,100].map(n=>({ value: String(n), label: `Top ${n}`}))} />
      </div>
      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">Seasons at Year-End Top {top}</h2>
      {pageRows.length>0? renderTable(pageRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const q = new URLSearchParams(); q.set('top', String(top)); if (fromYear !== null) q.set('fromYear', String(fromYear)); if (toYear !== null) q.set('toYear', String(toYear)); if (p > 1) q.set('page', String(p));
            const href = `/recordsranking/EndOfTheSeason/Top${q.toString() ? `?${q.toString()}` : ''}`;
            return <a key={p} href={href} className={`px-2 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'}`}>{p}</a>;
          })}
        </div>
      )} 
    </section>
  );
}