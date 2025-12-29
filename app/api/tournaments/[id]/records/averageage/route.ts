import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
    if (!tourneyIds) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    const numericIdSet = new Set(tourneyIds.filter(s => /^\d+$/.test(s)).map(s => parseInt(s, 10))); // numeric ids for normalization (580/581)

    
    // Fetch all matches for the tournament
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    const matches = await prisma.match.findMany({
      where: { OR: tourneyIdFilters },
      select: {
        year: true,
        tourney_id: true,
        winner_age: true,
        loser_age: true,
      },
    });

    if (!matches.length) {
      return NextResponse.json({ error: 'No matches found for this tournament' }, { status: 404 });
    }

    // Delegate the heavy lifting to a helper in lib so the route export stays minimal for Next type generation
    const canonicalParam = await (await import('@/lib/tournament')).resolveCanonicalTourneyId(id);
    const { computeAverageChartData } = await import('@/lib/records/computeAverageChartData');
    const { chartData, overallAverage } = computeAverageChartData(matches, canonicalParam);
    if (!chartData.length) return NextResponse.json({ error: 'No matches found for this tournament' }, { status: 404 });
    return NextResponse.json({ chartData, overallAverage });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


