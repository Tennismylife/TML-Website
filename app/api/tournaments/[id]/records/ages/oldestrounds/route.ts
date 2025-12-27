import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');
    const full = request.nextUrl.searchParams.get('full') === 'true';

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    if (!tourneyIds) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    const numericIdSet = new Set(tourneyIds.filter(s => /^\d+$/.test(s)).map(s => parseInt(s, 10))); // numeric ids for normalization (580/581)

    // canonicalize route param (581 -> 580)
    const canonicalParam = await (await import('@/lib/tournament')).resolveCanonicalTourneyId(id);

    const matches = await prisma.match.findMany({
      where: { tourney_id: { in: tourneyIds } },
      select: {
        tourney_id: true,
        year: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
      },
      orderBy: { tourney_date: 'desc' },
    });

    const roundOldest = new Map<string, any[]>();

    for (const m of matches) {
      // preserve original id but canonicalize for inclusion (support '1977-581' or '581')
      const rawTourney = String(m.tourney_id || '');
      const parts = rawTourney.split('-');
      const origNumericTourney = parts[parts.length - 1];
      let numericTourney = origNumericTourney;
      if (numericTourney === '581') numericTourney = '580';
      if (canonicalParam && String(numericTourney) !== String(canonicalParam)) continue;

      const round = m.round || 'Unknown';
      const year = m.year;
      if (!year) continue;
      if (!roundOldest.has(round)) roundOldest.set(round, []);
      const list = roundOldest.get(round)!;

      [[m.winner_id, m.winner_name, m.winner_ioc, m.winner_age],
       [m.loser_id, m.loser_name, m.loser_ioc, m.loser_age]].forEach(([id, name, ioc, age]) => {
        if (id && name && age != null) {
          const nAge = Number(age);
          if (Number.isFinite(nAge)) list.push({ id, name, ioc: ioc ?? '', age: nAge, year, tourney_id: origNumericTourney });
        }
      });
    }

    const roundOrder = ["F", "SF", "QF", "R16", "R32", "R64", "R128"];
    const sortedRounds = Array.from(roundOldest.keys()).sort((a, b) => {
      const ia = roundOrder.indexOf(a), ib = roundOrder.indexOf(b);
      return (ia === -1 ? 100 : ia) - (ib === -1 ? 100 : ib);
    });

    const allOldestItems = sortedRounds.map((round) => {
      const sortedPlayers = roundOldest.get(round)!.sort((a, b) => b.age - a.age);

      if (full) {
        // full=true → invia fullList
        return { title: round, list: sortedPlayers, fullList: sortedPlayers };
      }

      // full=false → solo top10, senza fullList
      return { title: round, list: sortedPlayers.slice(0, 10) };
    });

    return NextResponse.json({ allOldestItems });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
