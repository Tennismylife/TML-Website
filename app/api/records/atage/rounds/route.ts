import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ----------- required parameters -----------
    const ageParam = url.searchParams.get('age');
    const roundParam = url.searchParams.get('round');
    if (!ageParam || !roundParam) {
      return NextResponse.json({ error: 'Age and round parameters required' }, { status: 400 });
    }
    const targetAge = Number(ageParam);
    const targetRound = roundParam;
    if (isNaN(targetAge)) {
      return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });
    }

    // ----------- optional filters -----------
    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels = url.searchParams.getAll('level').filter(Boolean);

    const where: any = {
      round: targetRound,
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // ----------- fetch matches -----------
    const allMatches = await prisma.match.findMany({
      where,
      select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true },
    });

    // ----------- count occurrences per player -----------
    const countsByPlayer = new Map<string, number>();

    for (const m of allMatches) {
      // winner
      if (m.winner_id && m.winner_age != null && m.winner_age <= targetAge) {
        const winnerId = String(m.winner_id);
        countsByPlayer.set(winnerId, (countsByPlayer.get(winnerId) || 0) + 1);
      }

      // loser
      if (m.loser_id && m.loser_age != null && m.loser_age <= targetAge) {
        const loserId = String(m.loser_id);
        countsByPlayer.set(loserId, (countsByPlayer.get(loserId) || 0) + 1);
      }
    }

    if (countsByPlayer.size === 0) {
      return NextResponse.json([]);
    }

    // ----------- fetch player info -----------
    const uniqueIds = Array.from(countsByPlayer.keys());
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, player: true, ioc: true },
    });

    // ----------- build response -----------
    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc || '',
      appearances_at_age: countsByPlayer.get(p.id) || 0,
    })).filter(p => p.appearances_at_age > 0);

    // ----------- sort descending -----------
    result.sort((a, b) => b.appearances_at_age - a.appearances_at_age);
    const topPlayers = result.slice(0, 100);

    return NextResponse.json(topPlayers);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
