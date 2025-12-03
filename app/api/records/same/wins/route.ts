import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;
if (!globalThis.prisma) {
  globalThis.prisma = new PrismaClient();
}
prisma = globalThis.prisma;

// --- Utils ---
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

type WinRecord = {
  tourney_id: string;
  tourney_name: string;
  player_id: string;
  player_name: string;
  total_wins: number;
  surface: string | null;
  tourney_level: string | null;
  round: string | null;
  best_of: string | null;
  ioc: string;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');
    const selectedRounds = getMultiParam(url, 'round');
    const selectedBestOf = getMultiParam(url, 'best_of');

    let finalWins: WinRecord[] = [];

    // --- Caso 1: zero o un solo filtro (usa MV JSON) ---
    if (selectedSurfaces.length + selectedLevels.length + selectedRounds.length + selectedBestOf.length <= 1) {
      const wins = await prisma.mVSameTournamentWins.findMany({
        orderBy: { total_wins: 'desc' },
        take: 500,
      });
      if (!wins.length) return jsonResponse([]);

      const playerIds = wins.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, ioc: true, atpname: true },
      });
      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { ioc: p.ioc ?? '', name: p.atpname ?? '' }])
      );

      wins.forEach(e => {
        let totalWins = e.total_wins;
        let surface: string | null = null;
        let level: string | null = null;
        let round: string | null = null;
        let best_of: string | null = null;

        if (selectedSurfaces.length === 1) {
          surface = selectedSurfaces[0];
          totalWins = e.surface_totals?.[surface] ?? 0;
        }
        if (selectedLevels.length === 1) {
          level = selectedLevels[0];
          totalWins = e.level_totals?.[level] ?? 0;
        }
        if (selectedRounds.length === 1) {
          round = selectedRounds[0];
          totalWins = e.round_totals?.[round] ?? 0;
        }
        if (selectedBestOf.length === 1) {
          const bo = selectedBestOf[0];
          totalWins = e.best_of_totals?.[bo] ?? 0;
          best_of = bo;
        }
        if (selectedRounds.length === 0 && selectedBestOf.length === 0 && e.best_of_totals) {
          best_of = JSON.stringify(e.best_of_totals);
        }

        if (totalWins > 0) {
          finalWins.push({
            tourney_id: e.tourney_id,
            tourney_name: e.tourney_name,
            player_id: e.player_id,
            player_name: e.player_name,
            total_wins: totalWins,
            surface,
            tourney_level: level,
            round,
            best_of,
            ioc: playerMap[e.player_id]?.ioc || '',
          });
        }
      });
    }

    // --- Caso 2: più filtri → calcolo dinamico da Match ---
    if (selectedSurfaces.length + selectedLevels.length + selectedRounds.length + selectedBestOf.length > 1) {
      const matches = await prisma.match.findMany({
        where: {
          status: true,
          team_event: false,
          ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
          ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
          ...(selectedRounds.length ? { round: { in: selectedRounds } } : {}),
          ...(selectedBestOf.length ? { best_of: { in: selectedBestOf.map(b => parseInt(b)) } } : {}),
        },
        select: {
          tourney_id: true,
          tourney_name: true,
          winner_id: true,
          winner_name: true,
          surface: true,
          tourney_level: true,
          round: true,
          best_of: true,
        },
      });

      if (matches.length > 0) {
        const groupedMap = matches.reduce((acc, m) => {
          const key = `${m.winner_id}_${m.tourney_id}`;
          if (!acc[key])
            acc[key] = {
              player_id: m.winner_id,
              player_name: m.winner_name,
              tourney_id: m.tourney_id,
              tourney_name: m.tourney_name,
              total_wins: 0,
              surface: null,
              tourney_level: null,
              round: null,
              best_of: null,
              ioc: '',
            };
          acc[key].total_wins += 1;

          if (selectedSurfaces.length === 1) acc[key].surface = selectedSurfaces[0];
          if (selectedLevels.length === 1) acc[key].tourney_level = selectedLevels[0];
          if (selectedRounds.length === 1) acc[key].round = selectedRounds[0];
          if (selectedBestOf.length === 1) acc[key].best_of = selectedBestOf[0];

          return acc;
        }, {} as Record<string, WinRecord>);

        const grouped = Object.values(groupedMap);

        const playerIdsCase2 = grouped.map(g => g.player_id);
        const playersCase2 = await prisma.player.findMany({
          where: { id: { in: playerIdsCase2 } },
          select: { id: true, atpname: true, ioc: true },
        });
        const playerMapCase2 = Object.fromEntries(
          playersCase2.map(p => [p.id, { name: p.atpname ?? '', ioc: p.ioc ?? '' }])
        );

        finalWins.push(
          ...grouped.map(g => ({
            ...g,
            player_name: playerMapCase2[g.player_id]?.name || g.player_name,
            ioc: playerMapCase2[g.player_id]?.ioc || '',
          }))
        );
      }
    }

    // Ordinamento e top 100
    finalWins.sort((a, b) => b.total_wins - a.total_wins);
    finalWins = finalWins.slice(0, 100);

    return jsonResponse(finalWins);
  } catch (error) {
    console.error('GET /records/tournaments/wins error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
