import React from 'react';
import Link from 'next/link';
import Flag from '@/components/Flag';
import { playerMatchesUrl } from '../../../records/nav';
import { getRoundIndex } from '@/lib/utils';
import { prisma } from '@/lib/prisma';

async function resolveStreaks(id: string) {
  const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
  if (!tourneyIds) return [];
  const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

  const matches = await prisma.match.findMany({
    where: { AND: [{ OR: tourneyIdFilters }, { status: true }] },
    select: {
      id: true,
      tourney_date: true,
      round: true,
      winner_id: true,
      winner_name: true,
      loser_id: true,
      loser_name: true,
    },
    orderBy: { tourney_date: 'asc' },
  });

  if (!matches?.length) return [];

  const playerMatches = new Map<string, Array<{ date: string | null; isWin: boolean; name?: string; matchId?: number; round?: string | null }>>();
  for (const m of matches) {
    const isoDate = m.tourney_date instanceof Date ? m.tourney_date.toISOString() : (m.tourney_date ? String(m.tourney_date) : null);
    const roundValue = m.round ?? null;
    if (m.winner_id) {
      const key = String(m.winner_id);
      if (!playerMatches.has(key)) playerMatches.set(key, []);
      playerMatches.get(key)!.push({ date: isoDate, isWin: true, name: m.winner_name ?? undefined, matchId: m.id, round: roundValue });
    }
    if (m.loser_id) {
      const key = String(m.loser_id);
      if (!playerMatches.has(key)) playerMatches.set(key, []);
      playerMatches.get(key)!.push({ date: isoDate, isWin: false, name: m.loser_name ?? undefined, matchId: m.id, round: roundValue });
    }
  }

  const roundOrder: Record<string, number> = {
    R128: 0,
    R64: 1,
    R32: 2,
    R16: 3,
    QF: 4,
    SF: 5,
    F: 6,
    '1R': 0,
    '2R': 1,
    '3R': 2,
    '4R': 3,
    Q: 4,
    S: 5,
  };

  type StreakInfo = { length: number; match_ids: number[]; startDate?: string | null; endDate?: string | null };

  const results: Array<{ id: string; name: string; slug?: string | null; ioc?: string | null; streak: number; match_ids: number[]; streaks: StreakInfo[] }> = [];

  for (const [playerId, pmatches] of playerMatches.entries()) {
    pmatches.sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      if (da !== db) return String(da).localeCompare(String(db));
      const ra = a.round ? (roundOrder[a.round] ?? 0) : 0;
      const rb = b.round ? (roundOrder[b.round] ?? 0) : 0;
      return ra - rb;
    });

    let maxStreak = 0;
    let cur = 0;
    let displayName = '';
    let bestMatchIds: number[] = [];
    let currentMatchIds: number[] = [];
    let currentStart: string | null = null;
    let currentEnd: string | null = null;
    const allStreaks: StreakInfo[] = [];

    for (const match of pmatches) {
      if (!displayName && match.name) displayName = match.name;
      if (match.isWin) {
        if (cur === 0) currentStart = match.date;
        cur += 1;
        currentMatchIds.push(match.matchId as number);
        currentEnd = match.date;
        if (cur > maxStreak) {
          maxStreak = cur;
          bestMatchIds = currentMatchIds.slice();
        }
      } else {
        if (cur > 0) {
          allStreaks.push({ length: cur, match_ids: currentMatchIds.slice(), startDate: currentStart, endDate: currentEnd });
        }
        cur = 0;
        currentMatchIds = [];
        currentStart = null;
        currentEnd = null;
      }
    }

    if (cur > 0) {
      allStreaks.push({ length: cur, match_ids: currentMatchIds.slice(), startDate: currentStart, endDate: currentEnd });
    }

    allStreaks.sort((x, y) => y.length - x.length || String(x.startDate ?? '').localeCompare(String(y.startDate ?? '')));
    results.push({ id: playerId, name: displayName || '', streak: maxStreak, match_ids: bestMatchIds, streaks: allStreaks });
  }

  results.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));

  try {
    const ids = Array.from(new Set(results.map(r => String(r.id))));
    const { mapIdsToSlugs } = await import('@/lib/player-slugs');
    const slugMap = await mapIdsToSlugs(ids);
    const players = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, ioc: true } });
    const iocMap = Object.fromEntries(players.map(p => [String(p.id), p.ioc || null]));
    return results.map(r => ({ ...r, slug: slugMap[String(r.id)] ?? null, ioc: iocMap[String(r.id)] ?? null }));
  } catch {
    return results;
  }
}

export default async function StreakFull({ id }: { id: string }) {
  const streaks = await resolveStreaks(id);
  if (!streaks.length) {
    return <div className="text-gray-300 p-6 text-center">No streaks found.</div>;
  }

  return (
    <div className="p-4">
      <div className="overflow-x-auto rounded border border-white/30 bg-gray-900 shadow">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-black">
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Rank</th>
              <th className="border border-white/30 px-4 py-2 text-left text-lg text-gray-200">Player</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Longest Streak</th>
              <th className="border border-white/30 px-4 py-2 text-center text-lg text-gray-200">Matches</th>
            </tr>
          </thead>
          <tbody>
            {streaks.map((item, index) => (
              <tr key={item.id} className="hover:bg-gray-800 border-b border-white/10">
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{index + 1}</td>
                <td className="border border-white/10 px-4 py-2 text-lg text-gray-200">
                  <div className="flex items-center gap-2">
                    <Flag ioc={item.ioc ?? undefined} className="w-4 h-3 inline-block" />
                    <Link href={playerMatchesUrl(item.slug ?? String(item.id))} className="text-indigo-300 hover:underline">
                      {item.name || `Player ${item.id}`}
                    </Link>
                  </div>
                </td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{item.streak}</td>
                <td className="border border-white/10 px-4 py-2 text-center text-lg text-gray-200">{item.match_ids.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
