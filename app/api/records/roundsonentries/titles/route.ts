import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');

    const filters = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // 1️⃣ Conta entries e wins con groupBy
    const entriesData = await prisma.playerTournament.groupBy({
      by: ['player_id'],
      where: filters,
      _count: { event_id: true },
    });

    const winsData = await prisma.playerTournament.groupBy({
      by: ['player_id'],
      where: { ...filters, round: 'W' },
      _count: { id: true },
    });

    // Map per accesso veloce
    const winsMap: Map<string, number> = new Map<string, number>(
      winsData.map(w => [String(w.player_id), Number(w._count.id)])
    );

    const playerIds = entriesData.map(e => e.player_id);

    // 2️⃣ Recupera nome e IOC dei giocatori
    const playersData = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    const playerInfoMap: Map<string, { name: string; ioc: string }> = new Map(
      playersData.map(p => [
        p.id,
        { name: p.atpname || '(Unknown)', ioc: p.ioc || '' }
      ])
    );

    // 3️⃣ Costruisci array finale
    const allPlayers = entriesData.map(e => {
      const entries = Number(e._count.event_id) || 0;
      const wins = winsMap.get(String(e.player_id)) || 0;
      const percentage = entries > 0 ? Math.round((wins / entries) * 1000) / 10 : 0;
      const info = playerInfoMap.get(e.player_id) || { name: '(Unknown)', ioc: '' };
      return {
        id: e.player_id,
        name: info.name,
        ioc: info.ioc,
        entries,
        wins,
        percentage,
      };
    });

    // 4️⃣ Ordina e top 10
    const result = allPlayers
      .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins)
      .slice(0, 100);

    return NextResponse.json({
      FinalWins: result,
      definition: 'entries = unique tournaments played, wins = tournaments won, percentage = (wins / entries) * 100',
    });

  } catch (error) {
    console.error('[GET /api/final-wins] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
