import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // Recupera parametri dal contesto
    const params = context?.params ?? {};
    const yearRaw = String(params.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);
    const selectedSurfaces = searchParams.get('surfaces')?.split(',') || [];
    const selectedLevels = searchParams.get('levels')?.split(',') || [];

    // Fetch matches filtered by year, surfaces, levels, and additional flags
    const allMatches = await prisma.match.findMany({
      where: {
        year,
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        team_event: false,
        status: true,
      },
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        score: true,
        tourney_level: true,
      },
      orderBy: [
        { year: 'desc' },
        { tourney_id: 'desc' },
      ],
    });

    const roundOrder = ["R128","R64","R32","R16","QF","SF","F"];
    const roundStats = new Map<string, Map<string, { id: string | number; name: string; ioc: string; wins: number; losses: number; percentage: number }>>();

    for (const m of allMatches) {
      const round = m.round;
      if (!round || !roundOrder.includes(round)) continue; // solo round canonici

      if (!roundStats.has(round)) roundStats.set(round, new Map());
      const players = roundStats.get(round)!;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = players.get(key);
        if (!existing) {
          players.set(key, { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? "", wins: 1, losses: 0, percentage: 0 });
        } else existing.wins++;
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = players.get(key);
        if (!existing) {
          players.set(key, { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc ?? "", wins: 0, losses: 1, percentage: 0 });
        } else existing.losses++;
      }
    }

    // Calculate percentages per round
    for (const players of roundStats.values()) {
      for (const stats of players.values()) {
        const total = stats.wins + stats.losses;
        stats.percentage = total > 0 ? Math.round((stats.wins / total) * 100 * 100) / 100 : 0;
      }
    }

    // Sort rounds in reverse order: F, SF, QF, R16, ...
    const sortedRounds = roundOrder.slice().reverse().filter(round => roundStats.has(round));

    const allRoundItems = sortedRounds.map(round => {
      const players = Array.from(roundStats.get(round)!.values()).filter(p => p.wins + p.losses > 0);
      const sorted = players.sort((a, b) => b.percentage - a.percentage);
      return {
        title: round,
        list: sorted.slice(0, 10),
        fullList: sorted,
      };
    });

    // Surfaces and levels
    const surfaceList = Array.from(new Set(allMatches.map(m => m.surface))).sort();
    const levelList = Array.from(new Set(allMatches.map(m => m.tourney_level))).sort();

    return NextResponse.json({
      allRoundItems,
      surfaceList,
      levelList,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
