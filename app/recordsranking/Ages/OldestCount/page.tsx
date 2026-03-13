import React from 'react';
import { prisma } from "@/lib/prisma";
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';
import Link from 'next/link';
import OldestCountControls from "./OldestCountControls";

interface OldestItem {
  id: string;
  name: string;
  ioc?: string | null;
  ageDays: number;
  ageLabel: string; // "37y 2m 14d"
  date: string;     // "YYYY-MM-DD"
  slug?: string | null;
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

import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  return { title: `Oldest Players to Reach No. ${rank} | ATP Ranking Records` };
}

export default async function OldestAtRank({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const limit = Math.min(500, Math.max(1, Number((sp.limit as string) ?? 200)));

  let rankings: Array<any> = [];
  try {
    rankings = await prisma.ranking.findMany({
      where: {
        rank,
        ...(sp.fromYear || sp.toYear
          ? { rankingDate: { date: {
              ...(sp.fromYear ? { gte: new Date(Date.UTC(Number(sp.fromYear as string), 0, 1)) } : {}),
              ...(sp.toYear ? { lt: new Date(Date.UTC(Number(sp.toYear as string) + 1, 0, 1)) } : {}),
            } } }
          : {}),
      },
      select: { playerId: true, player: { select: { atpname: true, ioc: true, birthdate: true, slug: true } }, rankingDate: { select: { date: true } } }
    });
  } catch (err) {
    console.error('OldestCount page: DB error fetching rankings', err);
    // fail safe: render empty dataset so build/export does not crash
    rankings = [];
  }

  const bestByPlayer = new Map<string, { name: string; ioc: string | null; date: Date; birth: Date; ageDays: number; slug: string | null }>();

  for (const r of rankings) {
    if (!r.player) continue;
    const id = String(r.playerId);
    const birth = r.player.birthdate;
    if (!birth) continue;
    const date = r.rankingDate.date;
    if (date < birth) continue;

    const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
    const prev = bestByPlayer.get(id);
    if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
      bestByPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, date, birth, ageDays, slug: r.player.slug ?? null });
    }
  }

  const data: OldestItem[] = Array.from(bestByPlayer.entries()).map(([id, v]) => {
    const { y, m, d } = diffYMD(v.birth, v.date);
    return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0, 10), slug: v.slug };
  }).sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })).slice(0, limit);

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalPages = Math.ceil(data.length / perPage);
  const start = (page - 1) * perPage;
  const paginatedRows = data.slice(start, start + perPage);

  const renderTable = (list: OldestItem[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Age at No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Date</th>
          </tr>
        </thead>
        <tbody>
          {list.map((r, idx) => (
            <tr key={`${r.id}-${r.date}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200"><div className="flex items-center justify-center gap-2">{r.ioc && <Flag ioc={r.ioc} className="w-4 h-3" /> }{r.slug ? <Link href={`/players/${r.slug}/ranking`} className="hover:underline">{r.name}</Link> : <span>{r.name}</span>}</div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{r.ageLabel}</td>
              <td className="border border-white/10 px-4 py-2 text-center text-gray-300">{r.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <OldestCountControls initialRank={rank} />
      </React.Suspense>



      {paginatedRows.length > 0 ? renderTable(paginatedRows, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}
