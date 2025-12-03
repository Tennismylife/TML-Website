import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const selectedSurfaces = searchParams.getAll("surface");
    const selectedLevels = searchParams.getAll("level");

    // Contiamo i titoli usando findMany e aggregazione
    const topTitles = await prisma.match.groupBy({
      by: ["winner_id", "winner_name", "winner_ioc"],
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        round: "F",
        team_event: false,
        NOT: { OR: [{ score: { contains: "WEA" } }] },
      },
      _count: { winner_id: true },
      orderBy: { _count: { winner_id: "desc" } },
    });

    // Prendiamo solo i primi 100
    const top100 = topTitles.slice(0, 100);

    const formattedTitles = top100.map((t) => ({
      id: String(t.winner_id),
      name: t.winner_name,
      ioc: t.winner_ioc || "",
      count: t._count.winner_id,
    }));

    return NextResponse.json({ topTitles: formattedTitles });
  } catch (error) {
    console.error("Error fetching titles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
