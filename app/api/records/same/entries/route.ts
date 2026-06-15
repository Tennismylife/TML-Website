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
  tourney_id: string;
  tourney_name: string;
  player_id: string;
  player_name: string;
  ioc: string | null;
  total_entries: number;
  surface: string | null;
  tourney_level: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl;
    const selectedSurfaces = getMultiParam(url, 'surface');
    const selectedLevels = getMultiParam(url, 'level');
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    let finalEntries: EntryRecord[] = [];

    // --- Caso 1: zero o un solo filtro (usa MV o query diretta per livello solo) ---
    if (selectedSurfaces.length === 0 && selectedLevels.length === 1) {
      const levelFilter = selectedLevels[0];
      const events = await prisma.playerTournament.findMany({
        where: { tourney_level: levelFilter },
        select: { player_id: true, tourney_id: true, event_id: true, tourney_name: true },
        distinct: ['player_id', 'tourney_id', 'event_id'],
      });

      const groupedMap: Record<string, { player_id: string; tourney_id: string; tourney_name: string; total_entries: number }> = {};
      events.forEach(e => {
        const key = `${e.player_id}_${e.tourney_id}`;
        if (!groupedMap[key]) groupedMap[key] = { player_id: String(e.player_id), tourney_id: String(e.tourney_id), tourney_name: e.tourney_name, total_entries: 0 };
        groupedMap[key].total_entries += 1;
      });

      const grouped = Object.values(groupedMap).sort((a, b) => b.total_entries - a.total_entries).slice(0, limit);
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
            tourney_id: g.tourney_id,
            tourney_name: g.tourney_name,
            player_id: g.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_entries: g.total_entries,
            surface: null,
            tourney_level: levelFilter,
          };
        })
      );
    } else if (selectedSurfaces.length + selectedLevels.length <= 1) {
      let matches: Awaited<ReturnType<typeof prisma.mVSameTournamentEntries.findMany>> = [];
      try {
        matches = await prisma.mVSameTournamentEntries.findMany({
          orderBy: { total_entries: 'desc' },
          take: limit,
        });
      } catch {
        matches = [];
      }
      if (!matches.length) {
        type RawEntry = { tourney_id: string; tourney_name: string; player_id: string; total_entries: bigint };
        let rawRows: RawEntry[] = [];
        try {
          rawRows = await prisma.$queryRaw<RawEntry[]>`
            SELECT
              CASE WHEN tourney_id::text IN ('580','581') THEN '580' ELSE tourney_id::text END AS tourney_id,
              MAX(tourney_name) AS tourney_name,
              player_id,
              COUNT(DISTINCT event_id)::bigint AS total_entries
            FROM "PlayerTournament"
            GROUP BY CASE WHEN tourney_id::text IN ('580','581') THEN '580' ELSE tourney_id::text END, player_id
            ORDER BY total_entries DESC
            LIMIT ${limit}
          `;
        } catch { rawRows = []; }
        if (!rawRows.length) return jsonResponse([]);
        const fbPlayerIds = rawRows.map(r => r.player_id);
        const fbPlayers = await prisma.player.findMany({ where: { id: { in: fbPlayerIds } }, select: { id: true, atpname: true, ioc: true } });
        const fbPlayerMap = Object.fromEntries(fbPlayers.map(p => [String(p.id), { name: p.atpname ?? 'Unknown', ioc: p.ioc ?? null }]));
        let fbEntries: EntryRecord[] = rawRows.map(r => ({
          tourney_id: r.tourney_id, tourney_name: r.tourney_name ?? '',
          player_id: r.player_id, player_name: fbPlayerMap[r.player_id]?.name ?? 'Unknown',
          ioc: fbPlayerMap[r.player_id]?.ioc ?? null,
          total_entries: Number(r.total_entries), surface: null, tourney_level: null,
        }));
        fbEntries.sort((a, b) => b.total_entries - a.total_entries);
        const fbIds = Array.from(new Set(fbEntries.map(e => String(e.player_id))));
        if (fbIds.length) {
          const slugRows = await prisma.player.findMany({ where: { id: { in: fbIds } }, select: { id: true, slug: true } });
          const slugMap = new Map(slugRows.map(r => [String(r.id), r.slug] as [string, string | null]));
          fbEntries = fbEntries.map(e => ({ ...e, slug: slugMap.get(String(e.player_id)) ?? null }));
        }
        return jsonResponse(fbEntries.slice(0, limit));
      }

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
        let surface: string | null = null;
        let level: string | null = null;

        if (selectedSurfaces.length === 1) {
          surface = selectedSurfaces[0];
          total_entries = e.surface_totals?.[surface] ?? 0;
        }
        if (selectedLevels.length === 1) {
          level = selectedLevels[0];
          total_entries = e.level_totals?.[level] ?? 0;
        }

        if (total_entries > 0) {
          const mapEntry = playerMap[String(e.player_id)];
          finalEntries.push({
            tourney_id: e.tourney_id,
            tourney_name: e.tourney_name,
            player_id: e.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_entries,
            surface,
            tourney_level: level,
          });
        }
      });
    }

    // --- Caso 2: due filtri contemporanei → calcolo da PlayerTournament ---
    if (selectedSurfaces.length === 1 && selectedLevels.length === 1) {
      const surfaceFilter = selectedSurfaces[0];
      const levelFilter = selectedLevels[0];

      const events = await prisma.playerTournament.findMany({
        where: { surface: surfaceFilter, tourney_level: levelFilter },
        select: { player_id: true, tourney_id: true, event_id: true, tourney_name: true },
        distinct: ['player_id', 'tourney_id', 'event_id'],
      });

      const groupedMap: Record<string, { player_id: string; tourney_id: string; tourney_name: string; total_entries: number }> = {};
      events.forEach(e => {
        const key = `${e.player_id}_${e.tourney_id}`;
        if (!groupedMap[key]) groupedMap[key] = { player_id: String(e.player_id), tourney_id: String(e.tourney_id), tourney_name: e.tourney_name, total_entries: 0 };
        groupedMap[key].total_entries += 1;
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
            tourney_id: g.tourney_id,
            tourney_name: g.tourney_name,
            player_id: g.player_id,
            player_name: mapEntry?.player_name ?? 'Unknown',
            ioc: mapEntry?.ioc ?? null,
            total_entries: g.total_entries,
            surface: surfaceFilter,
            tourney_level: levelFilter,
          };
        })
      );
    }

    // Ordinamento top 100
    finalEntries.sort((a, b) => b.total_entries - a.total_entries);

    // Attach player slugs when available
    const playerIds = Array.from(new Set(finalEntries.map(e => String(e.player_id))));
    if (playerIds.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [String(r.id), r.slug] as [string, string | null]));
      finalEntries = finalEntries.map(e => ({ ...e, slug: slugMap.get(String(e.player_id)) ?? null }));
    }

    // Attach tourney slugs (handle composite ids like "520-1995")
    const tourneyIdParts = finalEntries.map(e => {
      const tid = String(e.tourney_id ?? '');
      return tid.includes('-') ? tid.split('-')[0] : tid;
    }).filter(Boolean);

    const uniqueTourneyIds = Array.from(new Set(tourneyIdParts.map(t => Number(t)).filter(n => Number.isFinite(n))));
    if (uniqueTourneyIds.length > 0) {
      const tourneyRows = await prisma.tournament.findMany({ where: { id: { in: uniqueTourneyIds } }, select: { id: true, slug: true } });
      const tourneySlugMap = new Map(tourneyRows.map(r => [String(r.id), r.slug] as [string, string | null]));
      finalEntries = finalEntries.map(e => {
        const tid = String(e.tourney_id ?? '');
        const tidPart = tid.includes('-') ? tid.split('-')[0] : tid;
        return { ...e, tourney_slug: tourneySlugMap.get(tidPart) ?? null };
      });
    }

    return jsonResponse(finalEntries.slice(0, limit));
  } catch (error) {
    console.error('GET /records/tournaments/entries error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
