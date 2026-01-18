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
    const selectedRound = url.searchParams.get('round');
    const minWinsPerSeason = parseInt(url.searchParams.get('minWinsPerSeason') || '1', 10);
    const bestOf = url.searchParams.get('best_of');
    const limitParam = Number(url.searchParams.get('limit') || '100');
    const limit = Math.min(1000, Math.max(1, Number.isFinite(limitParam) ? limitParam : 100));

    // --- Fetch matches where there is a winner ---
    const matches = await prisma.match.findMany({
      where: {
        winner_id: { not: null },
        status: true,
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRound ? { round: selectedRound } : {}),
        ...(bestOf ? { best_of: Number(bestOf) } : {}),
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        year: true,
      },
    });

    // --- Compute wins per season per player ---
    const seasonsMap = new Map<
      string,
      { name: string; ioc: string; seasonsCount: Record<string, number> }
    >();

    matches.forEach(m => {
      if (m.winner_id && m.year) {
        if (!seasonsMap.has(m.winner_id)) {
          seasonsMap.set(m.winner_id, { name: m.winner_name ?? '', ioc: m.winner_ioc ?? '', seasonsCount: {} });
        }
        const player = seasonsMap.get(m.winner_id)!;
        player.seasonsCount[m.year] = (player.seasonsCount[m.year] || 0) + 1;
      }
    });

    const players: Player[] = [];
    for (const [id, info] of seasonsMap.entries()) {
      const seasonsList = Object.entries(info.seasonsCount)
        .filter(([_, count]) => count >= minWinsPerSeason)
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

    return NextResponse.json({ players: players.slice(0, limit) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
