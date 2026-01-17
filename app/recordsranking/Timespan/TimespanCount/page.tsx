import React from 'react';
import type { Metadata } from 'next';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  return { title: `Timespan at Rank ${rank} | ATP Ranking Records` };
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

export default async function RankTimespan({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const eoy = (sp.eoy as string) === '1';

  // replicate API logic server-side
  const dateBounds: any = {};
  const fromYear = sp.fromYear ? Number(sp.fromYear as string) : null;
  const toYear = sp.toYear ? Number(sp.toYear as string) : null;
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

  const rowsData = await prisma.ranking.findMany({ where: { rank, ...(targetRankingDateIds ? { rankingDateId: { in: targetRankingDateIds } } : (Object.keys(dateBounds).length ? { rankingDate: { date: dateBounds } } : {})) }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  if (rowsData.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const allPlayerIds = Array.from(new Set(rowsData.map(r => String(r.playerId))));
  const players = await prisma.player.findMany({ where: { id: { in: allPlayerIds } }, select: { id: true, atpname: true, ioc: true } });
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));

  const byPlayer = new Map<string, { name: string; ioc: string | null; min: Date; max: Date }>();
  for (const r of rowsData) {
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
  }).sort((a,b) => b.timespanDays - a.timespanDays || b.lastDate.localeCompare(a.lastDate) || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));

  const rows = data.slice(0, 20);

  const renderTable = (list: typeof rows, startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead><tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Timespan</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">First</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Last</th></tr></thead>
        <tbody>{list.map((r, idx) => (<tr key={`${r.id}-${r.firstDate}-${r.lastDate}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" />}<span>{r.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300" title={`${r.timespanDays} days`}>{r.timespanLabel}</td><td className="border border-white/10 px-4 py-2 text-gray-300">{r.firstDate}</td><td className="border border-white/10 px-4 py-2 text-gray-300">{r.lastDate}</td></tr>))}</tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Rank (exact):</label>
        <DropdownNavSelect name="rank" value={String(rank)} options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: `No. ${i + 1}` }))} />


      </div>

      {rows.length > 0 ? renderTable(rows, 0) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}
    </section>
  );
}
