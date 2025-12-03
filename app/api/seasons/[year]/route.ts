import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  try {
    // Recupera parametri dal contesto
    const params = context?.params ?? {};
    const yearRaw = String(params.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }

    // Recupera solo i match individuali di quell’anno
    const matches = await prisma.match.findMany({
      where: {
        year: year,
        team_event: false,
      },
      select: {
        id: true,
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        score: true,
        tourney_level: true,
        surface: true,
        draw_size: true,
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
      },
      orderBy: [{ tourney_date: "asc" }, { tourney_name: "asc" }],
    });

    type Match = (typeof matches)[number];
    const tourneyMap = new Map<string, Match[]>();

    // Raggruppa i match per torneo (senza più filtri “fuffa”)
    for (const m of matches) {
      if (!m.tourney_name) continue;
      const key = `${m.tourney_name}__${m.tourney_date?.toISOString().slice(0, 10) ?? "unknown"}`;
      if (!tourneyMap.has(key)) tourneyMap.set(key, []);
      tourneyMap.get(key)!.push(m);
    }

    // Costruisci i "TourneyTile"
    const tourneys = Array.from(tourneyMap.entries()).map(([key, arr]) => {
      const rep = arr[0];
      const finalMatch = arr.find(m => m.round === "F");
      return {
        key,
        name: rep.tourney_name ?? "Unknown",
        date: rep.tourney_date,
        surface: rep.surface ?? null,
        level: rep.tourney_level ?? null,
        matches: arr.length,
        winner: finalMatch?.winner_name ?? "Unknown",
        loser: finalMatch?.loser_name ?? "Unknown",
        score: finalMatch?.score ?? "-",
        tourney_id: rep.tourney_id,
        extractedId: rep.tourney_id.split("-").pop() ?? rep.tourney_id,
        winner_ioc: finalMatch?.winner_ioc ?? "",
        loser_ioc: finalMatch?.loser_ioc ?? "",
        draw_size: rep.draw_size ?? 0,
      };
    });

    // Ordina i tornei per data, poi per nome
    tourneys.sort((a, b) => {
      const diff = new Date(a.date ?? 0).getTime() - new Date(b.date ?? 0).getTime();
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    return NextResponse.json(tourneys);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
