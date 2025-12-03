import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, context: any) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json(
      { error: "Parametro 'id' mancante" },
      { status: 400 }
    );
  }

  const yearParam = context?.params?.year;
  const yearNumber = parseInt(String(yearParam), 10);

  if (isNaN(yearNumber)) {
    return NextResponse.json(
      { error: "Parametro 'year' non valido" },
      { status: 400 }
    );
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ winner_id: playerId }, { loser_id: playerId }],
        year: yearNumber,
      },
      orderBy: { tourney_date: "asc" },
      select: {
        id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        score: true,
        tourney_level: true,
        surface: true,
        best_of: true,
        minutes: true,
        draw_size: true,
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
        winner_rank: true,
        loser_rank: true,
        winner_age: true,
        loser_age: true,
        team_event: true,
      },
    });

    return NextResponse.json(matches);
  } catch (err: any) {
    console.error("Errore recupero match:", err.message ?? err);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei match" },
      { status: 500 }
    );
  }
}
