import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    if (!tourneyIds) return NextResponse.json({ streaks: [] });

    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    // Fetch all completed matches for this tournament ordered chronologically
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
      orderBy: { tourney_date: 'asc' as const },
    });

    if (!matches || matches.length === 0) return NextResponse.json({ streaks: [] });

    // Build per-player chronological match lists
    const playerMatches = new Map<string, Array<{ date: string | number | null; isWin: boolean; name?: string; matchId?: number; round?: string | null }>>();

    for (const m of matches) {
      const isoDate = m.tourney_date instanceof Date ? m.tourney_date.toISOString() : (m.tourney_date ? String(m.tourney_date) : null);
      const roundValue = (m as any).round ?? null;
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

    // Compute all streaks per player (not just the longest). We sort matches by date then by round
    // so that matches on the same date are ordered by round progression (early -> late).
    const roundOrder: Record<string, number> = {
      // Defined tournament progression: early -> final
      R128: 0, R64: 1, R32: 2, R16: 3, QF: 4, SF: 5, F: 6,
      // Common alternative labels mapping to the above progression
      "1R": 0, "2R": 1, "3R": 2, "4R": 3, "Q": 4, "S": 5
    };

    type StreakInfo = { length: number; match_ids: number[]; startDate?: string | null; endDate?: string | null };

    const results: Array<{ id: string; name: string; streak: number; match_ids?: number[]; streaks?: StreakInfo[] }> = [];

    for (const [idKey, pmatches] of playerMatches.entries()) {
      // Sort by date asc then by round asc (using roundOrder fallback 0)
      pmatches.sort((a, b) => {
        const da = a.date || '';
        const db = b.date || '';
        if (da !== db) return String(da).localeCompare(String(db));
        const ra = (a as any).round ? (roundOrder[(a as any).round] ?? 0) : 0;
        const rb = (b as any).round ? (roundOrder[(b as any).round] ?? 0) : 0;
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

      for (const mm of pmatches) {
        if (!displayName && mm.name) displayName = mm.name;
        if (mm.isWin) {
          if (cur === 0) currentStart = mm.date ? String(mm.date) : null;
          cur += 1;
          currentMatchIds.push(mm.matchId as number);
          currentEnd = mm.date ? String(mm.date) : null;
          if (cur > maxStreak) {
            maxStreak = cur;
            bestMatchIds = currentMatchIds.slice();
          }
        } else {
          if (cur > 0) {
            allStreaks.push({ length: cur, match_ids: currentMatchIds.slice(), startDate: currentStart ?? null, endDate: currentEnd ?? null });
          }
          cur = 0;
          currentMatchIds = [];
          currentStart = null;
          currentEnd = null;
        }
      }
      // flush trailing streak
      if (cur > 0) {
        allStreaks.push({ length: cur, match_ids: currentMatchIds.slice(), startDate: currentStart ?? null, endDate: currentEnd ?? null });
      }

      // sort allStreaks by length desc then startDate asc
      allStreaks.sort((x, y) => y.length - x.length || String(x.startDate ?? '').localeCompare(String(y.startDate ?? '')));

      results.push({ id: idKey, name: displayName || '', streak: maxStreak, match_ids: bestMatchIds, streaks: allStreaks });
    }

    // Sort descending by streak then by name
    results.sort((a, b) => b.streak - a.streak || a.name.localeCompare(b.name));

    // Attach slugs and IOC where possible
    try {
      const ids = Array.from(new Set(results.map(r => String(r.id))));
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(ids);
      // Fetch IOC from players table in bulk
      const players = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, ioc: true } });
      const iocMap = Object.fromEntries(players.map(p => [String(p.id), p.ioc || null]));
      const enriched = results.map(r => ({ ...r, slug: slugMap[String(r.id)] ?? null, ioc: iocMap[String(r.id)] ?? null }));
      return NextResponse.json({ streaks: enriched });
    } catch (e) {
      return NextResponse.json({ streaks: results });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
