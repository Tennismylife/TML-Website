
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
    const isYoungest = typeParam === "youngest";

    // Fetch distinct winners with age info
    const playersWinner = await prisma.match.findMany({
      where: {
        round: "F",
        team_event: false,
        winner_age: { not: null },
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

    // Ordina e limita a 100 elementi
    const playersSorted = Array.from(playersMap.values())
      .sort((a, b) => (isYoungest ? a.age - b.age : b.age - a.age))
      .slice(0, 100);

    const responseKey = isYoungest ? "youngestWinners" : "oldestWinners";

    return NextResponse.json({ [responseKey]: playersSorted });
  } catch (error) {
    console.error("Error fetching winners:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
