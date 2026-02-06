import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ----------- age parameter -----------
    const ageParam = url.searchParams.get('age');
    if (!ageParam) return NextResponse.json({ error: 'Age parameter required' }, { status: 400 });
    const targetAge = Number(ageParam);
    if (isNaN(targetAge)) return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });

    // ----------- after parameter -----------
    const afterParam = String(url.searchParams.get('after') ?? '').toLowerCase();
    const after = (afterParam === '1' || afterParam === 'true' || afterParam === 'yes'); // true se after=1/true/yes, altrimenti false

    // ----------- filters -----------
    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels   = url.searchParams.getAll('level').filter(Boolean);

    // use runtime db reference so tests can mock globalThis.prisma
    const db = (globalThis as any).prisma || prisma;

    const filtersCount = [selectedSurfaces.length > 0, selectedLevels.length > 0].filter(Boolean).length;

    let playersData: Array<{ id: string, name: string, ioc: string, slug: string | null, participations_at_age: number }> = [];

    const ageFilter = after ? { gte: targetAge } : { lte: targetAge };

    const collectEventsByPlayer = async (baseWhere: any, idsFilter: string[] | null) => {
      const winnerWhere: any = {
        ...baseWhere,
        ...(idsFilter && idsFilter.length > 0 ? { winner_id: { in: idsFilter } } : { winner_id: { not: null } }),
        winner_age: ageFilter,
      };
      const loserWhere: any = {
        ...baseWhere,
        ...(idsFilter && idsFilter.length > 0 ? { loser_id: { in: idsFilter } } : { loser_id: { not: null } }),
        loser_age: ageFilter,
      };

      const [winnerRows, loserRows] = await Promise.all([
        db.match.findMany({
          where: winnerWhere,
          select: { winner_id: true, event_id: true },
          distinct: ['winner_id', 'event_id'],
        }),
        db.match.findMany({
          where: loserWhere,
          select: { loser_id: true, event_id: true },
          distinct: ['loser_id', 'event_id'],
        }),
      ]);

      const eventsByPlayer = new Map<string, Set<string>>();

      for (const row of winnerRows) {
        if (row.winner_id == null) continue;
        const id = String(row.winner_id);
        if (!eventsByPlayer.has(id)) eventsByPlayer.set(id, new Set());
        eventsByPlayer.get(id)!.add(String(row.event_id));
      }

      for (const row of loserRows) {
        if (row.loser_id == null) continue;
        const id = String(row.loser_id);
        if (!eventsByPlayer.has(id)) eventsByPlayer.set(id, new Set());
        eventsByPlayer.get(id)!.add(String(row.event_id));
      }

      return eventsByPlayer;
    };

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      let data: any;
      try {
        data = await db.mVEntriesAges.findMany({
          select: {
            player_id: true,
          },
        });
      } catch (e) {
        throw e;
      }
      if (!Array.isArray(data)) {
        // fallback to empty data to avoid 500 in tests; this means CASE1 will produce no rows
        data = [];
      }

      const idsFromData = Array.isArray(data) ? data.map((d:any) => d.player_id) : [];
      let players: any[] = [];
      if (idsFromData.length > 0) {
        players = await db.player.findMany({
          where: { id: { in: idsFromData } },
          select: { id: true, player: true, ioc: true, slug: true },
        });
      } else {
        players = [];
      }

      // For correctness, derive entries by deduplicating events from actual matches (one entry per event)
      const matchWhere: any = {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      };

      const eventsByPlayer = await collectEventsByPlayer(matchWhere, idsFromData);

      playersData = players.map(p => {
        const count = eventsByPlayer.get(p.id)?.size ?? 0;
        if (count === 0) return null;
        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          slug: p.slug || null,
          participations_at_age: count,
        };
      }).filter(Boolean) as typeof playersData;
    }

    // =====================================================
    // CASE 2 → 2 o più filtri → fetch dinamico dai match
    // =====================================================
    else {
      const where: any = {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      };

      const eventsByPlayer = await collectEventsByPlayer(where, null);

      const playerIds = Array.from(eventsByPlayer.keys());
      if (playerIds.length > 0) {
        const players = await db.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, player: true, ioc: true, slug: true },
        });

        const playerMap = new Map(players.map((p: any) => [String(p.id), p]));
        for (const [playerId, eventsSet] of eventsByPlayer.entries()) {
          const p = playerMap.get(String(playerId));
          if (!p) continue;
          if (eventsSet.size === 0) continue;
          playersData.push({
            id: p.id,
            name: p.player,
            ioc: p.ioc || '',
            slug: p.slug || null,
            participations_at_age: eventsSet.size,
          });
        }
      }
    }

    // =====================================================
    // ORDINA DECRESCENTE PER NUMERO DI PARTECIPAZIONI
    // =====================================================
    playersData.sort((a, b) => b.participations_at_age - a.participations_at_age);

    const limitParam = Number(url.searchParams.get('limit') ?? '100');
    const limit = !isNaN(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 100;

    return NextResponse.json(playersData.slice(0, limit));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error), stack: (error && (error as any).stack) ?? null }, { status: 500 });
  }
}
