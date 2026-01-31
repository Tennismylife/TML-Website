import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = globalThis.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const limitParam = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    // 1️⃣ Costruzione filtri dinamici
    const filters: any = {};
    if (selectedSurfaces.length) filters.surface = { in: selectedSurfaces };
    if (selectedLevels.length) filters.tourney_level = { in: selectedLevels };

    // 2️⃣ Recupero entries uniche per player
    const entriesRaw = await prisma.playerTournament.findMany({
      where: filters,
      distinct: ['player_id', 'event_id'], // ogni coppia unica
      select: { player_id: true },
    });

    const entriesMap = new Map<string, number>();
    for (const e of entriesRaw) {
      entriesMap.set(e.player_id, (entriesMap.get(e.player_id) || 0) + 1);
    }

    // 3️⃣ Recupero wins uniche per player
    const winsRaw = await prisma.playerTournament.findMany({
      where: { ...filters, round: 'W' },
      distinct: ['player_id', 'event_id'], // ogni torneo vinto unico
      select: { player_id: true },
    });

    const winsMap = new Map<string, number>();
    for (const w of winsRaw) {
      winsMap.set(w.player_id, (winsMap.get(w.player_id) || 0) + 1);
    }

    // 4️⃣ Recupero info giocatori
    const playerIds = Array.from(new Set([...entriesMap.keys(), ...winsMap.keys()]));
    const playersData = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    const playerInfoMap = new Map<string, { name: string; ioc: string }>(
      playersData.map(p => [
        p.id,
        { name: p.atpname || '(Unknown)', ioc: p.ioc || '' }
      ])
    );

    // 5️⃣ Costruzione array finale
    const allPlayers = Array.from(entriesMap.entries()).map(([player_id, entries]) => {
      const wins = winsMap.get(player_id) || 0;
      const percentage = entries > 0 ? Math.round((wins / entries) * 1000) / 10 : 0;
      const info = playerInfoMap.get(player_id) ?? { name: '(Unknown)', ioc: '' };
      return {
        id: player_id,
        name: info.name,
        ioc: info.ioc,
        entries,
        wins,
        percentage,
      };
    });

    // 6️⃣ Ordinamento top N
    const result = allPlayers
      .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins)
      .slice(0, limitParam);

    // Attach slugs when available
    const ids = result.map(r => String(r.id)).filter(Boolean);
    let finalResultWithSlugs = result;
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      finalResultWithSlugs = result.map(r => ({ ...r, slug: slugMap.get(String(r.id)) ?? null }));
    }

    return NextResponse.json({
      FinalWins: finalResultWithSlugs,
      definition: 'entries = unique tournaments played, wins = tournaments won, percentage = (wins / entries) * 100',
    });

  } catch (error) {
    console.error('[GET /api/final-wins] Error:', error);
    return NextResponse.json(
      { error: process.env.NODE_ENV !== 'production' ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
