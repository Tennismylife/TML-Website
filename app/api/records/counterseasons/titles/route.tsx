// app/api/records/counterseasons/titles/route.tsx
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Player {
  id: string;
  name: string;
  ioc: string;
  totalSeasons: number;
  seasonsList: string[];
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const minTitlesPerSeason = parseInt(url.searchParams.get('minTitlesPerSeason') || '1', 10);

    // --- Fetch matches ---
    const matches = await prisma.match.findMany({
      where: {
        round: 'F',
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        NOT: {
          OR: [
            { score: { contains: "W/O", mode: 'insensitive' } },
            { score: { contains: "DEF", mode: 'insensitive' } },
            { score: { contains: "WEA", mode: 'insensitive' } },
          ],
        },
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        year: true,
        round: true,
      },
    });

    // --- Compute players with seasons having >= minTitlesPerSeason ---
    const seasonsMap = new Map<
      string,
      { name: string; ioc: string; seasonsCount: Record<string, number> }
    >();

    matches.forEach(m => {
      if (m.round === 'F' && m.winner_id && m.year) {
        if (!seasonsMap.has(m.winner_id)) {
          seasonsMap.set(m.winner_id, { name: m.winner_name, ioc: m.winner_ioc, seasonsCount: {} });
        }
        const player = seasonsMap.get(m.winner_id)!;
        player.seasonsCount[m.year] = (player.seasonsCount[m.year] || 0) + 1;
      }
    });

    const players: Player[] = [];
    for (const [id, info] of seasonsMap.entries()) {
      const seasonsList = Object.entries(info.seasonsCount)
        .filter(([_, count]) => count >= minTitlesPerSeason)
        .map(([year]) => year)
        .sort((a, b) => parseInt(a) - parseInt(b));

      if (seasonsList.length > 0) {
        players.push({
          id,
          name: info.name,
          ioc: info.ioc,
          totalSeasons: seasonsList.length,
          seasonsList,
        });
      }
    }

    // Sort players by totalSeasons descending, then name ascending
    players.sort((a, b) => b.totalSeasons - a.totalSeasons || a.name.localeCompare(b.name));

    return NextResponse.json({ players });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
