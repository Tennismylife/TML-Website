import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper calcola percentage
function computePercentage(player: { wins: number; losses: number }) {
  const total = player.wins + player.losses;
  return total > 0 ? (player.wins / total) * 100 : 0;
}

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

    const matches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
      },
      orderBy: { tourney_date: 'desc' },
    });

    if (!matches.length) return NextResponse.json({ allRoundItems: [] });

    // --- Per round ---
    const roundMap = new Map<string, Map<string, { id: string | number; name: string; ioc: string; wins: number; losses: number }>>();
    for (const m of matches) {
      const round = m.round || 'Unknown';
      if (!roundMap.has(round)) roundMap.set(round, new Map());
      const players = roundMap.get(round)!;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = players.get(key);
        players.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          wins: (existing?.wins ?? 0) + 1,
          losses: existing?.losses ?? 0,
        });
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = players.get(key);
        players.set(key, {
          id: m.loser_id,
          name: m.loser_name,
          ioc: m.loser_ioc ?? '',
          wins: existing?.wins ?? 0,
          losses: (existing?.losses ?? 0) + 1,
        });
      }
    }

    const allRoundItems = Array.from(roundMap.entries())
      .map(([round, playersMap]) => {
        const list = Array.from(playersMap.values()).map((p) => ({
          ...p,
          percentage: computePercentage(p),
        }));
        return {
          title: round,
          fullList: list.sort((a, b) => b.percentage - a.percentage),
        };
      })
      .sort((a, b) => {
        const order = ["F", "SF", "QF", "R16", "R32", "R64", "R128"];
        const ia = order.indexOf(a.title);
        const ib = order.indexOf(b.title);
        return (ia === -1 ? 100 : ia) - (ib === -1 ? 100 : ib);
      });

    return NextResponse.json({ allRoundItems });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
