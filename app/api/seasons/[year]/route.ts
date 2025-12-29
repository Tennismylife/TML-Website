import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: { params: Promise<{ year: string }> }) {
  try {
    // await params (required in app router when route is async/client-aware)
    const p = await context.params;
    const yearRaw = String(p?.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }

    // Recupera i match di quell’anno escludendo solo i tornei di livello 'D' (Davis Cup)
    const matches = await prisma.match.findMany({
      where: {
        year: year,
        NOT: { tourney_level: "D" },
      },
      select: {
        id: true,
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        year: true,
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
      // Group tournaments by name + season year (use match.year, not tourney_date)
      const key = `${m.tourney_name}__${(m as any).year ?? "unknown"}`;
      if (!tourneyMap.has(key)) tourneyMap.set(key, []);
      tourneyMap.get(key)!.push(m);
    }

    // Costruisci i "TourneyTile"
    const tourneys = Array.from(tourneyMap.entries()).map(([key, arr]) => {
      const rep = arr[0];
      const finalMatch = arr.find(m => m.round === "F");

      // Compute the tournament start date as the earliest tourney_date among matches in the group
      const dateTsArr = arr
        .map((m) => (m.tourney_date ? new Date(m.tourney_date).getTime() : 0))
        .filter(Boolean);
      const startTs = dateTsArr.length ? Math.min(...dateTsArr) : (rep.tourney_date ? new Date(rep.tourney_date).getTime() : 0);
      const startDate = startTs ? new Date(startTs) : rep.tourney_date;

      return {
        key,
        name: rep.tourney_name ?? "Unknown",
        date: startDate,
        year: (rep as any).year ?? null,
        surface: rep.surface ?? null,
        level: rep.tourney_level ?? null,
        matches: arr.length,
        hasFinal: Boolean(finalMatch),
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

    // Ordina i tornei per data (più vecchio -> più recente), poi per nome
    tourneys.sort((a, b) => {
      const ad = new Date(a.date ?? 0).getTime();
      const bd = new Date(b.date ?? 0).getTime();
      const diff = ad - bd;
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });

    return NextResponse.json(tourneys);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
