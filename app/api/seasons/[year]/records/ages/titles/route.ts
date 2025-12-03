import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const url = new URL(request.url);
  const selectedSurfaces = url.searchParams.get('surfaces')?.split(',') || [];
  const selectedLevels = url.searchParams.get('levels')?.split(',') || [];
  const full = url.searchParams.get('full') === 'true';

  if (isNaN(yearNum)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

  try {
    const allMatches = await prisma.match.findMany({
      where: {
        year: yearNum,
        surface: selectedSurfaces.length ? { in: selectedSurfaces } : undefined,
        tourney_level: selectedLevels.length ? { in: selectedLevels } : undefined,
        team_event: false,
        round: 'F', // solo vincitori titoli
      },
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
      },
      orderBy: { year: 'desc' },
    });

    const winnersMap = new Map<string, any>();
    for (const m of allMatches) {
      if (m.winner_id && m.winner_age != null) {
        winnersMap.set(m.winner_id, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          age: Number(m.winner_age),
          year: m.year,
          tourney_id: m.tourney_id,
          tourney_name: m.tourney_name,
        });
      }
    }

    const allWinners = Array.from(winnersMap.values());

    const sortedOldest = allWinners.sort((a,b) => b.age - a.age);
    const sortedYoungest = allWinners.sort((a,b) => a.age - b.age);

    if (full) {
      return NextResponse.json({
        topOldestTitles: sortedOldest,
        topYoungestTitles: sortedYoungest
      });
    } else {
      return NextResponse.json({
        topOldestTitles: sortedOldest.slice(0,10),
        topYoungestTitles: sortedYoungest.slice(0,10)
      });
    }

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
