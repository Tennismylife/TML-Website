// allmatches.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  parseSets,
  hasDecidingTB,
  filterByResult,
  filterByRank,
  filterByAge,
  filterByHand,
  filterByEntry,
  filterBySetScore,
  checkRank
} from "./matchHelpers";
import { createSlug } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  const year = url.searchParams.get("year") ?? undefined;
  const level = url.searchParams.get("level") ?? undefined;
  const tourneyId = url.searchParams.get("tourney") ?? undefined;
  const surface = url.searchParams.get("surface") ?? undefined;
  const round = url.searchParams.get("round") ?? undefined;
  const result = url.searchParams.get("result") ?? undefined;
  const vsRank = url.searchParams.get("vsRank") ?? undefined;
  const vsAge = url.searchParams.get("vsAge") ?? undefined;
  const vsHand = url.searchParams.get("vsHand") ?? undefined;
  const vsBackhand = url.searchParams.get("vsBackhand") ?? undefined;
  const vsEntry = url.searchParams.get("vsEntry") ?? undefined;
  const asRank = url.searchParams.get("asRank") ?? undefined;
  const asEntry = url.searchParams.get("asEntry") ?? undefined;
  const set = url.searchParams.get("set") ?? undefined;
  const firstSet = url.searchParams.get("firstSet") ?? undefined;
  const score = url.searchParams.get("score") ?? undefined;

  try {
    const where: any = { OR: [{ winner_id: playerId }, { loser_id: playerId }] };
    if (year) where.year = parseInt(year);
    if (level) where.tourney_level = level;
    if (tourneyId && tourneyId !== "All") where.tourney_id = tourneyId;
    if (surface) {
      // Support substring / case-insensitive matching (e.g. "Hard (Indoor)" should match "Hard")
      where.surface = { contains: surface, mode: 'insensitive' } as any;
    }
    if (round) where.round = round;

    // Honor a `limit` query param (preview) or pagination via `page` / `perPage` (view all paginated).
    const limitParamDb = url.searchParams.get('limit');
    const pageParam = url.searchParams.get('page');
    const perPageParam = url.searchParams.get('perPage') ?? url.searchParams.get('per_page');

    let dbTake: number | undefined = undefined;
    let dbSkip: number | undefined = undefined;

    // Preview: explicit limit (keeps behavior compatible with existing clients)
    if (limitParamDb) {
      const n = parseInt(limitParamDb, 10);
      if (!Number.isNaN(n) && n > 0) dbTake = n;
    }

    // Pagination: page + perPage (server-side cap applied)
    if (perPageParam) {
      const MAX_PER_PAGE = 200;
      let p = parseInt(perPageParam, 10);
      if (Number.isNaN(p) || p <= 0) p = 10;
      dbTake = Math.min(p, MAX_PER_PAGE);
      if (pageParam) {
        const pageNum = parseInt(pageParam, 10);
        if (!Number.isNaN(pageNum) && pageNum > 0) dbSkip = (pageNum - 1) * dbTake;
      }
    }

    const findOptions: any = { where, orderBy: { tourney_date: 'desc' } };
    if (typeof dbTake === 'number') findOptions.take = dbTake;
    if (typeof dbSkip === 'number') findOptions.skip = dbSkip;

    const matches = await prisma.match.findMany(findOptions);

    let playerMap: Record<string, string | null> = {};
    if (vsBackhand) {
      const playerIds: string[] = Array.from(new Set(matches.flatMap(m => [m.winner_id, m.loser_id]).filter((id): id is string => id !== null)));
      const players = await prisma.player.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, backhand: true }
      });
      playerMap = Object.fromEntries(players.map(p => [p.id, p.backhand]));
    }

    const filteredMatches = matches.filter((m) => {
      const isWinner = m.winner_id === playerId;
      const myRank = isWinner ? m.winner_rank : m.loser_rank;
      const oppRank = isWinner ? m.loser_rank : m.winner_rank;
      const mySeed = isWinner ? m.winner_seed : m.loser_seed;
      const oppSeed = isWinner ? m.loser_seed : m.winner_seed;
      const myEntry = isWinner ? m.winner_entry : m.loser_entry;
      const oppEntry = isWinner ? m.loser_entry : m.winner_entry;
      const myAge = isWinner ? m.winner_age : m.loser_age;
      const oppAge = isWinner ? m.loser_age : m.winner_age;
      const oppHand = isWinner ? m.loser_hand : m.winner_hand;
      const oppBack = vsBackhand ? (isWinner ? playerMap[m.loser_id ?? ''] : playerMap[m.winner_id ?? '']) : undefined;

      if (vsBackhand) {
        if (vsBackhand === "Two-handed" && oppBack !== "2H") return false;
        if (vsBackhand === "One-handed" && oppBack !== "1H") return false;
      }

      if (!filterByResult(m, isWinner, result)) return false;
      if (!filterByRank(myRank, oppRank, asRank, vsRank)) return false;
      if (!filterByAge(myAge ?? undefined, oppAge ?? undefined, vsAge)) return false;
      if (vsHand && !filterByHand(oppHand ?? '', vsHand)) return false;
      if (!filterByEntry(mySeed, oppSeed, myEntry ?? undefined, oppEntry ?? undefined, asEntry, vsEntry)) return false;
      if (!filterBySetScore(m, set, firstSet, score, isWinner)) return false;

      return true;
    });

    // Add slug fields for clients to build canonical hrefs (prefer slug over id when available)
    try {
      const playerIds = Array.from(new Set(filteredMatches.flatMap(m => [m.winner_id, m.loser_id]).filter((id): id is string => !!id)));
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(playerIds);
      // Resolve tourney slugs for matches so clients can link to canonical slug URLs
      const tourneyIdParts = Array.from(new Set(filteredMatches.map((m) => {
        const s = String(m.tourney_id || '');
        const parts = s.split('-').filter(Boolean);
        return parts.length === 2 ? parts[1] : s;
      }).filter(Boolean)));

      let tourneyMap: Record<string, string | null> = {};
      try {
        if (tourneyIdParts.length > 0) {
          // Include the tournament name so we can synthesize a slug when DB slug is missing
          const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map((v) => Number(v)) } }, select: { id: true, slug: true, name: true } });
          tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? createSlug(t.name ?? String(t.id)); return acc; }, {});
        }
      } catch (err) {
        // best-effort: continue without tourney_slug
        tourneyMap = {};
      }

      let enriched = filteredMatches.map(m => ({
        ...m,
        winner_slug: m.winner_id ? (slugMap[String(m.winner_id)] ?? null) : null,
        loser_slug: m.loser_id ? (slugMap[String(m.loser_id)] ?? null) : null,
        tourney_slug: (() => {
          const s = String(m.tourney_id || '');
          const parts = s.split('-').filter(Boolean);
          const idPart = parts.length === 2 ? parts[1] : s;
          return idPart ? (tourneyMap[String(idPart)] ?? null) : null;
        })(),
      }));

      // Honor an optional `limit` query param so clients can request only the latest N matches
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const n = parseInt(limitParam, 10);
        if (!Number.isNaN(n) && n > 0) enriched = enriched.slice(0, n);
      }

      // Build response headers and caching policy
      const headers = new Headers();
      const isPreview = Boolean(limitParam);
      const isPaginated = Boolean(url.searchParams.get('page') || url.searchParams.get('perPage') || url.searchParams.get('per_page'));

      if (isPreview) {
        // Preview responses are cacheable for a short period with SWR
        headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      } else if (isPaginated) {
        // Paginated views are cacheable briefly - clients can revalidate
        // Also include total count header for client pagination controls
        try {
          const totalCount = await prisma.match.count({ where });
          headers.set('X-Total-Count', String(totalCount));
        } catch (e) {
          // ignore count failures
        }
        headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
      } else {
        // Fallback: keep short caching to avoid stale big payloads
        headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      }

      return new NextResponse(JSON.stringify(enriched), { status: 200, headers });
    } catch (e) {
      // fallback: return unmodified matches if slug resolution fails
      let fallback = filteredMatches;
      const limitParam = url.searchParams.get('limit');
      if (limitParam) {
        const n = parseInt(limitParam, 10);
        if (!Number.isNaN(n) && n > 0) fallback = fallback.slice(0, n);
      }

      const headers = new Headers();
      const isPreview = Boolean(limitParam);
      if (isPreview) headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      else headers.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');

      return new NextResponse(JSON.stringify(fallback), { status: 200, headers });
    }
  } catch (err) {
    console.error("Errore recupero match:", err);
    return NextResponse.json({ error: "Errore server durante il recupero dei match" }, { status: 500 });
  }
}
