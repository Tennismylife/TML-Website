import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient();
}
prisma = globalThis.prisma;

function getMultiParam(url: URL, key: string): string[] {
  return url.searchParams
    .getAll(key)
    .flatMap(v => v.split(','))
    .map(s => s.trim())
    .filter(Boolean);
}

function cacheHeaders() {
  return { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' };
}

function jsonResponse(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: cacheHeaders() });
}

type YearWinRecord = {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_wins: number;
  surface?: string | null;
  tourney_level?: string | null;
  best_of?: string | null;
  round?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');
    const selectedBestOf = getMultiParam(url, 'best_of');
    const selectedRounds = getMultiParam(url, 'round');
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    let finalWins: YearWinRecord[] = [];

    const totalFilters = selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length;

    // --- Caso 0 filtri → usa MV (rapido, già aggregato) ---
    if (totalFilters === 0) {
      const wins = await prisma.mVSameSeasonWins.findMany({
        orderBy: { total_wins: 'desc' },
        take: limit,
      });

      if (!wins.length) return jsonResponse([]);

      const playerIds = wins.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });

      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      wins.forEach(e => {
        const mapEntry = playerMap[e.player_id];
        finalWins.push({
          year: e.year,
          player_id: e.player_id,
          player_name: mapEntry?.player_name ?? 'Unknown',
          ioc: mapEntry?.ioc ?? null,
          total_wins: e.total_wins,
          surface: null,
          tourney_level: null,
          best_of: null,
          round: null,
        });
      });
    }

    // --- 1+ filtri → query diretta su Match con groupBy per anno+giocatore ---
    // (evita il bug della MV che ordina per vittorie totali anziché per le vittorie
    //  nel filtro selezionato, escludendo così giocatori che dominano un livello
    //  specifico ma non la classifica totale)
    if (totalFilters >= 1) {
      const where: any = { status: true };
      if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
      if (selectedLevels.length > 0) where.tourney_level = { in: selectedLevels };
      if (selectedBestOf.length > 0) where.best_of = { in: selectedBestOf.map(Number) };
      if (selectedRounds.length > 0) where.round = { in: selectedRounds };

      const grouped = await prisma.match.groupBy({
        by: ['winner_id', 'year'],
        where,
        _count: { winner_id: true },
        orderBy: { _count: { winner_id: 'desc' } },
        take: limit,
      });

      if (grouped.length > 0) {
        const playerIds = Array.from(new Set(grouped.map(g => String(g.winner_id)).filter(Boolean)));
        const players = await prisma.player.findMany({
          where: { id: { in: playerIds } },
          select: { id: true, atpname: true, ioc: true },
        });
        const playerMap = Object.fromEntries(
          players.map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
        );

        finalWins = grouped.map(g => {
          const mapEntry = playerMap[String(g.winner_id)];
          return {
            year: g.year ?? 0,
            player_id: String(g.winner_id),
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_wins: g._count.winner_id,
            surface: selectedSurfaces[0] ?? null,
            tourney_level: selectedLevels[0] ?? null,
            best_of: selectedBestOf[0] ?? null,
            round: selectedRounds[0] ?? null,
          };
        });
      }
    }

    // Ordinamento top 100
    finalWins.sort((a, b) => b.total_wins - a.total_wins);

    // Attach slugs when available
    const ids = Array.from(new Set(finalWins.map(p => String(p.player_id))));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      finalWins = finalWins.map(p => ({ ...p, slug: slugMap.get(String(p.player_id)) ?? null, winner_slug: slugMap.get(String(p.player_id)) ?? null }));
    }

    return jsonResponse(finalWins.slice(0, limit));
  } catch (error) {
    console.error('GET /records/same/year-wins error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
