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
    const tournaments = await prisma.playerTournament.findMany({
      where: {
        player_id: player_id,
        event_id: { in: event_ids },
      },
      select: {
        event_id: true,
        tourney_name: true,
        year: true,
        surface: true,
        tourney_level: true,
      },
      distinct: ['event_id'], // <-- garantisce una riga per event_id
      orderBy: { year: 'asc' },
    });

    return NextResponse.json(tournaments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
