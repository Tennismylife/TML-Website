// app/api/records/ages/allrounds/route.tsx

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const surfacesParam = searchParams.getAll("surface");
    const levelsParam = searchParams.getAll("level");
    const typeParam = searchParams.get("type") || "oldest";

    const selectedSurfaces = surfacesParam;
    const selectedLevels = levelsParam;

    // Ordine logico dei round
    const roundOrder = ["R128", "R64", "R32", "R16", "QF", "SF", "F", "W"];

    // Funzione per ottenere top giocatori per round
    const getTopPlayers = async (round: string, order: "asc" | "desc") => {
      const winnerQuery = prisma.match.findMany({
        where: {
          ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
          ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
          team_event: false,
          round,
        },
        select: {
          winner_id: true,
          winner_name: true,
          winner_ioc: true,
          winner_age: true,
          event_id: true,
          tourney_name: true,
          year: true,
        },
        orderBy: { winner_age: order },
        take: 100,
      });

      const loserQuery = prisma.match.findMany({
        where: {
          ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
          ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
          team_event: false,
          round,
        },
        select: {
          loser_id: true,
          loser_name: true,
          loser_ioc: true,
          loser_age: true,
          event_id: true,
          tourney_name: true,
          year: true
        },
        orderBy: { loser_age: order },
        take: 100,
      });

      const [winners, losers] = await Promise.all([winnerQuery, loserQuery]);

      const map: Map<string, any> = new Map();

      winners.forEach((p) => {
        if (!p.winner_id || !p.winner_age) return;
        const key = String(p.winner_id);
        const age = Number(p.winner_age);
        const existing = map.get(key);
        if (!existing || (order === "asc" ? age < existing.age : age > existing.age)) {
          map.set(key, {
            id: p.winner_id,
            name: p.winner_name,
            ioc: p.winner_ioc ?? "",
            age,
            year: p.year,
            event_id: p.event_id,
            tourney_name: p.tourney_name,
          });
        }
      });

      losers.forEach((p) => {
        if (!p.loser_id || !p.loser_age) return;
        const key = String(p.loser_id);
        const age = Number(p.loser_age);
        const existing = map.get(key);
        if (!existing || (order === "asc" ? age < existing.age : age > existing.age)) {
          map.set(key, {
            id: p.loser_id,
            name: p.loser_name,
            ioc: p.loser_ioc ?? "",
            age,
            year: p.year,
            event_id: p.event_id,
            tourney_name: p.tourney_name,
          });
        }
      });

      const players = Array.from(map.values()).sort((a, b) =>
        order === "asc" ? a.age - b.age : b.age - a.age
      );

      return { title: round, list: players.slice(0, 10), fullList: players };
    };

    // Esegui query per tutti i round
    const allRoundsItems: Array<{ title: string; list: any[]; fullList: any[] }> = [];
    for (const round of roundOrder) {
      const item = await getTopPlayers(round, typeParam === "youngest" ? "asc" : "desc");
      if (item.fullList.length > 0) allRoundsItems.push(item);
    }

    // Attach slugs when available across all rounds
    const allIds = Array.from(new Set(allRoundsItems.flatMap(it => it.fullList.map(p => String(p.id))))).filter(Boolean);
    if (allIds.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: allIds } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      const enrichedItems = allRoundsItems.map(it => ({
        ...it,
        list: it.list.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null })),
        fullList: it.fullList.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null })),
      }));

      return NextResponse.json(
        typeParam === "youngest" ? { allYoungestItems: enrichedItems } : { allOldestItems: enrichedItems }
      );
    }

    return NextResponse.json(
      typeParam === "youngest" ? { allYoungestItems: allRoundsItems } : { allOldestItems: allRoundsItems }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
