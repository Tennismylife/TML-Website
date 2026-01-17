import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import DropdownNavSelect from '../../../../components/DropdownNavSelect';
import RecordsTopControls from '../../Top/RecordsTopControls';

export const metadata: Metadata = { title: 'Top-X Timespan (EOY) | ATP Ranking Records' };

function diffYMD(a: Date, b: Date) { let y=b.getUTCFullYear()-a.getUTCFullYear(); let m=b.getUTCMonth()-a.getUTCMonth(); let d=b.getUTCDate()-a.getUTCDate(); if (d<0){const prev=new Date(Date.UTC(b.getUTCFullYear(),b.getUTCMonth(),0)); d+=prev.getUTCDate(); m-=1;} if(m<0){m+=12;y-=1;} return {y,m,d}; }

type Props = { searchParams?: Promise<Record<string,string | string[]>> };

export default async function EoyTopTimespan(props: Props) {
  const sp = await Promise.resolve(props.searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 5);
  if (!Number.isInteger(top) || top < 1) {
    return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid 'top' param</div></section>);
  }

  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;

  const dateWhere: any = {};
  if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear,0,1));
  if (toYear !== null)   dateWhere.lt  = new Date(Date.UTC(toYear+1,0,1));

  const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
  const years = Array.from(new Set(allDates.map(d=>d.date.getUTCFullYear())));
  if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastPerYear = await Promise.all(years.map(async (year)=>{ const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } }); return last ? { year, id: last.id, date: last.date } : null; }));
  const valid = (lastPerYear.filter(Boolean) as {year:number; id:number; date:Date}[]);
  if (valid.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const yearById = new Map<number, number>(valid.map(v=>[v.id, v.year]));
  const ids = valid.map(v=>v.id);

  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, rankingDateId: { in: ids } }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });
  if (rows.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const byPlayer = new Map<string, { name:string; ioc:string|null; min:Date; max:Date }>();
  for (const r of rows) {
    const id = String(r.playerId); const d = r.rankingDate.date; const name = r.player?.atpname ?? null; if (!name) continue; const ioc = r.player?.ioc ?? null; const prev = byPlayer.get(id); if (!prev) byPlayer.set(id, { name, ioc, min: d, max: d }); else { if (d < prev.min) prev.min = d; if (d > prev.max) prev.max = d; }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const data = Array.from(byPlayer.entries()).map(([id, v]) => { const timespanDays = Math.max(0, Math.floor((v.max.getTime() - v.min.getTime()) / MS_PER_DAY)); const {y,m,d} = diffYMD(v.min, v.max); return { id, name: v.name, ioc: v.ioc, firstDate: v.min.toISOString().slice(0,10), lastDate: v.max.toISOString().slice(0,10), timespanDays, timespanLabel: `${y}y ${m}m ${d}d` } }).sort((a,b)=> b.timespanDays - a.timespanDays || b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const rowsToShow = data.slice(0,20);

  const renderTable = (list: any[]) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">#</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-right text-lg text-gray-200">Span</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.firstDate}-${r.lastDate}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{idx+1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}<span>{r.name}</span></div></td>
              <td className="border border-white/10 px-4 py-2 text-right text-lg text-indigo-300">{r.timespanLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.firstDate}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{r.lastDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={top} />
      </React.Suspense>

      {rowsToShow.length > 0 ? renderTable(rowsToShow) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}