import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');

    const q = request.nextUrl.searchParams;
    const idsParam = q.get('ids') || '';
    const ids = idsParam.split(',').map(s => Number(s)).filter(n => Number.isFinite(n));
    if (!ids.length) return NextResponse.json([]);

    const matches = await prisma.match.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        tourney_date: true,
        tourney_name: true,
        round: true,
        winner_id: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        score: true,
      },
      orderBy: { tourney_date: 'asc' as const },
    });

    const transformed = matches.map(m => ({
      id: m.id,
      tourney_date: m.tourney_date instanceof Date ? m.tourney_date.toISOString().split('T')[0] : (m.tourney_date ?? null),
      tourney_name: m.tourney_name ?? '',
      round: m.round ?? '',
      opponent_name: m.loser_name ?? '',
      loser_ioc: m.loser_ioc ?? null,
      score: m.score ?? '',
    }));

    return NextResponse.json(transformed);
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
