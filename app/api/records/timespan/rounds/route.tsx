import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roundParam = searchParams.get("round");
    const selectedSurfaces = searchParams.getAll("surface");
    const selectedLevels = searchParams.getAll("level");

    if (!roundParam) {
      return NextResponse.json({ error: "Round parameter is required" }, { status: 400 });
    }

    // Prendi solo i tornei filtrati
    const tournaments = await prisma.playerTournament.findMany({
      where: {
        round: roundParam,
        ...(selectedSurfaces.length && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length && { tourney_level: { in: selectedLevels } }),
      },
      select: {
        player_id: true,
        player: { select: { atpname: true, ioc: true } },
        tourney_name: true,
        tourney_date: true,
      },
    });

    // Raggruppa per giocatore e calcola spanDays
    const playerMap = new Map<
      string,
      { name: string; ioc: string; firstDate: Date; lastDate: Date; firstTourney: string; lastTourney: string }
    >();

    for (const t of tournaments) {
      const key = t.player_id;
      const date = new Date(t.tourney_date);
      if (!playerMap.has(key)) {
        playerMap.set(key, {
          name: t.player.atpname || "",
          ioc: t.player.ioc || "",
          firstDate: date,
          lastDate: date,
          firstTourney: t.tourney_name,
          lastTourney: t.tourney_name,
        });
      } else {
        const player = playerMap.get(key)!;
        if (date < player.firstDate) {
          player.firstDate = date;
          player.firstTourney = t.tourney_name;
        }
        if (date > player.lastDate) {
          player.lastDate = date;
          player.lastTourney = t.tourney_name;
        }
      }
    }

    // Costruisci array dei risultati
    const data = Array.from(playerMap.entries()).map(([id, player]) => {
      const spanDays = Math.floor((player.lastDate.getTime() - player.firstDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id,
        name: player.name,
        ioc: player.ioc,
        firstTourney: player.firstTourney,
        firstDate: player.firstDate.toISOString().split("T")[0],
        lastTourney: player.lastTourney,
        lastDate: player.lastDate.toISOString().split("T")[0],
        spanDays,
      };
    });

    // Ordina e prendi top 100
    const top100 = data.sort((a, b) => b.spanDays - a.spanDays).slice(0, 100);

    return NextResponse.json({ data: top100, round: roundParam });
  } catch (error) {
    console.error("Error fetching player tournament timespan:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
