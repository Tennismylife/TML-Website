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

type TitleRecord = {
  year: number;
  player_id: string;
  player_name: string;
  total_titles: number;
  ioc: string;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');

    let finalTitles: TitleRecord[] = [];

    // --- Caso 1: un solo filtro o nessun filtro → usa MV JSON ---
    if (selectedSurfaces.length + selectedLevels.length <= 1) {
      const titles = await prisma.mVSameSeasonTitles.findMany({
        orderBy: { titles_in_year: 'desc' },
        take: 500,
      });
      if (!titles.length) return jsonResponse([]);

      const playerIds = titles.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, ioc: true, atpname: true },
      });
      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { ioc: p.ioc ?? '', name: p.atpname ?? '' }])
      );

      titles.forEach(e => {
        let totalTitles = e.titles_in_year;
        let surface = null;
        let level = null;

        if (selectedSurfaces.length === 1) {
          surface = selectedSurfaces[0];
          totalTitles = e.surface_totals?.[surface] ?? 0;
        } else if (selectedLevels.length === 1) {
          level = selectedLevels[0];
          totalTitles = e.level_totals?.[level] ?? 0;
        }

        if (totalTitles > 0) {
          finalTitles.push({
            year: e.year,
            player_id: e.player_id,
            player_name: e.player_name,
            total_titles: totalTitles,
            ioc: playerMap[e.player_id]?.ioc || '',
          });
        }
      });
    }

    // --- Caso 2: due filtri contemporanei → calcolo da playerTournament ---
    if (selectedSurfaces.length === 1 && selectedLevels.length === 1) {
      const surfaceFilter = selectedSurfaces[0];
      const levelFilter = selectedLevels[0];

      const events = await prisma.playerTournament.findMany({
        where: {
          round: 'W',
          surface: surfaceFilter,
          tourney_level: levelFilter,
        },
        select: {
          player_id: true,
          year: true,
          event_id: true,
        },
        distinct: ['player_id', 'year', 'event_id'],
      });

      if (events.length > 0) {
        // Raggruppa per player_id + year
        const groupedMap = events.reduce((acc, e) => {
          const key = `${e.player_id}_${e.year}`;
          if (!acc[key]) acc[key] = { player_id: e.player_id, year: e.year, total_titles: 0 };
          acc[key].total_titles += 1;
          return acc;
        }, {} as Record<string, { player_id: string; year: number; total_titles: number }>);

        const grouped = Object.values(groupedMap);

        const playerIdsCase2 = grouped.map(g => g.player_id);
        const playersCase2 = await prisma.player.findMany({
          where: { id: { in: playerIdsCase2 } },
          select: { id: true, atpname: true, ioc: true },
        });
        const playerMapCase2 = Object.fromEntries(
          playersCase2.map(p => [p.id, { name: p.atpname ?? '', ioc: p.ioc ?? '' }])
        );

        finalTitles.push(
          ...grouped.map(g => ({
            year: g.year,
            player_id: g.player_id,
            player_name: playerMapCase2[g.player_id]?.name || '',
            total_titles: g.total_titles,
            ioc: playerMapCase2[g.player_id]?.ioc || '',
          }))
        );
      }
    }

    // Ordinamento e top 100
    finalTitles.sort((a, b) => b.total_titles - a.total_titles);
    finalTitles = finalTitles.slice(0, 100);

    return jsonResponse(finalTitles);
  } catch (error) {
    console.error('GET /records/seasons/titles error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
