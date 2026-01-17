import React from 'react';
import { prisma } from "@/lib/prisma";
import Flag from '@/components/Flag';
import EndSeasonCountControls from "./EndSeasonCountControls";
import ServerPagination from '@/components/ServerPagination';
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  return { title: `Seasons at Year-End No. ${rank} | ATP Ranking Records` };
}

interface Player {
  id: string;
  name: string;
  ioc?: string | null;
  endYearCount: number;
  seasons: number[]; // elenco anni
}

export default async function RecordsCount({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  const page = Number((sp.page as string) ?? '1');
  const perPage = 20;

  // Server-side logic from API
  const allDates = await prisma.rankingDate.findMany({ select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(
    allYears.map(async (year) => {
      const last = await prisma.rankingDate.findFirst({
        where: {
          date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }
        },
        orderBy: { date: 'desc' },
        select: { id: true, date: true }
      });
      return last ? { year, id: last.id, date: last.date } : null;
    })
  );

  const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
  const lastDateIds = validLast.map(d => d.id);

  const rows = await prisma.ranking.findMany({
    where: { rank, rankingDateId: { in: lastDateIds } },
    select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } }
  });

  const agg = new Map<string, { name: string; ioc: string | null; endYearCount: number; seasons: Set<number> }>();
  for (const r of rows) {
    if (!r.player) continue;
    const id = String(r.playerId);
    const year = r.rankingDate.date.getUTCFullYear();
    let a = agg.get(id);
    if (!a) {
      a = { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null, endYearCount: 0, seasons: new Set<number>() };
      agg.set(id, a);
    }
    a.endYearCount += 1;
    a.seasons.add(year);
  }

  const data = Array.from(agg.entries()).map(([id, v]) => ({ id, name: v.name, ioc: v.ioc, endYearCount: v.endYearCount, seasons: Array.from(v.seasons).sort((a,b)=>a-b) }))
    .sort((a,b) => (b.endYearCount - a.endYearCount) || a.name.localeCompare(b.name));

  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = data.slice(start, start + perPage);

  const renderTable = (list: Player[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Seasons at No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Years</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={p.id} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                <div className="flex items-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div>
              </td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.endYearCount}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{p.seasons && p.seasons.length > 0 ? p.seasons.join(", ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <React.Suspense fallback={<div className="text-gray-400 py-2 text-center">Loading controls...</div>}>
        <EndSeasonCountControls initialRank={rank} />
      </React.Suspense>



      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (
        <div className="text-gray-400 py-4 text-center">No data available.</div>
      )}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}