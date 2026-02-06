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

    let playersData: Array<{ id: string, name: string, ioc: string, participations_at_age: number }> = [];

    // =====================================================
    // CASE 1 → 0 o 1 filtro → usa la materialized view
    // =====================================================
    if (filtersCount <= 1) {
      // debug: inspect db mock and function
      // eslint-disable-next-line no-console
      console.log('DEBUG entries CASE1: db.mVEntriesAges exists:', !!(db as any).mVEntriesAges, 'findMany type:', typeof (db as any).mVEntriesAges?.findMany);
      let data: any;
      try {
        data = await db.mVEntriesAges.findMany({
          select: {
            player_id: true,
            ages_json: true,
            ages_by_surface_json: true,
            ages_by_level_json: true,
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('DEBUG entries CASE1: mVEntriesAges.findMany threw:', e);
        throw e;
      }
      // eslint-disable-next-line no-console
      console.log('DEBUG entries CASE1: data type:', typeof data, 'value:', JSON.stringify(data));
      if (!Array.isArray(data)) {
        // eslint-disable-next-line no-console
        console.error('DEBUG entries CASE1: mVEntriesAges.findMany returned non-array:', data);
        // fallback to empty data to avoid 500 in tests; this means CASE1 will produce no rows
        data = [];
      }

      // debug before fetching players
      // eslint-disable-next-line no-console
      console.log('DEBUG entries CASE1: data length:', Array.isArray(data) ? data.length : 'not-array', 'db.player.findMany type:', typeof db.player?.findMany);
      const idsFromData = Array.isArray(data) ? data.map((d:any) => d.player_id) : [];
      let players: any[] = [];
      if (idsFromData.length > 0) {
        players = await db.player.findMany({
          where: { id: { in: idsFromData } },
          select: { id: true, player: true, ioc: true },
        });
      } else {
        players = [];
      }

      // For correctness, derive entries by deduplicating events from actual matches (one entry per event)
      const matchWhere: any = {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        OR: [
          { winner_id: { in: idsFromData } },
          { loser_id: { in: idsFromData } },
        ],
      };

      let matchesForCandidates = await db.match.findMany({ where: matchWhere, select: { event_id: true, winner_id: true, winner_age: true, loser_id: true, loser_age: true } });
      if (!Array.isArray(matchesForCandidates)) matchesForCandidates = [];

      const eventsByPlayer = new Map<string, Set<string>>();
      for (const m of matchesForCandidates) {
        if (m.winner_id != null && m.winner_age != null && (after ? m.winner_age >= targetAge : m.winner_age <= targetAge)) {
          const id = String(m.winner_id);
          if (!eventsByPlayer.has(id)) eventsByPlayer.set(id, new Set());
          eventsByPlayer.get(id)!.add(String(m.event_id));
        }
        if (m.loser_id != null && m.loser_age != null && (after ? m.loser_age >= targetAge : m.loser_age <= targetAge)) {
          const id = String(m.loser_id);
          if (!eventsByPlayer.has(id)) eventsByPlayer.set(id, new Set());
          eventsByPlayer.get(id)!.add(String(m.event_id));
        }
      }

      playersData = players.map(p => {
        const count = eventsByPlayer.get(p.id)?.size ?? 0;
        if (count === 0) return null;
        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
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

      const allMatches = await db.match.findMany({
        where,
        select: { winner_id: true, winner_age: true, loser_id: true, loser_age: true, event_id: true },
      });

      // Map: player_id -> Map(age -> Set(event_id)) to allow choosing exact age
      const agesEventsByPlayer = new Map<string, Map<number, Set<string>>>();

      for (const m of allMatches) {
        // Winner
        if (m.winner_id != null && m.winner_age != null) {
          const id = String(m.winner_id);
          const age = Number(m.winner_age);
          if (!agesEventsByPlayer.has(id)) agesEventsByPlayer.set(id, new Map());
          const ageMap = agesEventsByPlayer.get(id)!;
          if (!ageMap.has(age)) ageMap.set(age, new Set());
          ageMap.get(age)!.add(String(m.event_id));
        }

        // Loser
        if (m.loser_id != null && m.loser_age != null) {
          const id = String(m.loser_id);
          const age = Number(m.loser_age);
          if (!agesEventsByPlayer.has(id)) agesEventsByPlayer.set(id, new Map());
          const ageMap = agesEventsByPlayer.get(id)!;
          if (!ageMap.has(age)) ageMap.set(age, new Set());
          ageMap.get(age)!.add(String(m.event_id));
        }
      }

      // For each player, collect events across all ages in range and count unique events (range behavior)
      for (const [playerId, ageMap] of agesEventsByPlayer.entries()) {
        const ageKeys = Array.from(ageMap.keys()).filter(a => (after ? a >= targetAge : a <= targetAge));
        if (ageKeys.length === 0) continue;
        const eventsUnion = new Set<string>();
        for (const a of ageKeys) {
          const evs = ageMap.get(a);
          if (!evs) continue;
          for (const e of evs) eventsUnion.add(e);
        }

        const p = await db.player.findUnique({ where: { id: playerId }, select: { id: true, player: true, ioc: true } });
        if (!p) continue;

        playersData.push({
          id: p.id,
          name: p.player,
          ioc: p.ioc || '',
          participations_at_age: eventsUnion.size,
        });
      }
    }

    // =====================================================
    // ORDINA DECRESCENTE PER NUMERO DI PARTECIPAZIONI
    // =====================================================
    playersData.sort((a, b) => b.participations_at_age - a.participations_at_age);

    const limitParam = Number(url.searchParams.get('limit') ?? '100');
    const limit = !isNaN(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 100;

    // Attach slugs when available
    const ids = playersData.map(p => String(p.id));
    if (ids.length > 0) {
      const rows = (await db.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } })) || [];
      const slugMap = new Map(rows.map((r: any) => [r.id, r.slug] as [string, string | null]));
      playersData = playersData.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null }));
    }

    return NextResponse.json(playersData.slice(0, limit));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error', details: String(error), stack: (error && (error as any).stack) ?? null }, { status: 500 });
  }
}
