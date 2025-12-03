import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

interface Player {
  id: string;
  name: string;
  ioc: string;
}

interface H2HTourney {
  tourney_id: string;
  tourney_name: string; // opzionale, se disponibile
  year?: number;
  player1: Player;
  player2: Player;
  matches_played: number;
}

export async function GET(request: NextRequest) {
  try {
    const rows = await prisma.mVH2HTourney.findMany({
      orderBy: { matches_played: 'desc' },
      take: 200,
      select: {
        tourney_id: true,
        tourney_name: true,  // se la tua view include il nome
        player_1_id: true,
        player_1_name: true,
        player_1_ioc: true,
        player_2_id: true,
        player_2_name: true,
        player_2_ioc: true,
        matches_played: true,
      },
    });

    const normalized: H2HTourney[] = rows.map((r) => ({
      tourney_id: r.tourney_id,
      tourney_name: r.tourney_name ?? '',
      player1: { id: r.player_1_id, name: r.player_1_name, ioc: r.player_1_ioc ?? '' },
      player2: { id: r.player_2_id, name: r.player_2_name, ioc: r.player_2_ioc ?? '' },
      matches_played: r.matches_played,
    }));

    return NextResponse.json({ h2h_tourney: normalized });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
