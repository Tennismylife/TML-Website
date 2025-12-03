import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedRounds = url.searchParams.getAll('round'); // es. ["F"]
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');

    // --- Query matches ---
    const matches = await prisma.match.findMany({
      where: {
        team_event: false,
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { 
          round: { in: selectedRounds.map(r => r.toUpperCase()) } 
        }),
      },
      select: {
        winner_id: true,
        winner_age: true,
        loser_id: true,
        loser_age: true,
      },
    });

    // --- Costruisco playerAges per vincitori e perdenti ---
    const playerAges: Record<string, number[]> = {};
    const playerIds = new Set<string>();

    for (const m of matches) {
      const entries: [string | null, number | null][] = [
        [m.winner_id, m.winner_age],
        [m.loser_id, m.loser_age],
      ];

      for (const [id, age] of entries) {
        if (id != null && age != null) {
          const key = String(id);
          if (!playerAges[key]) playerAges[key] = [];
          playerAges[key].push(typeof age === 'string' ? parseFloat(age) : age);
          playerIds.add(id);
        }
      }
    }

    // Ordino le età per giocatore
    for (const id in playerAges) {
      playerAges[id].sort((a, b) => a - b);
    }

    // --- Recupero info giocatori ---
    const players = await prisma.player.findMany({
      where: { id: { in: Array.from(playerIds) } },
      select: { id: true, atpname: true, ioc: true },
    });

    const playerInfo: Record<string, { name: string; ioc: string }> = {};
    for (const p of players) {
      playerInfo[String(p.id)] = { name: p.atpname, ioc: p.ioc };
    }

    return NextResponse.json({
      rounds: selectedRounds,
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
