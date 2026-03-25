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

type PlayedRecord = {
  rank: number;
  tourney_id: string;
  tourney_name: string;
  player_id: string;
  player_name: string;
  total_matches: number;
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
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 100)));

    let finalMatches: PlayedRecord[] = [];

    // --- Caso 1: zero o un solo filtro (usa MV) ---
    if (selectedSurfaces.length + selectedLevels.length + selectedRounds.length + selectedBestOf.length <= 1) {
      let matches: Awaited<ReturnType<typeof prisma.mVSameTournamentPlayed.findMany>> = [];
      try {
        matches = await prisma.mVSameTournamentPlayed.findMany({
          orderBy: { total_matches: 'desc' },
          take: limit,
        });
      } catch {
        matches = [];
      }
      if (!matches.length) {
        type RawMatch = { tourney_id: string; tourney_name: string; player_id: string; player_name: string; total_matches: bigint };
        let rawRows: RawMatch[] = [];
        try {
          rawRows = await prisma.$queryRaw<RawMatch[]>`
            SELECT tourney_id, MAX(tourney_name) AS tourney_name, player_id,
                   MAX(player_name) AS player_name, COUNT(*)::bigint AS total_matches
            FROM (
              SELECT CASE WHEN tourney_id::text IN ('580','581') THEN '580' ELSE tourney_id::text END AS tourney_id,
                     tourney_name, winner_id::text AS player_id, winner_name AS player_name
              FROM "Match" WHERE status = true AND team_event = false
              UNION ALL
              SELECT CASE WHEN tourney_id::text IN ('580','581') THEN '580' ELSE tourney_id::text END,
                     tourney_name, loser_id::text, loser_name
              FROM "Match" WHERE status = true AND team_event = false
            ) u
            GROUP BY tourney_id, player_id
            ORDER BY total_matches DESC
            LIMIT ${limit}
          `;
        } catch { rawRows = []; }
        if (!rawRows.length) return jsonResponse([]);
        const fbPlayerIds = rawRows.map(r => r.player_id);
        const fbPlayers = await prisma.player.findMany({ where: { id: { in: fbPlayerIds } }, select: { id: true, atpname: true, ioc: true } });
        const fbPlayerMap = Object.fromEntries(fbPlayers.map(p => [String(p.id), { name: p.atpname ?? 'Unknown', ioc: p.ioc ?? '' }]));
        let fbMatches: PlayedRecord[] = rawRows.map((r, i) => ({
          rank: i + 1, tourney_id: r.tourney_id, tourney_name: r.tourney_name ?? '',
          player_id: r.player_id, player_name: fbPlayerMap[r.player_id]?.name ?? r.player_name ?? 'Unknown',
          total_matches: Number(r.total_matches), surface: null, tourney_level: null, round: null, best_of: null,
          ioc: fbPlayerMap[r.player_id]?.ioc ?? '',
        }));
        fbMatches.sort((a, b) => b.total_matches - a.total_matches);
        fbMatches.forEach((r, i) => { r.rank = i + 1; });
        const fbIds = Array.from(new Set(fbMatches.map(p => String(p.player_id))));
        if (fbIds.length) {
          const slugRows = await prisma.player.findMany({ where: { id: { in: fbIds } }, select: { id: true, slug: true } });
          const slugMap = new Map(slugRows.map(r => [r.id, r.slug] as [string, string | null]));
          fbMatches = fbMatches.map(p => ({ ...p, slug: slugMap.get(String(p.player_id)) ?? null }));
        }
        return jsonResponse(fbMatches.slice(0, limit));
      }

      const playerIds = matches.map(e => e.player_id);
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, ioc: true, atpname: true },
      });
      const playerMap = Object.fromEntries(
        players.map(p => [p.id, { ioc: p.ioc ?? '', name: p.atpname ?? '' }])
      );

      matches.forEach(e => {
        let totalMatches = e.total_matches;
        let surface: string | null = null;
        let level: string | null = null;
        let round: string | null = null;
        let best_of: string | null = null;

        if (selectedSurfaces.length === 1) {
          surface = selectedSurfaces[0];
          totalMatches = e.surface_totals?.[surface] ?? 0;
        }
        if (selectedLevels.length === 1) {
          level = selectedLevels[0];
          totalMatches = e.level_totals?.[level] ?? 0;
        }
        if (selectedRounds.length === 1) {
          round = selectedRounds[0];
          totalMatches = e.round_totals?.[round] ?? 0;
        }
        if (selectedBestOf.length === 1) {
          const bo = selectedBestOf[0];
          totalMatches = e.best_of_totals?.[bo] ?? 0;
          best_of = bo;
        }
        if (selectedRounds.length === 0 && selectedBestOf.length === 0 && e.best_of_totals) {
          best_of = JSON.stringify(e.best_of_totals);
        }

        if (totalMatches > 0) {
          finalMatches.push({
            rank: 0, // verrà calcolato dopo
            tourney_id: e.tourney_id,
            tourney_name: e.tourney_name,
            player_id: e.player_id,
            player_name: e.player_name,
            total_matches: totalMatches,
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
          loser_id: true,
          loser_name: true,
          surface: true,
          tourney_level: true,
          round: true,
          best_of: true,
        },
      });

      if (matches.length > 0) {
        const groupedMap = matches.reduce((acc, m) => {
          [[m.winner_id, m.winner_name], [m.loser_id, m.loser_name]].forEach(([pid, pname]) => {
            if (!pid) return;
            const key = `${String(pid)}_${String(m.tourney_id ?? '')}`;
            if (!acc[key])
              acc[key] = {
                rank: 0,
                player_id: String(pid),
                player_name: pname ?? '',
                tourney_id: m.tourney_id ?? '',
                tourney_name: m.tourney_name ?? '',
                total_matches: 0,
                surface: null,
                tourney_level: null,
                round: null,
                best_of: null,
                ioc: '',
              };
            acc[key].total_matches += 1;

            if (selectedSurfaces.length === 1) acc[key].surface = selectedSurfaces[0];
            if (selectedLevels.length === 1) acc[key].tourney_level = selectedLevels[0];
            if (selectedRounds.length === 1) acc[key].round = selectedRounds[0];
            if (selectedBestOf.length === 1) acc[key].best_of = selectedBestOf[0];
          });
          return acc;
        }, {} as Record<string, PlayedRecord>);

        const grouped = Object.values(groupedMap);

        const playerIdsCase2 = grouped.map(g => g.player_id);
        const playersCase2 = await prisma.player.findMany({
          where: { id: { in: playerIdsCase2 } },
          select: { id: true, atpname: true, ioc: true },
        });
        const playerMapCase2 = Object.fromEntries(
          playersCase2.map(p => [p.id, { name: p.atpname ?? '', ioc: p.ioc ?? '' }])
        );

        finalMatches.push(
          ...grouped.map(g => ({
            ...g,
            player_name: playerMapCase2[g.player_id]?.name || g.player_name,
            ioc: playerMapCase2[g.player_id]?.ioc || '',
          }))
        );
      }
    }

    // Ordinamento per total_matches e calcolo del rank
    finalMatches.sort((a, b) => b.total_matches - a.total_matches);
    finalMatches = finalMatches.slice(0, limit);

    finalMatches.forEach((record, index) => {
      record.rank = index + 1; // rank 1,2,3,...
    });

    // Attach slugs when available (players and tournaments)
    const ids = Array.from(new Set(finalMatches.map(m => String(m.player_id))));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      finalMatches = finalMatches.map(m => ({ ...m, slug: slugMap.get(String(m.player_id)) ?? null }));
    }

    // Collect unique tourney ids (handle composite ids like "520-1995") and attach tourney_slug
    const tourneyIdParts = finalMatches.map(p => {
      const tid = String(p.tourney_id ?? '');
      return tid.includes('-') ? tid.split('-')[0] : tid;
    }).filter(Boolean);

    const uniqueTourneyIds = Array.from(new Set(tourneyIdParts.map(t => Number(t)).filter(n => Number.isFinite(n))));
    if (uniqueTourneyIds.length > 0) {
      const tourneyRows = await prisma.tournament.findMany({ where: { id: { in: uniqueTourneyIds } }, select: { id: true, slug: true } });
      const tourneySlugMap = new Map(tourneyRows.map(r => [String(r.id), r.slug] as [string, string | null]));
      finalMatches = finalMatches.map(p => {
        const tid = String(p.tourney_id ?? '');
        const tidPart = tid.includes('-') ? tid.split('-')[0] : tid;
        return { ...p, tourney_slug: tourneySlugMap.get(tidPart) ?? null };
      });
    }

    return jsonResponse(finalMatches);
  } catch (error) {
    console.error('GET /records/tournaments/played error:', error);
    return jsonResponse({ error: 'Internal Server Error' }, 500);
  }
}
