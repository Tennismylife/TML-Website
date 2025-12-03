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

    let finalWins: YearWinRecord[] = [];

    // --- Caso 1: 0 o 1 filtro → usa MV ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length <= 1
    ) {
      const wins = await prisma.mVSameSeasonWins.findMany({
        orderBy: { total_wins: 'desc' },
        take: 500,
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
        let total_wins = e.total_wins;
        let surface: string | null = null;
        let level: string | null = null;
        let best_of: string | null = null;
        let round: string | null = null;

        if (selectedSurfaces.length === 1) {
          surface = selectedSurfaces[0];
          total_wins = e.surface_wins?.[surface] ?? 0;
        }
        if (selectedLevels.length === 1) {
          level = selectedLevels[0];
          total_wins = e.level_wins?.[level] ?? 0;
        }
        if (selectedBestOf.length === 1) {
          best_of = selectedBestOf[0];
          total_wins = e.best_of_wins?.[best_of] ?? 0;
        }
        if (selectedRounds.length === 1) {
          round = selectedRounds[0];
          total_wins = e.round_wins?.[round] ?? 0;
        }

        if (total_wins > 0) {
          const mapEntry = playerMap[e.player_id];
          finalWins.push({
            year: e.year,
            player_id: e.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_wins,
            surface,
            tourney_level: level,
            best_of,
            round,
          });
        }
      });
    }

    // --- Caso 2: ≥2 filtri → query diretta su Match ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length >= 2
    ) {
      const where: any = { status: true };
      if (selectedSurfaces.length === 1) where.surface = selectedSurfaces[0];
      if (selectedLevels.length === 1) where.tourney_level = selectedLevels[0];
      if (selectedBestOf.length === 1) where.best_of = Number(selectedBestOf[0]);
      if (selectedRounds.length === 1) where.round = selectedRounds[0];

      const matches = await prisma.match.findMany({
        where,
        select: { winner_id: true, year: true, surface: true, tourney_level: true, best_of: true, round: true },
      });

      const groupedMap: Record<string, { player_id: string; year: number; total_wins: number }> = {};
      matches.forEach(m => {
        const key = `${m.winner_id}_${m.year}`;
        if (!groupedMap[key]) groupedMap[key] = { player_id: m.winner_id, year: m.year, total_wins: 0 };
        groupedMap[key].total_wins += 1;
      });

      const grouped = Object.values(groupedMap);

      const playerMap = Object.fromEntries(
        (await prisma.player.findMany({
          where: { id: { in: grouped.map(g => g.player_id) } },
          select: { id: true, atpname: true, ioc: true },
        })).map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      finalWins.push(
        ...grouped.map(g => {
          const mapEntry = playerMap[g.player_id];
          return {
            year: g.year,
            player_id: g.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_wins: g.total_wins,
            surface: selectedSurfaces[0] ?? null,
            tourney_level: selectedLevels[0] ?? null,
            best_of: selectedBestOf[0] ?? null,
            round: selectedRounds[0] ?? null,
          };
        })
      );
    }

    // Ordinamento top 100
    finalWins.sort((a, b) => b.total_wins - a.total_wins);

    return jsonResponse(finalWins.slice(0, 100));
  } catch (error) {
    console.error('GET /records/same/year-wins error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
