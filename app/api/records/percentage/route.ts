import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PlayerWinPercentage = {
  id: string | number;
  name: string;
  ioc: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winPercentage: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const selectedRounds = url.searchParams.getAll('round');
    const selectedBestOf = url.searchParams
      .getAll('best_of')
      .map(b => parseInt(b))
      .filter(n => !isNaN(n));

    // Count wins per player
    const winners = await prisma.match.groupBy({
      by: ['winner_id', 'winner_name', 'winner_ioc'],
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
        status: true,
        winner_id: { not: null },
      },
      _count: { winner_id: true },
    });

    // Count losses per player
    const losers = await prisma.match.groupBy({
      by: ['loser_id', 'loser_name', 'loser_ioc'],
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
        status: true,
        loser_id: { not: null },
      },
      _count: { loser_id: true },
    });

    // Merge wins and losses
    const statsMap = new Map<string, { id: string | number; name: string; ioc: string; wins: number; losses: number }>();

    winners.forEach(w => {
      const key = String(w.winner_id);
      statsMap.set(key, {
        id: w.winner_id,
        name: w.winner_name ?? '',
        ioc: w.winner_ioc ?? '',
        wins: w._count.winner_id,
        losses: 0,
      });
    });

    losers.forEach(l => {
      const key = String(l.loser_id);
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          id: l.loser_id,
          name: l.loser_name ?? '',
          ioc: l.loser_ioc ?? '',
          wins: 0,
          losses: l._count.loser_id,
        });
      } else {
        statsMap.get(key)!.losses = l._count.loser_id;
      }
    });

    const topWinPercentages: PlayerWinPercentage[] = Array.from(statsMap.values())
      .map(p => ({
        ...p,
        matchesPlayed: p.wins + p.losses,
        winPercentage: Math.round((p.wins / (p.wins + p.losses)) * 10000) / 100,
      }))
      .sort((a, b) => b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed);

    return NextResponse.json({ topWinPercentages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
