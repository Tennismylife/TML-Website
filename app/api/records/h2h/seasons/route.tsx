import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Singleton Prisma per evitare connessioni multiple in dev
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    // Query principale sulla materialized view stagionale
    const rows = await prisma.mVH2HSeason.findMany({
      orderBy: { matches_played: 'desc' },
      take: 200,
    });

    // Normalizzazione output per frontend
    const normalized = rows.map((r) => ({
      year: r.year,
      player1: { id: r.player_1_id, name: r.player_1_name, ioc: r.player_1_ioc ?? '' },
      player2: { id: r.player_2_id, name: r.player_2_name, ioc: r.player_2_ioc ?? '' },
      matches_played: r.matches_played,
    }));

    return NextResponse.json({ h2h_season: normalized });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
