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

    const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(String(id));
    if (!tourneyIds) return NextResponse.json({ roundItems: [] });

    // Recupera tutte le partite del torneo
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    // Add tourney_id so we can canonicalize (treat '581' as '580') when needed
    const matches = await prisma.match.findMany({
      where: { OR: tourneyIdFilters },
      select: {
        tourney_id: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
      },
    });

    // Resolve canonical tourney id for the requested param (e.g., '581' -> '580')
    const canonicalParam = await (await import('@/lib/tournament')).resolveCanonicalTourneyId(String(id));

    // We'll treat matches whose numeric tourney id resolves to '581' as '580' by mapping
    // their numeric part before using them for winner detection or any canonical checks.

    // ───────────────────────────────────────────────
    //  COSTRUZIONE: round => player => count
    // ───────────────────────────────────────────────

    const roundMap = new Map<
      string,
      Map<string, { id: string | number; name: string; ioc: string; count: number }>
    >();

    for (const m of matches) {
      // Canonicalize numeric tourney id: '1977-581' or '581' -> numericPart '581' -> canonical '580'
      const rawTourney = String(m.tourney_id || '');
      const parts = rawTourney.split('-');
      let numericTourney = parts[parts.length - 1];
      if (numericTourney === '581') numericTourney = '580';

      // We only count matches that belong to the canonical tourney (defensive; should be true)
      if (canonicalParam && String(numericTourney) !== String(canonicalParam)) continue;

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
      const sorted = Array.from(players.values()).sort((a, b) => {
        // Neutral comparator: sort by descending count, then id
        if (b.count !== a.count) return b.count - a.count;
        return String(a.id).localeCompare(String(b.id));
      });

      // Simple behavior: top 10 only (no winner-specific logic)
      const top = sorted.slice(0, 10);

      // Modal: full list per round richiesto
      if (fullRequested && requestedRound === round) {
        return NextResponse.json({
          roundItems: [
            {
              title: round,
              list: top,
              fullList: sorted,
            },
          ],
        });
      }

      // Primo caricamento (overview) → top (may be >10 to include winners)
      roundItems.push({
        title: round,
        list: top,
      });
    }

    return NextResponse.json({ roundItems });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
