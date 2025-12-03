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

type EntryRecord = {
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_entries: number;
  year: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');

    let finalEntries: EntryRecord[] = [];

    // --- Caso 1: zero o un solo filtro (usa MV) ---
    if (selectedSurfaces.length + selectedLevels.length <= 1) {
      const matches = await prisma.mVSameSeasonEntries.findMany({
        orderBy: { total_entries: 'desc' },
        take: 500,
      });
      if (!matches.length) return jsonResponse([]);

      const playerIds = matches.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, atpname: true, ioc: true },
      });

      const playerMap = Object.fromEntries(
        players.map(p => [String(p.id), { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
      );

      matches.forEach(e => {
        let total_entries = e.total_entries;

        if (selectedSurfaces.length === 1) {
          const surface = selectedSurfaces[0];
          total_entries = e.surface_totals?.[surface] ?? 0;
        }
        if (selectedLevels.length === 1) {
          const level = selectedLevels[0];
          total_entries = e.level_totals?.[level] ?? 0;
        }

        if (total_entries > 0) {
          const mapEntry = playerMap[String(e.player_id)];
          finalEntries.push({
            player_id: e.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_entries,
            year: e.year,
          });
        }
      });
    }

// --- Caso 2: due filtri contemporanei → calcolo same year entries con triple uniche ---
if (selectedSurfaces.length === 1 && selectedLevels.length === 1) {
  const surfaceFilter = selectedSurfaces[0];
  const levelFilter = selectedLevels[0];

  const events = await prisma.playerTournament.findMany({
    where: { surface: surfaceFilter, tourney_level: levelFilter },
    select: { player_id: true, event_id: true, tourney_name: true, year: true },
    distinct: ['player_id', 'event_id', 'year'], // garantisce triple uniche
  });

  // Raggruppa per player_id + year
  const groupedMap: Record<
    string,
    { player_id: string; total_entries: number; year: number; tourney_names: string[] }
  > = {};

  events.forEach(e => {
    const key = `${e.player_id}_${e.year}`;
    if (!groupedMap[key]) {
      groupedMap[key] = {
        player_id: e.player_id,
        total_entries: 0,
        year: e.year,
        tourney_names: [],
      };
    }
    groupedMap[key].total_entries += 1; // conta solo triple uniche
    groupedMap[key].tourney_names.push(e.tourney_name);
  });

  const grouped = Object.values(groupedMap);

  const playerMap = Object.fromEntries(
    (await prisma.player.findMany({
      where: { id: { in: grouped.map(g => g.player_id) } },
      select: { id: true, atpname: true, ioc: true },
    })).map(p => [String(p.id), { player_name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }])
  );

  finalEntries.push(
    ...grouped.map(g => {
      const mapEntry = playerMap[String(g.player_id)];
      return {
        player_id: g.player_id,
        player_name: mapEntry?.player_name ?? 'Unknown',
        ioc: mapEntry?.ioc ?? null,
        total_entries: g.total_entries,
        year: g.year,
      };
    })
  );
}



    // Ordinamento top 100
    finalEntries.sort((a, b) => b.total_entries - a.total_entries);

    return jsonResponse(finalEntries.slice(0, 100));
  } catch (error) {
    console.error('GET /records/tournaments/entries error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
