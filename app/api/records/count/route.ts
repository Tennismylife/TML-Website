import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundFilter = searchParams.get("round");
    const selectedSurfaces = searchParams.getAll("surface");
    const selectedLevels = searchParams.getAll("level");
    const selectedBestOf = searchParams
      .getAll("bestOf")
      .map(Number)
      .filter(n => !isNaN(n));

    // Filtro dinamico
    const baseFilter: Prisma.PlayerTournamentWhereInput = {
      ...(roundFilter && { round: roundFilter }),
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
    };

    // Raggruppa per player_id e conta
    const playerCounts = await prisma.playerTournament.groupBy({
      by: ["player_id"],
      where: baseFilter,
      _count: { player_id: true },
    });

    // Estrai gli ID dei top 100 giocatori per count
    const topIds = playerCounts
      .sort((a, b) => b._count.player_id - a._count.player_id)
      .slice(0, 100)
      .map(p => p.player_id);

    // Recupera le informazioni dei giocatori dalla tabella Player
    const players = await prisma.player.findMany({
      where: { id: { in: topIds } },
      select: { id: true, player: true, ioc: true },
    });

    // Crea una mappa per unire dati
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Combina count + info anagrafiche
    let top = playerCounts
      .filter(p => topIds.includes(p.player_id))
      .map(p => {
        const info = playerMap.get(p.player_id);
        return {
          id: p.player_id,
          name: info?.player || "Unknown",
          ioc: info?.ioc || "",
          count: p._count.player_id,
        };
      })
      .sort((a, b) => b.count - a.count);

    // Attach slugs when available
    const ids = top.map(t => String(t.id));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      top = top.map(t => ({ ...t, slug: slugMap.get(String(t.id)) ?? null }));
    }

    return NextResponse.json({ top });
  } catch (error) {
    console.error("Error fetching player tournament counts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
