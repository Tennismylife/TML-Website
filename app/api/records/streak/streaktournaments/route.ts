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
    const event_ids_param = url.searchParams.get('event_ids');

    if (!player_id || !event_ids_param) {
      return NextResponse.json({ error: 'Missing player_id or event_ids' }, { status: 400 });
    }

    const event_ids = event_ids_param.split(',');

    // Recupera i tornei per quel player e quegli event_id, garantendo unicità
    const limitParam = Number(url.searchParams.get('limit'));
    const limit = Number.isInteger(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 100;

    const tournaments = await prisma.playerTournament.findMany({
      where: {
        player_id: player_id,
        event_id: { in: event_ids },
      },
      select: {
        event_id: true,
        tourney_name: true,
        tourney_date: true,
        year: true,
        surface: true,
        tourney_level: true,
      },
      distinct: ['event_id'], // <-- garantisce una riga per event_id
      orderBy: { tourney_date: 'asc' },
    });

    const formatted = tournaments.map(t => ({
      ...t,
      tourney_date: t.tourney_date instanceof Date ? t.tourney_date.toISOString().slice(0, 10) : t.tourney_date,
    }));

    return NextResponse.json(formatted.slice(0, limit));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
