import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const maxTitlesParam = url.searchParams.get('maxTitles');
    const maxTitles = maxTitlesParam ? parseInt(maxTitlesParam) : undefined;

    if (!maxTitles) {
      return NextResponse.json({ error: 'maxTitles parameter is required' }, { status: 400 });
    }

    const playersData = await prisma.mVNeededto.findMany();

    let result: any[] = [];

    for (const player of playersData) {
      const playerInfo = await prisma.player.findUnique({
        where: { id: player.player_id },
        select: { atpname: true, ioc: true },
      });
      if (!playerInfo) continue;

      const idx = (player.overall_json as any[])?.findIndex((t: any) => t.titles === maxTitles);
      if (idx === undefined || idx === -1) continue;

      let tournamentsPlayed: number | null = null;

      if (selectedSurfaces.length > 0 && player.surface_json) {
        const values = selectedSurfaces.map((s) => player.surface_json[s]?.[idx]?.played ?? 0);
        tournamentsPlayed = values.reduce((a, b) => a + b, 0);
      } else if (selectedLevels.length > 0 && player.level_json) {
        const values = selectedLevels.map((l) => player.level_json[l]?.[idx]?.played ?? 0);
        tournamentsPlayed = values.reduce((a, b) => a + b, 0);
      } else {
        tournamentsPlayed = (player.overall_json as any[])[idx]?.played ?? 0;
      }

      // Scarta giocatori che non hanno effettivamente raggiunto il titolo N
      if (!tournamentsPlayed || tournamentsPlayed === 0) continue;

      result.push({
        player_id: player.player_id,
        player_name: playerInfo.atpname,
        ioc: playerInfo.ioc || '',
        titles: maxTitles,
        tournaments_played: tournamentsPlayed,
      });
    }

    // Ordina crescente e limita a 100
    result = result
      .sort((a, b) => (a.tournaments_played ?? 0) - (b.tournaments_played ?? 0))
      .slice(0, 100);

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
