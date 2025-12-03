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
      if (sets.length < 2 || !sets[0].includes('-') || !sets[1].includes('-')) continue;

      const firstSet = sets[0].match(/^(\d+)-(\d+)/);
      const secondSet = sets[1].match(/^(\d+)-(\d+)/);
      if (!firstSet || !secondSet) continue;

      const p1Set1 = parseInt(firstSet[1], 10);
      const p2Set1 = parseInt(firstSet[2], 10);
      const p1Set2 = parseInt(secondSet[1], 10);
      const p2Set2 = parseInt(secondSet[2], 10);

      // Controlla se i primi due set sono split: uno vinto da p1, uno da p2
      const p1WonFirst = p1Set1 > p2Set1;
      const p2WonFirst = p2Set1 > p1Set1;
      const p1WonSecond = p1Set2 > p2Set2;
      const p2WonSecond = p2Set2 > p1Set2;

      const split = (p1WonFirst && p2WonSecond) || (p2WonFirst && p1WonSecond);

      if (split) {
        // Entrambi i giocatori hanno partecipato a un match con primi due set split
        if (!playerStats.has(m.winner_id)) {
          playerStats.set(m.winner_id, {
            id: m.winner_id,
            name: m.winner_name,
            ioc: m.winner_ioc ?? '',
            wins: 0,
            losses: 0,
            total: 0,
          });
        }
        playerStats.get(m.winner_id)!.wins += 1;
        playerStats.get(m.winner_id)!.total += 1;

        if (!playerStats.has(m.loser_id)) {
          playerStats.set(m.loser_id, {
            id: m.loser_id,
            name: m.loser_name,
            ioc: m.loser_ioc ?? '',
            wins: 0,
            losses: 0,
            total: 0,
          });
        }
        playerStats.get(m.loser_id)!.losses += 1;
        playerStats.get(m.loser_id)!.total += 1;
      }
    }

    const records: SetsRecord[] = Array.from(playerStats.values())
      .filter(p => p.total > 0)
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