import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type SetsRecord = {
  player: { id: string; name: string; ioc: string };
  wins: number;
  totalMatches: number;
  winPercentage: number;
};

const cache = new Map<string, { data: { records: SetsRecord[] }; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 ora

//StraightSets significa che il vincitore non ha concesso set all'avversario
function isStraightSets(score: string | null, bestOf: number | null): boolean {
  if (!score || !bestOf) return false;

  const sets = score.split(' ');
  let winnerSets = 0;
  let loserSets = 0;

  for (const setScore of sets) {
    if (!setScore.includes('-')) continue;

    const scores = setScore.split('-');
    if (scores.length !== 2) continue;

    // Rimuove eventuali tiebreaks tipo 7-6(5)
    const winnerScore = parseInt(scores[0].replace(/\(\d+\)/, ''), 10);
    const loserScore = parseInt(scores[1].replace(/\(\d+\)/, ''), 10);

    if (winnerScore > loserScore) winnerSets++;
    else if (loserScore > winnerScore) loserSets++;
  }

  const required = bestOf === 3 ? 2 : bestOf === 5 ? 3 : 0;
  return winnerSets === required && loserSets === 0;
}


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
        console.log('Serving from cache');
        return NextResponse.json(cached.data);
      }
    }

    const where: any = {
      AND: [
        {
          NOT: [
            { score: { contains: 'W/O' } },
            { score: { contains: 'WEA' } },
          ],
        },
      ],
    };

    if (selectedSurfaces.length) where.AND.push({ surface: { in: selectedSurfaces } });
    if (selectedLevels.length) where.AND.push({ tourney_level: { in: selectedLevels } });
    if (bestOfParams.length) where.AND.push({ best_of: { in: bestOfParams.map(Number) } });
    if (selectedRounds && selectedRounds !== 'all') where.AND.push({ round: selectedRounds });

    let matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
        score: true,
        best_of: true,
      },
    });

    matches = matches.filter(m => isStraightSets(m.score, m.best_of));

    if (!matches.length) return NextResponse.json({ records: [] });

    const playerStats = new Map<
      string,
      { id: string; name: string; ioc: string; wins: number; total: number }
    >();

    for (const m of matches) {
      const wKey = String(m.winner_id);
      const lKey = String(m.loser_id);

      if (!playerStats.has(wKey)) {
        playerStats.set(wKey, {
          id: wKey,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          wins: 0,
          total: 0,
        });
      }
      playerStats.get(wKey)!.wins += 1;
      playerStats.get(wKey)!.total += 1;

      if (!playerStats.has(lKey)) {
        playerStats.set(lKey, {
          id: lKey,
          name: m.loser_name,
          ioc: m.loser_ioc ?? '',
          wins: 0,
          total: 0,
        });
      }
      playerStats.get(lKey)!.total += 1;
    }

    const records: SetsRecord[] = Array.from(playerStats.values())
      .map(p => ({
        player: { id: p.id, name: p.name, ioc: p.ioc },
        wins: p.wins,
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
