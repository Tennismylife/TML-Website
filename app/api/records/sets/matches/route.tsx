import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type MatchRecord = {
  id: string;
  date: string;
  tourney_name: string;
  surface: string;
  round: string;
  opponent: string;
  opponent_ioc: string;
  score: string;
  winner: boolean;
};

const cache = new Map<string, { data: { matches: MatchRecord[] }; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 ora

function isStraightSets(score: string | null, bestOf: number | null): boolean {
  if (!score || !bestOf || score.includes('W/O') || score.includes('DEF') || score.includes('WEA')) {
    return false;
  }
  const sets = score.split(' ');
  let winnerSets = 0;
  let loserSets = 0;
  for (const setScore of sets) {
    if (!setScore.includes('-')) continue;
    const scores = setScore.split('-');
    if (scores.length !== 2) continue;
    try {
      const winnerScore = parseInt(scores[0], 10);
      const loserScore = parseInt(scores[1], 10);
      if (winnerScore > loserScore) winnerSets++;
      else loserSets++;
    } catch {
      continue;
    }
  }
  const required = bestOf === 3 ? 2 : bestOf === 5 ? 3 : 0;
  return winnerSets === required && loserSets === 0;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const playerId = url.searchParams.get('player_id');
    if (!playerId) return NextResponse.json({ error: 'player_id required' }, { status: 400 });

    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const bestOfParams = url.searchParams.getAll('best_of');
    const straightSets = url.searchParams.get('straight_sets') === 'true';

    console.log('Player ID:', playerId);
    console.log('Selected surfaces:', selectedSurfaces);
    console.log('Selected levels:', selectedLevels);
    console.log('Best_of filter applied:', bestOfParams);
    console.log('Straight sets:', straightSets);

    const cacheKey = JSON.stringify({
      player_id: playerId,
      surface: selectedSurfaces.sort(),
      level: selectedLevels.sort(),
      best_of: bestOfParams.sort(),
      straight_sets: straightSets,
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
          OR: [
            { winner_id: parseInt(playerId) },
            { loser_id: parseInt(playerId) },
          ],
        },
        {
          NOT: [
            { score: { contains: 'W/O' } },
            { score: { contains: 'DEF' } },
            { score: { contains: 'WEA' } },
            { tourney_name: { contains: 'Davis Cup' } },
            { tourney_name: { contains: 'World Team Cup' } },
            { tourney_name: { contains: 'World Team Championship' } },
            { tourney_name: { contains: 'ATP Cup' } },
            { tourney_name: { contains: 'United Cup' } },
            { tourney_name: { contains: 'Laver Cup' } },
            { tourney_name: { contains: 'Hopman Cup' } },
          ],
        },
      ],
    };

    if (selectedSurfaces.length) where.AND.push({ surface: { in: selectedSurfaces } });
    if (selectedLevels.length) where.AND.push({ tourney_level: { in: selectedLevels } });
    if (bestOfParams.length) where.AND.push({ best_of: { in: bestOfParams.map(Number) } });

    let matches = await prisma.match.findMany({
      where,
      select: {
        id: true,
        tourney_date: true,
        tourney_name: true,
        surface: true,
        round: true,
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
        score: true,
        best_of: true,
      },
      orderBy: { tourney_date: 'desc' },
    });

    if (straightSets) {
      matches = matches.filter(m => isStraightSets(m.score, m.best_of));
    }

    const matchRecords: MatchRecord[] = matches.map(m => {
      const isWinner = m.winner_id === playerId;
      const opponent = isWinner ? m.loser_name : m.winner_name;
      const opponentIoc = isWinner ? m.loser_ioc : m.winner_ioc;
      return {
        id: String(m.id),
        date: m.tourney_date.toISOString(),
        tourney_name: m.tourney_name,
        surface: m.surface,
        round: m.round,
        opponent,
        opponent_ioc: opponentIoc ?? '',
        score: m.score,
        winner: isWinner,
      };
    });

    const result = { matches: matchRecords };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Error in API:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}