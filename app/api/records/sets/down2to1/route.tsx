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
    const selectedRounds = url.searchParams.get('round');

    const cacheKey = JSON.stringify({
      surface: selectedSurfaces.sort(),
      level: selectedLevels.sort(),
      best_of: [5],
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
        { best_of: 5 },
      ],
    };
    if (selectedSurfaces.length) where.AND.push({ surface: { in: selectedSurfaces } });
    if (selectedLevels.length) where.AND.push({ tourney_level: { in: selectedLevels } });
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
      let winnerSets = 0;
      let loserSets = 0;

      for (const setScore of sets) {
        const cleanedSet = setScore.replace(/\(.*?\)/g, ''); // rimuove tie-break
        if (!cleanedSet.includes('-')) continue;
        const scores = cleanedSet.split('-');
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

      // Assicurati che tutti i giocatori siano nella mappa
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

      // Se il vincitore ha 3 set e il perdente ha 2, il vincitore era sotto 1-2 e ha vinto
      if (winnerSets === 3 && loserSets === 2) {
        playerStats.get(m.winner_id)!.total += 1;
        playerStats.get(m.winner_id)!.wins += 1;
      }
      // Se il vincitore ha 3 set e il perdente ha 1, il perdente era sotto 1-2 e ha perso
      else if (winnerSets === 3 && loserSets === 1) {
        playerStats.get(m.loser_id)!.total += 1;
        playerStats.get(m.loser_id)!.losses += 1;
      }
      // Altri casi non sono down 1-2
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