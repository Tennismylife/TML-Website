import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Filtri
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");
    const selectedRounds = url.searchParams.getAll("round");
    const selectedBestOf = url.searchParams
      .getAll("bestOf")
      .map(b => parseInt(b))
      .filter(n => !isNaN(n));

    const hasFilters =
      selectedSurfaces.length ||
      selectedLevels.length ||
      selectedRounds.length ||
      selectedBestOf.length;

    let players: { id: string; name: string; ioc: string; totalPlayed: number }[] = [];
    let totalCount = 0;

    if (hasFilters) {
      // Query live filtrata
      const filtered = await prisma.match.groupBy({
        by: ["winner_id", "winner_name", "winner_ioc"],
        where: {
          status: true,
          ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
          ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
          ...(selectedRounds.length ? { round: { in: selectedRounds } } : {}),
          ...(selectedBestOf.length > 0 ? { best_of: { in: selectedBestOf } } : {}),
        },
        _count: { winner_id: true },
      });

      const filteredLosers = await prisma.match.groupBy({
        by: ["loser_id", "loser_name", "loser_ioc"],
        where: {
          status: true,
          ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
          ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
          ...(selectedRounds.length ? { round: { in: selectedRounds } } : {}),
          ...(selectedBestOf.length > 0 ? { best_of: { in: selectedBestOf } } : {}),
        },
        _count: { loser_id: true },
      });

      // Somma vincitori e perdenti
      const playerMap = new Map<string, { id: string; name: string; ioc: string; totalPlayed: number }>();
      for (const w of filtered) {
        playerMap.set(String(w.winner_id), {
          id: w.winner_id,
          name: w.winner_name,
          ioc: w.winner_ioc,
          totalPlayed: w._count.winner_id,
        });
      }
      for (const l of filteredLosers) {
        const key = String(l.loser_id);
        if (playerMap.has(key)) {
          playerMap.get(key)!.totalPlayed += l._count.loser_id;
        } else {
          playerMap.set(key, {
            id: l.loser_id,
            name: l.loser_name,
            ioc: l.loser_ioc,
            totalPlayed: l._count.loser_id,
          });
        }
      }

      const allPlayers = Array.from(playerMap.values()).sort((a, b) => b.totalPlayed - a.totalPlayed);
      totalCount = allPlayers.length;
      players = allPlayers.slice(0, 100); // <-- solo i primi 100
    } else {
      // Nessun filtro → materialized view limitata ai primi 100
      const topPlayed = await prisma.mVTopPlayed.findMany({
        orderBy: { total_played: "desc" },
        take: 100,
      });
      totalCount = await prisma.mVTopPlayed.count();
      players = topPlayed.map(p => ({
        id: p.player_id,
        name: p.player_name,
        ioc: p.player_ioc,
        totalPlayed: p.total_played,
      }));
    }

    return NextResponse.json({ players, totalCount });
  } catch (error) {
    console.error("Error in GET /records/played:", error);
    return NextResponse.json({ players: [], totalCount: 0 }, { status: 500 });
  }
}
