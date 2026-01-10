import React from 'react';
import { prisma } from '@/lib/prisma';
import { getFlagFromIOC } from '@/lib/utils';
import EndSeasonCountControls from '../../EndOfTheSeason/Count/EndSeasonCountControls';

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

export default async function OldestEoyAtRank({ searchParams }: { searchParams?: Record<string,string | string[]> }) {
  const rank = Number((searchParams?.rank as string) ?? 1);
  const perPage = 20;
  const page = Number((searchParams?.page as string) ?? 1);
  const limit = 200;

  // validate
  if (!Number.isInteger(rank) || rank < 1) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid rank</div></section>);

  const fromYear = searchParams?.fromYear ? Number(searchParams.fromYear as string) : null;
  const toYear = searchParams?.toYear ? Number(searchParams.toYear as string) : null;

  const dateWhere: any = {};
  if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear,0,1));
  if (toYear !== null)   dateWhere.lt  = new Date(Date.UTC(toYear+1,0,1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year)=>{ const last = await prisma.rankingDate.findFirst({ where:{ date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } }); return last ? { year, id: last.id, date: last.date } : null; }));
  const last = (lastPerYear.filter(Boolean) as {year:number; id:number; date:Date}[]);
  if (last.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastIds = last.map(x=>x.id);
  const yearById = new Map<number, number>(last.map(x=>[x.id, x.year]));

  const rows = await prisma.ranking.findMany({ where: { rank, rankingDateId: { in: lastIds } }, select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true } }, rankingDateId: true, rankingDate: { select: { date: true } } } });

  type MaxRec = { name:string; ioc:string|null; year:number; date:Date; birth:Date; ageDays:number };
  const bestByPlayer = new Map<string, MaxRec>();

  for (const r of rows) {
    const id = String(r.playerId);
    const birth = r.player.birthdate;
    if (!birth) continue;
    const ref = r.rankingDate.date;
    if (ref < birth) continue;
    const ageDays = Math.floor((ref.getTime() - birth.getTime()) / (1000*60*60*24));
    const recYear = yearById.get(r.rankingDateId)!;
    const prev = bestByPlayer.get(id);
    if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && ref > prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, year: recYear, date: ref, birth, ageDays });
    }
  }

  const data = Array.from(bestByPlayer.entries()).map(([id, v]) => { const { y,m,d } = diffYMD(v.birth, v.date); return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, year: v.year }; }).sort((a,b)=> b.ageDays - a.ageDays || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, limit);

  const totalPages = Math.ceil(data.length / perPage);
  const start = (page-1)*perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: typeof pageRows, startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow"><table className="min-w-full border-collapse"><thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at EOY</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Year</th></tr></thead><tbody>{list.map((r,idx)=>(<tr key={`${r.id}-${r.year}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex+idx+1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.ioc && <span className="text-base">{getFlagFromIOC(r.ioc)}</span>}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td><td className="border border-white/10 px-4 py-2 text-gray-300">{r.year}</td></tr>))}</tbody></table></div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank (EOY):</label>
      </div>
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <EndSeasonCountControls initialRank={rank} hideLabel />
      </React.Suspense>

      <h2 className="text-xl font-semibold mb-4 text-gray-200 text-center">Oldest Players at Year-End No. {rank}</h2>

      {pageRows.length>0? renderTable(pageRows, start): (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const q = new URLSearchParams(); q.set('rank', String(rank)); if (fromYear !== null) q.set('fromYear', String(fromYear)); if (toYear !== null) q.set('toYear', String(toYear)); if (p > 1) q.set('page', String(p));
            const href = `/recordsranking/AgesEndOfTheSeason/OldestCount${q.toString() ? `?${q.toString()}` : ''}`;
            return <a key={p} href={href} className={`px-2 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'}`}>{p}</a>;
          })}
        </div>
      )} 
    </section>
  ); }
