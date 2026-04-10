import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get('id');

  if (!playerId) {
    return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
  }

  try {
    // Find the most recent ranking date globally
    const latestDate = await prisma.rankingDate.findFirst({
      orderBy: { date: 'desc' },
    });

    if (!latestDate) {
      return NextResponse.json({ ranking: null });
    }

    // Check if the player appears in that specific ranking
    const entry = await prisma.ranking.findFirst({
      where: { playerId: String(playerId), rankingDateId: latestDate.id },
      include: { rankingDate: true },
    });

    // Always compute best-ever rank
    const best = await prisma.ranking.aggregate({
      where: { playerId: String(playerId) },
      _min: { rank: true },
    });
    const bestRank = best._min.rank ?? null;

    if (!entry) {
      // Player has ranking history but not in latest table (retired/inactive)
      return NextResponse.json({ ranking: { rank: null, points: null, date: null, bestRank } });
    }

    return NextResponse.json({
      ranking: {
        rank: entry.rank,
        points: entry.points,
        date: entry.rankingDate?.date ? new Date(entry.rankingDate.date).toISOString() : null,
        bestRank,
      },
    });
  } catch (err) {
    console.error('current-ranking error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
