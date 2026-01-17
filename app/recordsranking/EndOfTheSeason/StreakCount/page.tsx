import { prisma } from "@/lib/prisma";
import ServerPagination from '@/components/ServerPagination';
import Flag from '@/components/Flag';

interface PlayerStreak {
  id: string;
  name: string;
  ioc?: string | null;
  longestStreak: number;
  seasons: number[];
}

function computeStreaks(sortedYears: number[]): number[][] {
  const streaks: number[][] = [];
  if (sortedYears.length === 0) return streaks;
  let curr: number[] = [sortedYears[0]];
  for (let i = 1; i < sortedYears.length; i++) {
    const y = sortedYears[i];
    if (y === curr[curr.length - 1] + 1) curr.push(y);
    else { streaks.push(curr); curr = [y]; }
  }
  streaks.push(curr);
  return streaks;
}

import StreakCountControls from "./StreakCountControls";
import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);
  return { title: `Consecutive Seasons at Year-End No. ${rank} | ATP Ranking Records` };
}

export default async function EoyRankStreaks({ searchParams }: { searchParams?: Promise<Record<string, string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const rank = Number((sp.rank as string) ?? 1);

  // get last per year
  const dateWhere: any = {};
  if (sp.fromYear) dateWhere.gte = new Date(Date.UTC(Number(sp.fromYear as string), 0, 1));
  if (sp.toYear) dateWhere.lt = new Date(Date.UTC(Number(sp.toYear as string) + 1, 0, 1));

  const allDates = await prisma.rankingDate.findMany({ where: dateWhere, select: { date: true }, orderBy: { date: 'asc' } });
  const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
  if (allYears.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDates = await Promise.all(allYears.map(async (year) => {
    const last = await prisma.rankingDate.findFirst({ where: { date: { gte: new Date(Date.UTC(year,0,1)), lt: new Date(Date.UTC(year+1,0,1)) } }, orderBy: { date: 'desc' }, select: { id: true, date: true } });
    return last ? { year, id: last.id, date: last.date } : null;
  }));
  const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
  if (validLast.length === 0) return (<section className="mb-8"><div className="text-gray-400 py-4 text-center">No data available.</div></section>);

  const lastDateIds = validLast.map(d => d.id);

  const rows = await prisma.ranking.findMany({ where: { rank, rankingDateId: { in: lastDateIds } }, select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } } });

  const playersMap = new Map<string, { name: string; ioc: string | null }>();
  rows.forEach(r => { if (!r.player) return; playersMap.set(String(r.playerId), { name: r.player.atpname ?? '', ioc: r.player.ioc ?? null }); });

  const grouped = new Map<string, number[]>();
  rows.forEach(r => {
    const id = String(r.playerId);
    const years = grouped.get(id) ?? [];
    years.push(r.rankingDate.date.getUTCFullYear());
    grouped.set(id, years);
  });

  const data: any[] = [];
  for (const [playerId, yearsList] of grouped.entries()) {
    const years = Array.from(new Set(yearsList)).sort((a,b)=>a-b);
    let streaks = computeStreaks(years);
    streaks = streaks.filter(s => s.length > 1);
    if (streaks.length === 0) continue;

    for (const s of streaks) {
      const info = playersMap.get(playerId)!;
      data.push({ id: playerId, name: info.name, ioc: info.ioc, longestStreak: s.length, seasons: s });
    }
  }

  data.sort((a,b) => b.longestStreak - a.longestStreak || a.name.localeCompare(b.name, 'en',{ sensitivity: 'base' }));

  const perPage = 20;
  const page = Number((sp.page as string) ?? '1');
  const totalCount = data.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const start = (page - 1) * perPage;
  const paginatedPlayers = data.slice(start, start + perPage);

  const renderTable = (list: PlayerStreak[], startIndex = 0) => (
    <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
      <table className="min-w-full border-collapse">
        <thead>
          <tr className="bg-black">
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
            <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Longest Streak at No. {rank}</th>
            <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Years</th>
          </tr>
        </thead>
        <tbody>
          {list.map((p, idx) => (
            <tr key={`${p.id}-${idx}`} className="hover:bg-gray-800 border-b border-white/10">
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{startIndex + idx + 1}</td>
              <td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div></td>
              <td className="border border-white/10 px-4 py-2 text-center text-lg text-indigo-300">{p.longestStreak}</td>
              <td className="border border-white/10 px-4 py-2 text-gray-300">{p.seasons?.length ? p.seasons.join(", ") : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="mb-8">
      <StreakCountControls initialRank={rank} />


      {paginatedPlayers.length > 0 ? renderTable(paginatedPlayers, start) : (<div className="text-gray-400 py-4 text-center">No data available.</div>)}

      {totalPages > 1 && (
        <ServerPagination page={page} totalPages={totalPages} getHref={(p) => `?rank=${rank}&page=${p}`} />
      )}
    </section>
  );
}