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

      // Resolve tourney slugs for matches so clients can link to canonical slug URLs
      const tourneyIdParts = Array.from(new Set(matches.map((m) => {
        const s = String(m.tourney_id || '');
        const parts = s.split('-').filter(Boolean);
        return parts.length === 2 ? parts[1] : s;
      }).filter(Boolean)));

      let tourneyMap: Record<string, string | null> = {};
      try {
        if (tourneyIdParts.length > 0) {
          const tours = await prisma.tournament.findMany({ where: { id: { in: tourneyIdParts.map((v) => Number(v)) } }, select: { id: true, slug: true } });
          tourneyMap = tours.reduce((acc: Record<string, string | null>, t: any) => { acc[String(t.id)] = t.slug ?? null; return acc; }, {});
        }
      } catch (err) {
        // best-effort: if lookup fails, continue without tourney_slug
        tourneyMap = {};
      }

      const enriched = matches.map(m => ({
        ...m,
        winner_slug: m.winner_id ? (slugMap[String(m.winner_id)] ?? null) : null,
        loser_slug: m.loser_id ? (slugMap[String(m.loser_id)] ?? null) : null,
        tourney_slug: (() => {
          const s = String(m.tourney_id || '');
          const parts = s.split('-').filter(Boolean);
          const idPart = parts.length === 2 ? parts[1] : s;
          return idPart ? (tourneyMap[String(idPart)] ?? null) : null;
        })(),
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
