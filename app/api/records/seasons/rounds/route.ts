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

type SeasonRoundRecord = {
  year: number;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_rounds: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');
    const selectedRounds = getMultiParam(url, 'round');

    let finalRounds: SeasonRoundRecord[] = [];

    // --- Caso 1: 0 o 1 filtro → usa MV ---
    if (selectedSurfaces.length + selectedLevels.length + selectedRounds.length <= 1) {
      const rounds = await prisma.mVSameSeasonRounds.findMany({
        orderBy: { total_rounds: 'desc' },
        take: 500,
      });

      if (!rounds.length) return jsonResponse([]);

      const playerIds = rounds.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });

      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      rounds.forEach(e => {
        let total_rounds = e.total_rounds;

        if (selectedSurfaces.length === 1) {
          const surface = selectedSurfaces[0];
          total_rounds = e.surface_totals?.[surface] ?? 0;
        }

        if (selectedLevels.length === 1) {
          const level = selectedLevels[0];
          total_rounds = e.level_totals?.[level] ?? 0;
        }

        if (selectedRounds.length === 1) {
          const round = selectedRounds[0];
          total_rounds = e.round_totals?.[round] ?? 0;
        }

        if (total_rounds > 0) {
          const mapEntry = playerMap[e.player_id];
          finalRounds.push({
            year: e.year,
            player_id: e.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_rounds,
          });
        }
      });
    }

    // --- Caso 2: ≥2 filtri → query diretta su Match ---
    if (selectedSurfaces.length + selectedLevels.length + selectedRounds.length >= 2) {
      const where: any = { status: true };

      if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
      if (selectedLevels.length > 0) where.tourney_level = { in: selectedLevels };
      if (selectedRounds.length > 0) where.round = { in: selectedRounds };

      const matches = await prisma.match.findMany({
        where,
        select: { winner_id: true, loser_id: true, year: true },
      });

      const groupedMap: Record<string, { player_id: string; year: number; total_rounds: number }> = {};
      matches.forEach(m => {
        [m.winner_id, m.loser_id].forEach(pid => {
          const key = `${pid}_${m.year}`;
          if (!groupedMap[key]) groupedMap[key] = { player_id: pid, year: m.year, total_rounds: 0 };
          groupedMap[key].total_rounds += 1;
        });
      });

      const grouped = Object.values(groupedMap);

      const playerMap = Object.fromEntries(
        (await prisma.player.findMany({
          where: { id: { in: grouped.map(g => g.player_id) } },
          select: { id: true, atpname: true, ioc: true },
        })).map(p => [p.id, { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      finalRounds.push(
        ...grouped.map(g => {
          const mapEntry = playerMap[g.player_id];
          return {
            year: g.year, // <- corretto
            player_id: g.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_rounds: g.total_rounds,
          };
        })
      );
    }

    // Ordinamento top 100
    finalRounds.sort((a, b) => b.total_rounds - a.total_rounds);

    return jsonResponse(finalRounds.slice(0, 100));
  } catch (error) {
    console.error('GET /records/same/season-rounds error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
