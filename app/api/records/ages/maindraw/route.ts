import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const surfacesParam = searchParams.getAll("surface");
    const levelsParam = searchParams.getAll("level");
    const roundsParam = searchParams.getAll("round");
    const typeParam = searchParams.get("type") || "oldest";
    const limitParam = Number(searchParams.get("limit")) || 100;
    const isYoungest = typeParam === "youngest";

    // Funzione per prendere top giocatori (winner + loser) direttamente dal DB
    const getTopPlayers = async (type: "winner" | "loser") => {
      return prisma.match.findMany({
        where: {
          team_event: false,
          [`${type}_age`]: { not: null },
          ...(surfacesParam.length > 0 && { surface: { in: surfacesParam } }),
          ...(levelsParam.length > 0 && { tourney_level: { in: levelsParam } }),
          ...(roundsParam.length > 0 && { round: { in: roundsParam } }),
        },
        select: {
          id: true,
          [`${type}_id`]: true,
          [`${type}_name`]: true,
          [`${type}_ioc`]: true,
          [`${type}_age`]: true,
          tourney_id: true,
          tourney_name: true,
          event_id: true,
          year: true,
        },
        orderBy: { [`${type}_age`]: isYoungest ? "asc" : "desc" },
        take: limitParam * 2, // prendiamo un buffer per eventuali duplicati
      });
    };

    // Parallelizza le query
    const [winners, losers] = await Promise.all([
      getTopPlayers("winner"),
      getTopPlayers("loser"),
    ]);

    // Unisci in mappa per evitare duplicati
    const playersMap = new Map<string, any>();

    const processPlayer = (p: any, type: "winner" | "loser") => {
      const key = `${p[type + "_id"]}_${p.event_id ?? "noEvent"}`;
      if (!playersMap.has(key)) {
        playersMap.set(key, {
          id: p[type + "_id"],
          name: p[type + "_name"],
          ioc: p[type + "_ioc"],
          age: p[type + "_age"],
          event_id: p.event_id ?? "noEvent",
          tourney_id: p.tourney_id,
          tourney_name: p.tourney_name,
          year: p.year,
        });
      }
    };

    winners.forEach(p => processPlayer(p, "winner"));
    losers.forEach(p => processPlayer(p, "loser"));

    // Ordina e limita il risultato finale
    const playersSorted = Array.from(playersMap.values())
      .sort((a, b) => (isYoungest ? a.age - b.age : b.age - a.age))
      .slice(0, limitParam);

    const responseKey = isYoungest ? "youngestPlayers" : "oldestPlayers";

    return NextResponse.json({ [responseKey]: playersSorted });
  } catch (error) {
    console.error("Error fetching players:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
