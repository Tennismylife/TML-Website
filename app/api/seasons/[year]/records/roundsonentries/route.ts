import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // Recupera parametri dal contesto
    const params = context?.params ?? {};
    const yearRaw = String(params.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }
    const url = new URL(request.url);

    // Filtri opzionali
    const selectedSurfaces = (url.searchParams.get('surfaces')?.split(',').filter(Boolean)) || [];
    const selectedLevels = (url.searchParams.get('levels')?.split(',').filter(Boolean)) || [];

    // Ordine dei round di interesse
    const roundOrder = ["W", "F", "SF", "QF", "R16", "R32"];

    // Fetch dei match dal DB
    const allMatches = await prisma.match.findMany({
      where: {
        year: year,
        ...(selectedSurfaces.length && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length && { tourney_level: { in: selectedLevels } }),
      },
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

    // Calcolo delle partecipazioni totali per giocatore
    const uniqueTourneysPerPlayer = new Map<string, Set<string>>();
    for (const m of allMatches) {
      for (const p of [
        { id: m.winner_id, ioc: m.winner_ioc },
        { id: m.loser_id, ioc: m.loser_ioc }
      ]) {
        if (!p.id) continue;
        const key = String(p.id);
        if (!uniqueTourneysPerPlayer.has(key)) uniqueTourneysPerPlayer.set(key, new Set());
        uniqueTourneysPerPlayer.get(key)!.add(m.tourney_id);
      }
    }
    const playerTotalEntries = new Map<string, number>();
    for (const [playerId, tourneys] of uniqueTourneysPerPlayer) {
      playerTotalEntries.set(playerId, tourneys.size);
    }

    // Risultati per round
    const result: Record<string, { id: string | number; name: string; ioc: string; reaches: number; totalEntries: number; percentage: number }[]> = {};

    for (const round of roundOrder) {
      let matchesInRound: typeof allMatches;

      if (round === "W") {
        // Vincitori del torneo = vincitori della finale
        matchesInRound = allMatches.filter(m => m.round === "F");
      } else {
        matchesInRound = allMatches.filter(m => m.round === round);
      }

      const playerReaches = new Map<string, { id: string | number; name: string; ioc: string; reaches: number }>();

      for (const m of matchesInRound) {
        if (round === "W") {
          const p = { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc };
          if (!p.id) continue;
          const key = String(p.id);
          if (!playerReaches.has(key)) playerReaches.set(key, { id: p.id, name: p.name ?? 'Unknown', ioc: p.ioc ?? '', reaches: 0 });
          playerReaches.get(key)!.reaches += 1;
        } else {
          for (const p of [
            { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc },
            { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc }
          ]) {
            if (!p.id) continue;
            const key = String(p.id);
            if (!playerReaches.has(key)) playerReaches.set(key, { id: p.id, name: p.name ?? 'Unknown', ioc: p.ioc ?? '', reaches: 0 });
            playerReaches.get(key)!.reaches += 1;
          }
        }
      }

      // Mappa a totale partecipazioni e percentuale
      const players = Array.from(playerReaches.values()).map(p => {
        const total = playerTotalEntries.get(String(p.id)) || 0;
        return {
          ...p,
          totalEntries: total,
          percentage: total ? (p.reaches / total) * 100 : 0
        };
      }).sort((a, b) => b.percentage - a.percentage);

      result[round] = players;
    }

    // Ordina i round secondo roundOrder, con W primo
    const orderedResult: Record<string, typeof result[string]> = {};
    for (const round of roundOrder) {
      if (result[round]) {
        orderedResult[round] = result[round];
      }
    }

    return NextResponse.json({ rounds: orderedResult });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
