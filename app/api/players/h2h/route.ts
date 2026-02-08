import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function parseId(value: string | null) {
  if (value === null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // Support both 'id' (single player) and 'player1'/'player2' (H2H)
  const singleId = url.searchParams.get("id");
  const player1 = url.searchParams.get("player1");
  const player2 = url.searchParams.get("player2");

  // Filters from query params
  const year = url.searchParams.get("year");
  const level = url.searchParams.get("level");
  const surface = url.searchParams.get("surface");
  const round = url.searchParams.get("round");
  const tourney = url.searchParams.get("tourney"); // could be id or name
  const opponent = url.searchParams.get("opponent"); // name of opponent

  // Optional sorting
  const sort = url.searchParams.get("sort") || "tourney_date";
  const sortDir = (url.searchParams.get("sortDir") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  // Validate presence: require either id OR both p1 & p2
  if (!singleId && !(player1 && player2)) {
    return NextResponse.json({ error: "Parametro 'id' mancante o 'player1' e 'player2' non forniti" }, { status: 400 });
  }

  try {
    const where: any = { status: true };
    const andClauses: any[] = [];

    // Player matching: single (all matches for player) or H2H (only matches between two players)
    if (player1 && player2) {
      const p1 = parseId(player1);
      const p2 = parseId(player2);
      andClauses.push({
        OR: [
          { winner_id: p1, loser_id: p2 },
          { winner_id: p2, loser_id: p1 },
        ],
      });
    } else if (singleId) {
      const id = parseId(singleId);
      andClauses.push({
        OR: [
          { winner_id: id },
          { loser_id: id },
        ],
      });

      // If opponent filter is provided together with single player -> narrow down
      if (opponent) {
        andClauses.push({
          OR: [
            { AND: [{ winner_id: id }, { loser_name: opponent }] },
            { AND: [{ loser_id: id }, { winner_name: opponent }] },
          ],
        });
      }
    }

    // Additional filters
    if (year) {
      const y = Number(year);
      if (!Number.isNaN(y)) andClauses.push({ year: y });
    }
    if (level) andClauses.push({ tourney_level: level });
    if (surface) andClauses.push({ surface });
    if (round) andClauses.push({ round });

    if (tourney) {
      // Try parse as numeric id; if not numeric, match by name
      const tId = parseId(tourney);
      if (typeof tId === "number") andClauses.push({ tourney_id: tId });
      else andClauses.push({ tourney_name: tourney });
    }

    if (andClauses.length > 0) where.AND = andClauses;

    // Ordering
    const orderBy = { [sort]: sortDir as "asc" | "desc" };

    // Execute query
    const matches = await prisma.match.findMany({
      where,
      orderBy: orderBy as any,
    });

    // Enrich matches with player slugs and tourney slugs (best-effort)
    try {
      const playerIds = Array.from(new Set(matches.flatMap(m => [m.winner_id, m.loser_id]).filter((id): id is string => id != null && id !== '')));
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(playerIds);

      const tourneyIdParts = Array.from(new Set(matches.map((m) => {
        const s = String(m.tourney_id || '');
        const parts = s.split('-').filter(Boolean);
        return parts.length === 2 ? parts[1] : s;
      }).filter(Boolean)));

      let tourneyMap: Record<string, string | null> = {};
      try {
        if (tourneyIdParts.length > 0) {
          const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map(v => Number(v)) } }, select: { id: true, slug: true, name: true } });
          tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? null; return acc; }, {});
        }
      } catch (e) {
        // best-effort: continue without tourney_slug
        tourneyMap = {};
      }

      const enriched = matches.map(m => ({
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

      return NextResponse.json(enriched);
    } catch (e) {
      // fallback: return raw matches
      return NextResponse.json(matches);
    }
  } catch (err: any) {
    console.error("Errore recupero match:", err?.message ?? err);
    return NextResponse.json({ error: "Errore server durante il recupero dei match" }, { status: 500 });
  }
}


