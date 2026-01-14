import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

type PlayerEntry = {
  id: string;
  name: string;
  ioc: string | null;
  entries: number;
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");

    const hasFilters = selectedSurfaces.length > 0 || selectedLevels.length > 0;

    let topEntries: PlayerEntry[] = [];
    let totalCount = 0;

    let entriesData: { player_id: string; entries: number }[] = [];

    if (hasFilters) {
      const filters: any = {
        ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
        ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
      };

      // Trova tutte le coppie uniche player_id-event_id
      const participations = await prisma.playerTournament.findMany({
        where: filters,
        distinct: ["player_id", "event_id"],
        select: { player_id: true },
      });

      // Raggruppa e conta le entries per player_id
      const entriesMap = new Map<string, number>();
      participations.forEach(p => {
        entriesMap.set(p.player_id, (entriesMap.get(p.player_id) || 0) + 1);
      });

      entriesData = Array.from(entriesMap.entries())
        .map(([player_id, entries]) => ({ player_id, entries }))
        .sort((a, b) => b.entries - a.entries)
        .slice(0, 100);
    } else {
      // Nessun filtro → usa la view mVEntries
      const topPlayed = await prisma.mVEntries.findMany({
        orderBy: { tournaments_played: "desc" },
        take: 100,
        select: { player_id: true, tournaments_played: true },
      });

      entriesData = topPlayed.map(p => ({
        player_id: p.player_id,
        entries: p.tournaments_played,
      }));
    }

    const playerIds = entriesData.map(e => e.player_id);

    // Recupera i nomi e le bandierine
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, atpname: true, ioc: true },
    });

    type PlayerInfo = { name: string; ioc: string | null };
    const playerMap = new Map<string, PlayerInfo>(players.map(p => [
      p.id,
      { name: p.atpname ?? p.player ?? "(Unknown)", ioc: p.ioc ?? null }
    ]));

    topEntries = entriesData.map(e => ({
      id: e.player_id,
      name: playerMap.get(e.player_id)?.name ?? "(Unknown)",
      ioc: playerMap.get(e.player_id)?.ioc ?? null,
      entries: e.entries,
    }));

    totalCount = topEntries.length;

    return NextResponse.json({ topEntries, totalCount });
  } catch (error) {
    console.error("[GET /records/participations] Error:", error);
    return NextResponse.json({ topEntries: [], totalCount: 0 }, { status: 500 });
  }
}
