import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import Flag from '@/components/Flag';
import DropdownNavSelect from '@/components/DropdownNavSelect';

export async function generateMetadata({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const sp = Object.assign({}, await Promise.resolve(searchParams ?? {})) as Record<string, string | string[]>;
  const top = Number((Array.isArray(sp.top) ? sp.top[0] : sp.top) ?? 2);
  return { title: `Consecutive Weeks at Top ${top} | ATP Ranking Records` };
} 

function formatDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function StreakTop({ searchParams }: { searchParams?: Promise<Record<string,string | string[]>> }) {
  const sp = await Promise.resolve(searchParams ?? {}) as Record<string, string | string[]>;
  const top = Number((sp.top as string) ?? 2);
  const perPage = 20;
  const page = Number((sp.page as string) ?? 1);

  // replicate API logic server-side
  const allRankings = await prisma.ranking.findMany({
    where: { rank: { lte: top } },
    orderBy: [{ playerId: 'asc' }, { rankingDateId: 'asc' }],
    select: { playerId: true, rankingDateId: true, rankingDate: { select: { date: true } }, player: { select: { id: true, atpname: true, ioc: true } } },
  });

  let currentPlayerId: string | null = null;
  let currentPlayerInfo: { id?: string; name: string; ioc?: string } | null = null;
  let streakStart: Date | null = null;
  let streakEnd: Date | null = null;
  let prevRankingDateId: number | null = null;
  let currentStreak = 0;
  const result: Array<{id?:string; name:string; ioc?:string; weeks:number; startDate?:string; endDate?:string}> = [];

  const commitStreak = () => {
    if (!currentPlayerId || !currentPlayerInfo || !streakStart || !streakEnd || currentStreak < 1) return;
    result.push({ id: currentPlayerInfo.id, name: currentPlayerInfo.name, ioc: currentPlayerInfo.ioc, weeks: currentStreak, startDate: formatDate(streakStart), endDate: formatDate(streakEnd) });
  };

  for (const r of allRankings) {
    const currentDate = new Date(r.rankingDate.date);
    if (r.playerId !== currentPlayerId) {
      commitStreak();
      currentPlayerId = r.playerId;
      currentPlayerInfo = { id: r.player?.id, name: r.player?.atpname ?? r.playerId, ioc: r.player?.ioc ?? undefined };
      streakStart = currentDate; streakEnd = currentDate; prevRankingDateId = r.rankingDateId; currentStreak = 1; continue;
    }
    if (r.rankingDateId === (prevRankingDateId ?? 0) + 1) { currentStreak += 1; streakEnd = currentDate; }
    else { commitStreak(); currentStreak = 1; streakStart = currentDate; streakEnd = currentDate; }
    prevRankingDateId = r.rankingDateId;
  }
  commitStreak();

  result.sort((a,b)=> b.weeks - a.weeks);

  const totalPages = Math.ceil(result.length / perPage);
  const start = (page - 1) * perPage;
  const pageRows = result.slice(start, start + perPage);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <label className="text-gray-200 font-medium">Top:</label>
        <DropdownNavSelect name="top" value={String(top)} options={[1,2,3,4,5,6,7,8,9,10,20,30,50,100].map(n => ({ value: String(n), label: `Top ${n}`}))} />
      </div>


      {pageRows.length === 0 ? (<div className="text-gray-400 py-4 text-center">No data available.</div>) : (
        <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="bg-black"><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Top</th><th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Weeks</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Start</th><th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">End</th></tr>
            </thead>
            <tbody>
              {pageRows.map((p, idx)=> (
                <tr key={`${p.id ?? p.name}-${start + idx}`} className="hover:bg-gray-800 border-b border-white/10"><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{start + idx + 1}</td><td className="border border-white/10 px-4 py-2 text-lg text-gray-200"><div className="flex items-center gap-2">{p.ioc && <Flag ioc={p.ioc} className="w-4 h-3" />}<span>{p.name}</span></div></td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.weeks}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.startDate}</td><td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{p.endDate}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex gap-2 mt-4 justify-center">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const q = new URLSearchParams(); q.set('top', String(top)); if (p > 1) q.set('page', String(p));
            const href = `/recordsranking/Streak/Top${q.toString() ? `?${q.toString()}` : ''}`;
            return (
              <a key={p} href={href} className={`px-2 py-1 rounded ${p === page ? 'bg-blue-700 text-white' : 'bg-gray-800 text-gray-200'}`}>
                {p}
              </a>
            );
          })}
        </div>
      )} 
    </section>
  );
} 