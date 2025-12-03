import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const url = new URL(request.url);
    const fullRequested = url.searchParams.get('full') === 'true';
    const requestedRound = url.searchParams.get('round'); // es. "R16"

    // Recupera tutte le partite del torneo
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
    });

    // ───────────────────────────────────────────────
    //  COSTRUZIONE: round => player => count
    // ───────────────────────────────────────────────

    const roundMap = new Map<
      string,
      Map<string, { id: string | number; name: string; ioc: string; count: number }>
    >();

    for (const m of matches) {
      const round = m.round || 'Unknown';

      if (!roundMap.has(round)) roundMap.set(round, new Map());
      const players = roundMap.get(round)!;

      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const prev = players.get(key);
        players.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          count: (prev?.count ?? 0) + 1,
        });
      }

      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const prev = players.get(key);
        players.set(key, {
          id: m.loser_id,
          name: m.loser_name,
          ioc: m.loser_ioc ?? '',
          count: (prev?.count ?? 0) + 1,
        });
      }
    }

    // Order rounds
    const order = ['R128', 'R64', 'R32', 'R16', 'QF', 'SF', 'F'];
    const sortedRounds = Array.from(roundMap.keys()).sort(
      (a, b) => order.indexOf(a) - order.indexOf(b)
    );

    // ───────────────────────────────────────────────
    //  COSTRUISCI RISPOSTA
    // ───────────────────────────────────────────────

    let roundItems: any[] = [];

    for (const round of sortedRounds) {
      const players = roundMap.get(round)!;
      const sorted = Array.from(players.values()).sort((a, b) => b.count - a.count);
      const top10 = sorted.slice(0, 10);

      // Modal: full list per round richiesto
      if (fullRequested && requestedRound === round) {
        return NextResponse.json({
          roundItems: [
            {
              title: round,
              list: top10,
              fullList: sorted,
            },
          ],
        });
      }

      // Primo caricamento (overview) → SOLO top10
      roundItems.push({
        title: round,
        list: top10,
      });
    }

    return NextResponse.json({ roundItems });
  } catch (error) {
    console.error('Error fetching rounds records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
