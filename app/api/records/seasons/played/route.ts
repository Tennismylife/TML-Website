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

type YearPlayedRecord = {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_played: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');
    const selectedBestOf = getMultiParam(url, 'best_of');
    const selectedRounds = getMultiParam(url, 'round');

    let finalPlayed: YearPlayedRecord[] = [];

    // --- Caso 1: 0 o 1 filtro → usa MV ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length <= 1
    ) {
      const played = await prisma.mVSameSeasonPlayed.findMany({
        orderBy: { total_played: 'desc' },
        take: 500,
      });

      if (!played.length) return jsonResponse([]);

      const playerIds = played.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });

      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      played.forEach(e => {
        let total_played = e.total_played;

        if (selectedSurfaces.length === 1) {
          total_played = e.surface_played?.[selectedSurfaces[0]] ?? 0;
        }
        if (selectedLevels.length === 1) {
          total_played = e.level_played?.[selectedLevels[0]] ?? 0;
        }
        if (selectedBestOf.length === 1) {
          total_played = e.best_of_played?.[selectedBestOf[0]] ?? 0;
        }
        if (selectedRounds.length === 1) {
          total_played = e.round_played?.[selectedRounds[0]] ?? 0;
        }

        if (total_played > 0) {
          const mapEntry = playerMap[e.player_id];
          finalPlayed.push({
            year: e.year,
            player_id: e.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_played,
          });
        }
      });
    }

    // --- Caso 2: ≥2 filtri → query diretta su Match ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length >= 2
    ) {
      const where: any = { status: true };
      if (selectedSurfaces.length > 0) {
        where.surface = { in: selectedSurfaces };
      }
      if (selectedLevels.length > 0) {
        where.tourney_level = { in: selectedLevels };
      }
      if (selectedBestOf.length > 0) {
        where.best_of = { in: selectedBestOf.map(b => Number(b)) };
      }
      if (selectedRounds.length > 0) {
        where.round = { in: selectedRounds };
      }

      const matches = await prisma.match.findMany({
        where,
        select: { winner_id: true, loser_id: true, year: true },
      });

      const groupedMap: Record<string, { player_id: string; year: number; total_played: number }> = {};
      matches.forEach(m => {
        [m.winner_id, m.loser_id].forEach(pid => {
          const key = `${pid}_${m.year}`;
          if (!groupedMap[key]) groupedMap[key] = { player_id: pid, year: m.year, total_played: 0 };
          groupedMap[key].total_played += 1;
        });
      });

      const grouped = Object.values(groupedMap);

      const playerMap = Object.fromEntries(
        (await prisma.player.findMany({
          where: { id: { in: grouped.map(g => g.player_id) } },
          select: { id: true, atpname: true, ioc: true },
        })).map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      finalPlayed.push(
        ...grouped.map(g => {
          const mapEntry = playerMap[g.player_id];
          return {
            year: g.year,
            player_id: g.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_played: g.total_played,
          };
        })
      );
    }

    // Ordinamento top 100
    finalPlayed.sort((a, b) => b.total_played - a.total_played);

    return jsonResponse(finalPlayed.slice(0, 100));
  } catch (error) {
    console.error('GET /records/same/year-played error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}