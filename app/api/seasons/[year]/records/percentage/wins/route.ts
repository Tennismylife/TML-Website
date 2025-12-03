import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // Recupera parametri dal contesto (await per compatibilità con diverse versioni di Next.js)
    const params = await context?.params;
    const yearRaw = String(params?.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }

    // Parametri query
    const { searchParams } = new URL(request.url);
    const selectedSurfaces = searchParams.get('surfaces')?.split(',').filter(Boolean) || [];
    const selectedLevels = searchParams.get('levels')?.split(',').filter(Boolean) || [];

    // Fetch matches filtrati per anno, surfaces, livelli e solo validi
    const allMatches = await prisma.match.findMany({
      where: {
        year: year,
        status: true, // solo match validi
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
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
        tourney_level: true,
      },
      orderBy: [
        { year: 'desc' },
        { tourney_id: 'desc' },
      ],
    });

    // Aggregazione statistiche giocatori
    const playerStats = new Map<string, { id: string | number; name: string; ioc: string; wins: number; losses: number; totalMatches: number; percentage: number }>();

    for (const m of allMatches) {
      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = playerStats.get(key);
        if (!existing) {
          playerStats.set(key, { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? "", wins: 1, losses: 0, totalMatches: 1, percentage: 0 });
        } else {
          existing.wins++;
          existing.totalMatches++;
        }
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = playerStats.get(key);
        if (!existing) {
          playerStats.set(key, { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc ?? "", wins: 0, losses: 1, totalMatches: 1, percentage: 0 });
        } else {
          existing.losses++;
          existing.totalMatches++;
        }
      }
    }

    // Calcola percentuali
    for (const stats of playerStats.values()) {
      stats.percentage = stats.totalMatches > 0 ? (stats.wins / stats.totalMatches) * 100 : 0;
    }

    // Ordina per percentuale discendente
    const sortedOverall = Array.from(playerStats.values())
      .filter(p => p.totalMatches > 0)
      .sort((a, b) => b.percentage - a.percentage);

    return NextResponse.json({
      sortedOverall,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
