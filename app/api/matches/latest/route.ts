import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const matches = await prisma.match.findMany({
      orderBy: [{ tourney_date: "desc" }, { id: "desc" }],
      where: {
        score: { not: "To play" },
      },
      take: 10,
      select: {
        id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        winner_name: true,
        winner_ioc: true,
        loser_name: true,
        loser_ioc: true,
        winner_id: true,
        loser_id: true,
        tourney_id: true,
        year: true,
        score: true,
        surface: true,
        tourney_level: true,
      },
    });

    try {
      const ids = Array.from(new Set(matches.flatMap(m => [m.winner_id, m.loser_id]).filter((id): id is string => !!id).map(String)));
      const { mapIdsToSlugs } = await import('@/lib/player-slugs');
      const slugMap = await mapIdsToSlugs(ids);
      const enriched = matches.map(m => ({
        ...m,
        winner_slug: m.winner_id ? (slugMap[String(m.winner_id)] ?? null) : null,
        loser_slug: m.loser_id ? (slugMap[String(m.loser_id)] ?? null) : null,
      }));
      return NextResponse.json(enriched);
    } catch (e) {
      return NextResponse.json(matches);
    }
  } catch (error) {
    console.error("Error fetching latest matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
