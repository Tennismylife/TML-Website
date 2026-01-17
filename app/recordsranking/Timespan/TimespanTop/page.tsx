import React from 'react';
import type { Metadata } from 'next';
import DropdownNavSelect from '@/components/DropdownNavSelect';

import Flag from '@/components/Flag';
import { prisma } from "@/lib/prisma";
import RecordsTopControls from '../../Top/RecordsTopControls';

export const metadata: Metadata = { title: 'Top-X Timespan | ATP Ranking Records' };

function diffYMD(a: Date, b: Date) {
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

export default async function TopXTimespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 5);
  const eoy = (sp.eoy as string) === '1';

  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
  const limit = 200;

  if (!Number.isInteger(top) || top < 1) {
    return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">Invalid 'top' param</div></section>);
  }

  const dateBounds: any = {};
  if (fromYear !== null) dateBounds.gte = new Date(Date.UTC(fromYear, 0, 1));
  if (toYear !== null)   dateBounds.lt  = new Date(Date.UTC(toYear + 1, 0, 1));

  let targetRankingDateIds: number[] | null = null;
  if (eoy) {
    const allDates = await prisma.rankingDate.findMany({ where: Object.keys(dateBounds).length ? { date: dateBounds } : undefined, select: { date: true }, orderBy: { date: 'asc' } });
    const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (years.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);
    const lastPerYear = await Promise.all(years.map(async (year) => {
      const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true } });
      return last?.id ?? null;
    }));
    targetRankingDateIds = lastPerYear.filter((x): x is number => x !== null);
    if (targetRankingDateIds.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);
  }

  const rows = await prisma.ranking.findMany({ where: { rank: { lte: top }, ...(targetRankingDateIds ? { rankingDateId: { in: targetRankingDateIds } } : (Object.keys(dateBounds).length ? { rankingDate: { date: dateBounds } } : {})) }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  if (rows.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const allPlayerIds = Array.from(new Set(rows.map(r => String(r.playerId))));
  const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } }, select: { id: true, atpname: true, ioc: true } });
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  type Agg = { name: string; ioc: string | null; min: Date; max: Date };
  const byPlayer = new Map<string, Agg>();

  for (const r of rows) {
    const id = String(r.playerId);
    const d = r.rankingDate.date;
    const name = r.player?.atpname ?? playerMap[id]?.atpname ?? null;
    if (!name) continue;
    const ioc = r.player?.ioc ?? playerMap[id]?.ioc ?? null;
    const prev = byPlayer.get(id);
    if (!prev) byPlayer.set(id, { name, ioc, min: d, max: d });
    else { if (d < prev.min) prev.min = d; if (d > prev.max) prev.max = d; }
  }

  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const data = Array.from(byPlayer.entries()).map(([id, v]) => {
    const timespanDays = Math.max(0, Math.floor((v.max.getTime() - v.min.getTime()) / MS_PER_DAY));
    const { y,m,d } = diffYMD(v.min, v.max);
    return { id, name: v.name, ioc: v.ioc, firstDate: v.min.toISOString().slice(0,10), lastDate: v.max.toISOString().slice(0,10), timespanDays, timespanLabel: `${y}y ${m}m ${d}d` };
  }).sort((a,b) => b.timespanDays - a.timespanDays || b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, limit);

  const rowsToShow = data.slice(0, 20);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = data.slice(start, start + perPage);

  const renderTable = (list: any[], startIndex = 0) => (
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
            <tr key={r.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
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

  const baseQuery = (q: URLSearchParams) => {
    if (eoy) q.set('eoy','1');
    if (fromYear !== null) q.set('fromYear',String(fromYear));
    if (toYear !== null) q.set('toYear',String(toYear));
    return q.toString() ? `?${q.toString()}` : '';
  }

  return (
    <section className="mb-8">
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <RecordsTopControls initialTop={top} />
      </React.Suspense>

      {pageRows.length > 0 ? renderTable(pageRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}



      {/* Simple pagination links */}
      {totalPages > 1 && (
        <div className="flex gap-2 mt-4">
          {Array.from({length: totalPages}).map((_,i)=>{
            const p = i+1;
            const q = new URLSearchParams(); q.set('top',String(top)); if (p>1) q.set('page',String(p)); if (eoy) q.set('eoy','1'); if (fromYear !== null) q.set('fromYear',String(fromYear)); if (toYear !== null) q.set('toYear',String(toYear));
            const href = `/recordsranking/Timespan/TimespanTop?${q.toString()}`;
            return <a key={p} href={href} className={`px-2 py-1 rounded ${p===page? 'bg-blue-700 text-white':'bg-gray-800 text-gray-200'}`}>{p}</a>
          })}
        </div>
      )}
    </section>
  );
}



