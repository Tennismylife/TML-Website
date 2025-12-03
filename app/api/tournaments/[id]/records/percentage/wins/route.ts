import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function computePercentage(player: { wins: number; losses: number }) {
  const total = player.wins + player.losses;
  return total > 0 ? (player.wins / total) * 100 : 0;
}

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

    // Conteggio vittorie
    const winners = await prisma.match.groupBy({
      by: ['winner_id', 'winner_name', 'winner_ioc'],
      where: { tourney_id: id },
      _count: { winner_id: true },
    });

    // Conteggio sconfitte
    const losers = await prisma.match.groupBy({
      by: ['loser_id', 'loser_name', 'loser_ioc'],
      where: { tourney_id: id },
      _count: { loser_id: true },
    });

    // Unisci i risultati
    const playerMap = new Map<
      string,
      { id: string; name: string; ioc: string; wins: number; losses: number }
    >();

    for (const w of winners) {
      const key = String(w.winner_id);
      playerMap.set(key, {
        id: String(w.winner_id),
        name: w.winner_name,
        ioc: w.winner_ioc ?? '',
        wins: w._count.winner_id,
        losses: 0,
      });
    }

    for (const l of losers) {
      const key = String(l.loser_id);
      const existing = playerMap.get(key);
      playerMap.set(key, {
        id: String(l.loser_id),
        name: l.loser_name,
        ioc: l.loser_ioc ?? '',
        wins: existing?.wins ?? 0,
        losses: l._count.loser_id,
      });
    }

    // Trasforma in array e calcola percentage
    const sortedOverall = Array.from(playerMap.values())
      .map((p) => ({ ...p, percentage: computePercentage(p) }))
      .sort((a, b) => b.percentage - a.percentage || b.wins - a.wins);

    return NextResponse.json({ sortedOverall });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
