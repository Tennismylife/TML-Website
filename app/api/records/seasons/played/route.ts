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

function normalizeSurfaceValue(surface: string) {
  const value = surface.trim();
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function normalizeLevelValue(level: string) {
  return level.trim().toUpperCase();
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
    const selectedSurfaces = getMultiParam(url, 'surface').map(normalizeSurfaceValue).filter(Boolean);
    const selectedLevels = getMultiParam(url, 'level').map(normalizeLevelValue).filter(Boolean);
    const selectedBestOf = getMultiParam(url, 'best_of');
    const selectedRounds = getMultiParam(url, 'round');
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    let finalPlayed: YearPlayedRecord[] = [];

    // --- Caso 0 filtri → usa MV (rapido, già aggregato) ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length === 0
    ) {
      const played = await prisma.mVSameSeasonPlayed.findMany();

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
        finalPlayed.push({
          year: e.year,
          player_id: e.player_id,
          player_name: playerMap[e.player_id]?.player_name ?? 'Unknown',
          ioc: playerMap[e.player_id]?.ioc ?? null,
          total_played: e.total_played,
        });
      });
    }

    // --- Caso 1+ filtri → query diretta su Match con conteggio totale per stagione ---
    if (
      selectedSurfaces.length + selectedLevels.length + selectedBestOf.length + selectedRounds.length >= 1
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
        const year = m.year;
        if (year == null) return;
        [m.winner_id, m.loser_id].forEach(pid => {
          if (!pid) return;
          const key = `${String(pid)}_${year}`;
          if (!groupedMap[key]) groupedMap[key] = { player_id: String(pid), year: year, total_played: 0 };
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

    // Attach slugs when available
    const ids = Array.from(new Set(finalPlayed.map(p => String(p.player_id))));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      finalPlayed = finalPlayed.map(p => ({ ...p, slug: slugMap.get(String(p.player_id)) ?? null }));
    }

    return jsonResponse(finalPlayed.slice(0, limit));
  } catch (error) {
    console.error('GET /records/same/year-played error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}