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
    const selectedRounds = url.searchParams.getAll('round');

    const roundNumberParam = url.searchParams.get('round_number');
    const roundNumber = roundNumberParam ? parseInt(roundNumberParam) : null;
    if (roundNumber === null || isNaN(roundNumber)) {
      return NextResponse.json({ error: 'round_number parameter is required' }, { status: 400 });
    }

    // Filtro lato DB
    const playersData = await prisma.mVNeededToRound.findMany({
      where: selectedRounds.length > 0 ? { round: { in: selectedRounds } } : {},
      select: {
        player_id: true,
        round: true,
        surface_json: true,
        level_json: true,
        overall_json: true,
      },
    });

    if (playersData.length === 0) return NextResponse.json([], { status: 200 });

    // Prendere tutte le info dei giocatori in un colpo solo
    const playerIds = playersData.map(p => p.player_id);
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });
    const playerInfoMap = Object.fromEntries(playersInfo.map(p => [p.id, p]));

    const result: any[] = [];

    for (const player of playersData) {
      const info = playerInfoMap[player.player_id];
      if (!info) continue;

      let tournamentsPlayed = 0;

      if (selectedSurfaces.length > 0 && player.surface_json) {
        tournamentsPlayed = selectedSurfaces.reduce((sum, s) => {
          const r = (player.surface_json as any)[s]?.find((r: any) => r.round_number === roundNumber);
          return sum + (r?.played_to_round ?? 0);
        }, 0);
      } else if (selectedLevels.length > 0 && player.level_json) {
        tournamentsPlayed = selectedLevels.reduce((sum, l) => {
          const r = (player.level_json as any)[l]?.find((r: any) => r.round_number === roundNumber);
          return sum + (r?.played_to_round ?? 0);
        }, 0);
      } else {
        const r = (player.overall_json as any[])?.find((r: any) => r.round_number === roundNumber);
        tournamentsPlayed = r?.played_to_round ?? 0;
      }

      if (tournamentsPlayed === 0) continue;

      result.push({
        player_id: player.player_id,
        player_name: info.atpname,
        ioc: info.ioc ?? '',
        round: player.round,
        round_number: roundNumber,
        tournaments_played: tournamentsPlayed,
      });
    }

    // Ordina e limita
    result.sort((a, b) => a.tournaments_played - b.tournaments_played);
    return NextResponse.json(result.slice(0, 100));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
