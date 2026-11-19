import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

    const matchFilters = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
      ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
      status: true,
    };

    const [winners, losers] = await Promise.all([
      prisma.match.groupBy({
        by: ['winner_id'],
        where: { ...matchFilters, winner_id: { not: null } },
        _count: { winner_id: true },
        _min: { winner_name: true, winner_ioc: true },
      }),
      prisma.match.groupBy({
        by: ['loser_id'],
        where: { ...matchFilters, loser_id: { not: null } },
        _count: { loser_id: true },
        _min: { loser_name: true, loser_ioc: true },
      }),
    ]);

    const winnersById = new Map(winners.map(row => [row.winner_id, row]));
    const losersById = new Map(losers.map(row => [row.loser_id, row]));
    const ids = Array.from(new Set([...winnersById.keys(), ...losersById.keys()]))
      .filter((id): id is string => id !== null);
    if (ids.length === 0) return NextResponse.json({ topWinPercentages: [] });

    const players = await prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, atpname: true, player: true, ioc: true, slug: true },
    });
    const playersById = new Map(players.map(player => [player.id, player]));

    const topWinPercentages = ids.map(id => {
      const player = playersById.get(id);
      const winner = winnersById.get(id);
      const loser = losersById.get(id);
      const wins = winner?._count.winner_id ?? 0;
      const losses = loser?._count.loser_id ?? 0;
      const matchesPlayed = wins + losses;

      return {
        id,
        name: player?.atpname || player?.player || winner?._min.winner_name || loser?._min.loser_name || '',
        ioc: player?.ioc || winner?._min.winner_ioc || loser?._min.loser_ioc || '',
        wins,
        losses,
        matchesPlayed,
        winPercentage: Math.round((wins / matchesPlayed) * 10000) / 100,
        slug: player?.slug ?? null,
      };
    }).sort((a, b) => b.winPercentage - a.winPercentage || b.matchesPlayed - a.matchesPlayed);

    return NextResponse.json({ topWinPercentages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
