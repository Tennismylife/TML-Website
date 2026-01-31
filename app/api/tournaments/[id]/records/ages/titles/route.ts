import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');
    const full = request.nextUrl.searchParams.get('full') === 'true';

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    console.log('[records/ages/titles] id=', id, 'tourneyIds=', JSON.stringify(tourneyIds));
    if (!tourneyIds) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    const numericIdSet = new Set(tourneyIds.filter(s => /^\d+$/.test(s)).map(s => parseInt(s, 10))); // numeric ids for normalization (580/581)


    // Recupera solo le finali
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    const matches = await prisma.match.findMany({
      where: {
        OR: tourneyIdFilters,
        round: 'F', // solo finali
        status: true,
        // Exclude scheduled finals that haven't been played yet
        score: { not: 'To play' },
      },
      select: {
        tourney_id: true,
        year: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
      },
    });

    const winners: any[] = [];

    for (const m of matches) {
      const rawTourney = String(m.tourney_id || '');
      const parts = rawTourney.split('-');
      const origNumericTourney = parts[parts.length - 1];

      if (m.winner_id && m.winner_name && m.winner_age != null) {
        const age = Number(m.winner_age);
        if (Number.isFinite(age)) {
          winners.push({ id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? '', age, year: m.year, tourney_id: origNumericTourney });
        }
      }
    }

    const youngestWinners = winners.slice().sort((a, b) => a.age - b.age);
    const oldestWinners = winners.slice().sort((a, b) => b.age - a.age);

    if (full) {
      return NextResponse.json({
        youngestWinners,
        oldestWinners,
      });
    }

    // Primo caricamento: solo top10
    return NextResponse.json({
      topYoungestWinners: youngestWinners.slice(0, 10),
      topOldestWinners: oldestWinners.slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
