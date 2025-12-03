// app/api/records/ageofnth/titles/route.tsx

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const selectedRounds = url.searchParams.getAll('round');
    const selectedBestOf = url.searchParams.getAll('best_of');

    // Fetch matches, round 'F' for finals
    const matches = await prisma.match.findMany({
      where: {
        round: 'F',
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf.map(b => parseInt(b)) } }),
        NOT: {
          OR: [
            { score: { contains: "WEA" } },
          ],
        },
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
      },
    });

    // Group ages by player
    const playerAgeTitles = new Map<string, { name: string; ioc: string; ages: number[] }>();

    for (const m of matches) {
      if (m.winner_id && m.winner_age) {
        const playerKey = m.winner_id;
        if (!playerAgeTitles.has(playerKey)) {
          playerAgeTitles.set(playerKey, { name: m.winner_name, ioc: m.winner_ioc || '', ages: [] });
        }
        playerAgeTitles.get(playerKey)!.ages.push(m.winner_age);
      }
    }

    // Convert to array
    const result: [string, { name: string; ioc: string; ages: number[] }][] = Array.from(playerAgeTitles.entries());

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}