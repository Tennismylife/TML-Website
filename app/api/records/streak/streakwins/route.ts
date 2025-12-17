import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids');
  if (!idsParam) return NextResponse.json([]);

  const ids = idsParam
    .split(',')
    .map(Number)
    .filter(Boolean);

  const matches = await prisma.match.findMany({
    where: { id: { in: ids } },
    orderBy: [
      { tourney_date: 'asc' },
      { id: 'asc' }
    ],
    select: {
      id: true,
      tourney_date: true,
      tourney_name: true,
      round: true,
      score: true,
      winner_name: true,
      loser_name: true,
      loser_ioc: true,
    },
  });

  return NextResponse.json(
    matches.map(m => ({
      id: m.id,
      tourney_date: m.tourney_date.toISOString().slice(0, 10),
      tourney_name: m.tourney_name,
      opponent_name: m.loser_name,
      score: m.score,
      loser_ioc: m.loser_ioc,
      round: m.round
    }))
  );
}
