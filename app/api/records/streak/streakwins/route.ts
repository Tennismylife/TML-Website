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
    where: { id: { in: ids }, status: true },
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

  // Sort matches by date asc then by round according to tournament progression
  // RR = Round Robin (ATP Finals group stage), must come before SF and F
  const roundOrder: Record<string, number> = { RR: 0, R128: 1, R64: 2, R32: 3, R16: 4, QF: 5, SF: 6, F: 7, '1R': 1, '2R': 2, '3R': 3, '4R': 4, Q: 5, S: 6 };
  matches.sort((a, b) => {
    const da = a.tourney_date ? (a.tourney_date instanceof Date ? a.tourney_date.toISOString() : String(a.tourney_date)) : '';
    const db = b.tourney_date ? (b.tourney_date instanceof Date ? b.tourney_date.toISOString() : String(b.tourney_date)) : '';
    if (da !== db) return String(da).localeCompare(String(db));
    const ra = (a.round && (roundOrder[a.round] !== undefined)) ? roundOrder[a.round] : 999;
    const rb = (b.round && (roundOrder[b.round] !== undefined)) ? roundOrder[b.round] : 999;
    return ra - rb;
  });

  return NextResponse.json(
    matches.map(m => ({
      id: m.id,
      tourney_date: m.tourney_date ? m.tourney_date.toISOString().slice(0, 10) : '',
      tourney_name: m.tourney_name ?? '',
      opponent_name: m.loser_name ?? '',
      score: m.score ?? '',
      loser_ioc: m.loser_ioc ?? '',
      round: m.round ?? ''
    }))
  );
}
