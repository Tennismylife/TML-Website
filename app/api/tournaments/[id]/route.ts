import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

  const tournamentId = parseInt(id);

  if (isNaN(tournamentId)) {
    return NextResponse.json({ error: "ID non valido" }, { status: 400 });
  }
    // AO 1977: due edizioni speciali
    const tourneyIds =
      tournamentId === 580 ? ["580", "581"] : [tournamentId.toString()];

    const matchSelect = {
      year: true,
      tourney_id: true,
      tourney_date: true,
      draw_size: true,
      round: true,
      surface: true,
      winner_id: true,
      winner_name: true,
      winner_ioc: true,
      loser_id: true,
      loser_name: true,
      loser_ioc: true,
      score: true,
    };

    // Recupera solo le finali
    const editionsData = await prisma.match.findMany({
      where: {
        tourney_id: { in: tourneyIds },
        round: "F",
      },
      select: matchSelect,
      orderBy: { tourney_date: "desc" },
    });

    const editionsWithNumericId = editionsData.map(match => ({
      ...match,
      tourney_id: parseInt(match.tourney_id),
    }));

    return NextResponse.json({ editionsData: editionsWithNumericId });
  } catch (e: any) {
    console.error("GET /api/tournaments/[id] error:", e);
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
