
// app/api/records/ages/winners/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const surfacesParam = searchParams.getAll("surface");
    const levelsParam = searchParams.getAll("level");
    const roundsParam = searchParams.getAll("round");
    const typeParam = searchParams.get("type") || "oldest";
    const limitParam = Number(searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) ? Math.max(1, Math.min(100, Math.floor(limitParam))) : 100;
    const isYoungest = typeParam === "youngest";

    // Fetch distinct winners with age info
    const playersWinner = await prisma.match.findMany({
      where: {
        round: "F",
        team_event: false,
        winner_age: { not: null },
        // Exclude finals that are scheduled but not played (score "To play")
        score: { not: 'To play' },
        ...(surfacesParam.length > 0 && { surface: { in: surfacesParam } }),
        ...(levelsParam.length > 0 && { tourney_level: { in: levelsParam } }),
        ...(roundsParam.length > 0 && { round: { in: roundsParam } }),
      },
      select: {
        id: true, // match id for uniqueness
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        tourney_id: true,
        tourney_name: true,
        event_id: true,
        year: true,
      },
    });

    // Unisci i giocatori in un'unica mappa per evitare duplicati
    const playersMap = new Map<string, any>();

    const processPlayer = (p: any) => {
      const key = `${p.winner_id}_${p.event_id ?? "noEvent"}`;
      if (!playersMap.has(key)) {
        playersMap.set(key, {
          id: p.winner_id,
          name: p.winner_name,
          ioc: p.winner_ioc,
          age: p.winner_age,
          event_id: p.event_id ?? "noEvent",
          tourney_id: p.tourney_id,
          tourney_name: p.tourney_name,
          year: p.year,
        });
      }
    };

    playersWinner.forEach(p => processPlayer(p));

    // Ordina e limita il risultato
    const playersSorted = Array.from(playersMap.values())
      .sort((a, b) => (isYoungest ? a.age - b.age : b.age - a.age))
      .slice(0, limit);

    const responseKey = isYoungest ? "youngestWinners" : "oldestWinners";

    // Attach player and tournament slugs when available
    const playerIds = playersSorted.map(p => String(p.id)).filter(Boolean);

    // Extract tourney id numeric parts (handle composite ids like "581-1977")
    const tourneyIdParts = playersSorted.map(p => {
      const tid = String(p.tourney_id ?? '');
      return tid.includes('-') ? tid.split('-')[0] : tid;
    }).filter(Boolean);

    const uniqueTourneyIds = Array.from(new Set(tourneyIdParts.map(t => Number(t)).filter(n => Number.isFinite(n))));

    const result = playersSorted;

    if (playerIds.length > 0) {
      const playerRows = await prisma.player.findMany({ where: { id: { in: playerIds } }, select: { id: true, slug: true } });
      const playerSlugMap = new Map(playerRows.map(r => [String(r.id), r.slug] as [string, string | null]));
      result.forEach(p => { (p as any).slug = playerSlugMap.get(String(p.id)) ?? null; });
    }

    if (uniqueTourneyIds.length > 0) {
      const tourneyRows = await prisma.tournament.findMany({ where: { id: { in: uniqueTourneyIds } }, select: { id: true, slug: true } });
      const tourneySlugMap = new Map(tourneyRows.map(r => [String(r.id), r.slug] as [string, string | null]));
      result.forEach(p => {
        const tid = String(p.tourney_id ?? '');
        const tidPart = tid.includes('-') ? tid.split('-')[0] : tid;
        (p as any).tourney_slug = tourneySlugMap.get(tidPart) ?? null;
      });
    }

    return NextResponse.json({ [responseKey]: result });
  } catch (error) {
    console.error("Error fetching winners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
