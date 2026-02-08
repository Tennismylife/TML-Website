// /pages/api/records/streak/streaktournaments.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const player_id = url.searchParams.get('player_id');

    // Support repeated params (event_ids=1&event_ids=2) and comma-separated lists
    const eventIdsFromQuery = url.searchParams.getAll('event_ids').flatMap(v => v.split(','));
    const event_ids = Array.from(new Set(eventIdsFromQuery.map(s => s.trim()).filter(Boolean)));

    if (!player_id || event_ids.length === 0) {
      return NextResponse.json({ error: 'Missing player_id or event_ids' }, { status: 400 });
    }

    // Recupera i tornei per quel player e quegli event_id, garantendo unicità
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;

    console.log('[streaktournaments] player_id', player_id);
    console.log('[streaktournaments] event_ids', event_ids);

    // Try to get tournament info directly from Match rows for robustness
    const matches = await prisma.match.findMany({
      where: {
        event_id: { in: event_ids },
        OR: [
          { winner_id: player_id },
          { loser_id: player_id }
        ]
      },
      select: {
        event_id: true,
        tourney_name: true,
        tourney_date: true
      },
      orderBy: { tourney_date: 'asc' },
    });

    // Dedupe by event_id (keep earliest tourney_date) and ensure ordering
    const map = new Map();
    for (const t of matches) {
      const existing = map.get(t.event_id);
      if (!existing) map.set(t.event_id, t);
      else {
        const existingDate = existing.tourney_date ? new Date(existing.tourney_date) : null;
        const tDate = t.tourney_date ? new Date(t.tourney_date) : null;
        if (tDate && (!existingDate || tDate < existingDate)) map.set(t.event_id, t);
      }
    }
    const tournaments = Array.from(map.values()).sort((a, b) => {
      const ad = a.tourney_date ? new Date(a.tourney_date).getTime() : 0;
      const bd = b.tourney_date ? new Date(b.tourney_date).getTime() : 0;
      return ad - bd;
    });

    const formatted = tournaments.map(t => ({
      ...t,
      tourney_date: t.tourney_date instanceof Date ? t.tourney_date.toISOString().slice(0, 10) : t.tourney_date,
    }));

    const formattedSerialized = JSON.stringify(formatted);
    console.log('[streaktournaments] formattedSerialized', formattedSerialized);

    if (url.searchParams.get('debug') === '1') {
      // Exclude null/undefined event_ids to satisfy TypeScript index typing
      const rawIds = Array.from(new Set(matches.map(t => t.event_id).filter((v): v is string => !!v)));
      const counts = rawIds.reduce((acc, id) => {
        acc[id] = matches.filter(t => t.event_id === id).length;
        return acc;
      }, {} as Record<string, number>);
      const formattedIds = formatted.map(t => t.event_id ?? '');
      console.log('[streaktournaments debug] formatted length', formatted.length, 'ids', formattedIds);
      const parsedFromSerialized = JSON.parse(formattedSerialized);
      console.log('[streaktournaments debug] parsedFromSerialized length', parsedFromSerialized.length, 'ids', parsedFromSerialized.map((x:any)=>x.event_id));
      return NextResponse.json({ debug: { event_ids, found: matches.length, uniqueEventIds: event_ids.length, rawIds, counts, formattedCount: formatted.length, formattedIds, formattedSerialized }, tournaments: parsedFromSerialized.slice(0, limit), tournaments_serialized: formattedSerialized });
    }

    // Return both serialized form and parsed array (parsed included for convenience)
    return NextResponse.json({ tournaments: JSON.parse(formattedSerialized).slice(0, limit), tournaments_serialized: formattedSerialized });
  } catch (error: any) {
    console.error(error);
    if (typeof error === 'object' && (new URL(request.url)).searchParams.get('debug') === '1') {
      return NextResponse.json({ error: error?.message ?? String(error), stack: error?.stack ?? null }, { status: 500 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
