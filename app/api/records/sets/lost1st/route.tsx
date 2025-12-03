import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SetsRecord = {
  player: { id: string; name: string; ioc: string };
  wins: number;
  losses: number;
  totalMatches: number;
  winPercentage: number;
};

const cache = new Map<string, { data: { records: SetsRecord[] }; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 ora

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const bestOfParams = url.searchParams.getAll('best_of');
    const selectedRounds = url.searchParams.get('round');

    console.log('Selected surfaces:', selectedSurfaces);
    console.log('Selected levels:', selectedLevels);
    console.log('Best_of filter applied:', bestOfParams);
    console.log('Selected rounds:', selectedRounds);

    const cacheKey = JSON.stringify({
      surface: selectedSurfaces.sort(),
      level: selectedLevels.sort(),
      best_of: bestOfParams.sort(),
      round: selectedRounds,
    });

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    const where: any = {
      AND: [
        { NOT: [{ score: { contains: 'W/O' } }, { score: { contains: 'WEA' } }] },
      ],
    };
    if (selectedSurfaces.length) where.AND.push({ surface: { in: selectedSurfaces } });
    if (selectedLevels.length) where.AND.push({ tourney_level: { in: selectedLevels } });
    if (bestOfParams.length) where.AND.push({ best_of: { in: bestOfParams.map(Number) } });
    if (selectedRounds && selectedRounds !== 'all') where.AND.push({ round: selectedRounds });

    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
        score: true,
      },
    });

    if (!matches.length) return NextResponse.json({ records: [] });

    const playerStats = new Map<
      string,
      { id: string; name: string; ioc: string; wins: number; losses: number; total: number }
    >();

    for (const m of matches) {
      if (!m.score) continue;
      const sets = m.score.split(' ');
      if (sets.length === 0 || !sets[0].includes('-')) continue;

      const firstSet = sets[0].match(/^(\d+)-(\d+)/);
      if (!firstSet) continue;

      const p1Games = parseInt(firstSet[1], 10);
      const p2Games = parseInt(firstSet[2], 10);

      let firstSetLoserId: string | null = null;
      let firstSetLoserName = '';
      let firstSetLoserIoc = '';

      if (p1Games > p2Games) {
        // vincitore del match ha vinto il primo set → il perdente ha perso il primo set
        firstSetLoserId = m.loser_id;
        firstSetLoserName = m.loser_name;
        firstSetLoserIoc = m.loser_ioc ?? '';
      } else if (p2Games > p1Games) {
        // perdente del match ha vinto il primo set → il vincitore ha perso il primo set
        firstSetLoserId = m.winner_id;
        firstSetLoserName = m.winner_name;
        firstSetLoserIoc = m.winner_ioc ?? '';
      } else {
        continue;
      }

      if (!playerStats.has(firstSetLoserId)) {
        playerStats.set(firstSetLoserId, {
          id: firstSetLoserId,
          name: firstSetLoserName,
          ioc: firstSetLoserIoc,
          wins: 0,
          losses: 0,
          total: 0,
        });
      }

      const stats = playerStats.get(firstSetLoserId)!;
      stats.total += 1;

      if (firstSetLoserId === m.winner_id) {
        stats.wins += 1;
      } else {
        stats.losses += 1;
      }
    }

    const records: SetsRecord[] = Array.from(playerStats.values())
      .map(p => ({
        player: { id: p.id, name: p.name, ioc: p.ioc },
        wins: p.wins,
        losses: p.losses,
        totalMatches: p.total,
        winPercentage: p.total > 0 ? (p.wins / p.total) * 100 : 0,
      }))
      .sort((a, b) => b.winPercentage - a.winPercentage || b.totalMatches - a.totalMatches);

    const result = { records: records.slice(0, 1000) };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}