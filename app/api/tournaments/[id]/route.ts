import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');

  // resolve id param (supports numeric id or slug)
  const tourneyIds = await (await import('@/lib/tournament')).resolveTourneyIds(id);
  if (!tourneyIds) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

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
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
