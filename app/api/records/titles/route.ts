import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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
        NOT: { OR: [{ score: { contains: "WEA" } }, { score: "To play" }] },
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

    // Attach slugs when available
    const ids = formattedTitles.map(p => String(p.id));
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      const withSlugs = formattedTitles.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null }));
      return NextResponse.json({ topTitles: withSlugs });
    }

    return NextResponse.json({ topTitles: formattedTitles });
  } catch (error) {
    console.error("Error fetching titles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
