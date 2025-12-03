import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const targetRound = url.searchParams.get('round');

    if (!targetRound) {
      return NextResponse.json({ error: 'Missing round parameter' }, { status: 400 });
    }

    // Filtri comuni
    const baseFilters = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // Conteggio entries uniche player_id-event_id
    const uniqueEntries = await prisma.playerTournament.groupBy({
      by: ['player_id', 'event_id'],
      where: baseFilters,
    });

    const entriesCountMap = new Map<string, number>();
    uniqueEntries.forEach(e => {
      entriesCountMap.set(e.player_id, (entriesCountMap.get(e.player_id) || 0) + 1);
    });

    // Conteggio round raggiunto filtrato
    const roundData = await prisma.playerTournament.groupBy({
      by: ['player_id'],
      where: { ...baseFilters, round: targetRound },
      _count: { event_id: true },
    });
    const roundMap = new Map(roundData.map(r => [r.player_id, r._count.event_id]));

    const playerIds = Array.from(new Set([...entriesCountMap.keys(), ...roundMap.keys()]));

    // Recupera info giocatori
    const playersData = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    const playerInfoMap = new Map(playersData.map(p => [
      p.id,
      { name: p.atpname || '(Unknown)', ioc: p.ioc || '' }
    ]));

    // Costruisci array finale
    const allPlayers = playerIds.map(player_id => {
      const entries = entriesCountMap.get(player_id) || 0;
      const wins = roundMap.get(player_id) || 0;
      const percentage = entries > 0 ? Math.round((wins / entries) * 1000) / 10 : 0;
      const info = playerInfoMap.get(player_id) || { name: '(Unknown)', ioc: '' };
      return { id: player_id, name: info.name, ioc: info.ioc, entries, wins, percentage };
    });

    // Ordina per percentuale, poi per wins, poi per entries
    const result = allPlayers
      .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins || b.entries - a.entries)
      .slice(0, 100);

    return NextResponse.json({
      targetRound,
      FinalWins: result,
      definition: `entries = unique tournaments played, wins = tournaments where player reached ${targetRound}, percentage = 100 × (wins / entries)`,
    });

  } catch (error) {
    console.error('[GET /api/roundsonentries/rounds] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
