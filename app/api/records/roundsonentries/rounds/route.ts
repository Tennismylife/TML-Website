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
    const limitParam = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    if (!targetRound) {
      return NextResponse.json({ error: 'Missing round parameter' }, { status: 400 });
    }

    // Filtri comuni
    const baseFilters = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // Conteggio entries uniche player_id-event_id (una sola entry per event_id)
    const uniqueEntries = await prisma.playerTournament.groupBy({
      by: ['player_id', 'event_id'],
      where: baseFilters,
    });

    // Defensive dedupe: in case DB returns duplicate pairs, count only unique (player,event)
    const seen = new Set<string>();
    const entriesCountMap = new Map<string, number>();
    // optional debug map listing event ids per player
    const entriesEventsMap = new Map<string, Set<string>>();
    uniqueEntries.forEach(e => {
      const pid = String((e as any).player_id);
      const eid = String((e as any).event_id);
      const key = `${pid}::${eid}`;
      if (seen.has(key)) return;
      seen.add(key);
      entriesCountMap.set(pid, (entriesCountMap.get(pid) || 0) + 1);
      if (!entriesEventsMap.has(pid)) entriesEventsMap.set(pid, new Set());
      entriesEventsMap.get(pid)!.add(eid);
    });

    // Conteggio round raggiunto filtrato (eventi distinti)
    // Raggruppiamo per player_id ed event_id per assicurarci di contare ciascun torneo
    // una sola volta anche se ci sono più righe per lo stesso evento.
    const roundPairs = await prisma.playerTournament.groupBy({
      by: ['player_id', 'event_id'],
      where: { ...baseFilters, round: targetRound },
    });
    const roundMap: Map<string, number> = new Map<string, number>();
    // optional debug map listing event ids where the round was reached
    const roundEventsMap = new Map<string, Set<string>>();
    roundPairs.forEach(r => {
      const pid = String(r.player_id);
      const eid = String(r.event_id);
      roundMap.set(pid, (roundMap.get(pid) || 0) + 1);
      if (!roundEventsMap.has(pid)) roundEventsMap.set(pid, new Set());
      roundEventsMap.get(pid)!.add(eid);
    });

    const playerIds: string[] = Array.from(
      new Set<string>([...entriesCountMap.keys(), ...roundMap.keys()].map(String))
    );

    // Recupera info giocatori
    const playersData = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    type PlayerInfo = { name: string; ioc: string };
    const playerInfoMap = new Map<string, PlayerInfo>(playersData.map(p => [
      String(p.id),
      { name: p.atpname || '(Unknown)', ioc: p.ioc || '' }
    ]));

    const debugMode = url.searchParams.get('debug') === '1' || url.searchParams.get('debug') === 'true';

    // Costruisci array finale
    const allPlayers = playerIds.map(player_id => {
      const entries: number = entriesCountMap.get(player_id) || 0;
      const wins: number = roundMap.get(player_id) || 0;
      const rawPercentage = entries > 0 ? Math.round((wins / entries) * 1000) / 10 : 0;
      const percentage = Math.min(100, rawPercentage);
      if (rawPercentage > 100) console.warn(`[roundsonentries] percentage > 100 for player ${player_id}: ${rawPercentage} (capped to 100)`);
      const info = playerInfoMap.get(player_id) || { name: '(Unknown)', ioc: '' };
      const base = { id: player_id, name: info.name, ioc: info.ioc, entries, wins, percentage } as any;
      if (debugMode) {
        base.entryEventIds = Array.from(entriesEventsMap.get(player_id) || []);
        base.winEventIds = Array.from(roundEventsMap.get(player_id) || []);
      }
      return base;
    });

    // Ordina per percentuale, poi per wins, poi per entries
    const result = allPlayers
      .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins || b.entries - a.entries)
      .slice(0, limitParam);

    // Attach slugs when available
    const ids = result.map(r => String(r.id)).filter(Boolean);
    let finalResultWithSlugs = result;
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      finalResultWithSlugs = result.map(r => ({ ...r, slug: slugMap.get(String(r.id)) ?? null }));
    }

    const payload: any = {
      targetRound,
      FinalWins: finalResultWithSlugs,
      definition: `entries = unique tournaments played, wins = tournaments where player reached ${targetRound}, percentage = 100 × (wins / entries)`,
    };
    if (debugMode) {
      // attach map of events per player for debugging
      payload.debug = {
        entries: Object.fromEntries(Array.from(entriesEventsMap.entries()).map(([k, s]) => [k, Array.from(s)])),
        wins: Object.fromEntries(Array.from(roundEventsMap.entries()).map(([k, s]) => [k, Array.from(s)])),
      };
    }

    return NextResponse.json(payload);

  } catch (error) {
    console.error('[GET /api/roundsonentries/rounds] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
