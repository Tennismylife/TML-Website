import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedRound = url.searchParams.get('round');
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');

    if (!selectedRound) {
      return NextResponse.json(
        { error: 'round query parameter is required' },
        { status: 400 }
      );
    }

    // Query matches
    const matches = await prisma.match.findMany({
      where: {
        team_event: false,
        round: selectedRound,
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      },
      select: {
        winner_id: true,
        winner_age: true,
        loser_id: true,
        loser_age: true,
      },
    });

    // Costruisco playerAges e raccolgo tutti i playerId
    const playerAges: Record<string, number[]> = {};
    const playerIds = new Set<string>();

    for (const m of matches) {
      if (m.winner_id && m.winner_age != null) {
        const id = String(m.winner_id);
        if (!playerAges[id]) playerAges[id] = [];
        playerAges[id].push(m.winner_age);
        playerIds.add(id);
      }
      if (m.loser_id && m.loser_age != null) {
        const id = String(m.loser_id);
        if (!playerAges[id]) playerAges[id] = [];
        playerAges[id].push(m.loser_age);
        playerIds.add(id);
      }
    }

    // Recupero informazioni giocatori
    const players = await prisma.player.findMany({
      where: { id: { in: Array.from(playerIds) } },
      select: { id: true, atpname: true, ioc: true },
    });

    const playerInfo: Record<string, { name: string; ioc: string }> = {};
    for (const p of players) {
      playerInfo[String(p.id)] = { name: p.atpname, ioc: p.ioc };
    }

    return NextResponse.json({
      round: selectedRound,
      surfaces: selectedSurfaces,
      levels: selectedLevels,
      playerAges,
      playerInfo,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
