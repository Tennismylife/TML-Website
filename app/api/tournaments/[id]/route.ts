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
      tourney_level: true,
      tourney_name: true,
      winner_id: true,
      winner_name: true,
      winner_ioc: true,
      loser_id: true,
      loser_name: true,
      loser_ioc: true,
      score: true,
    };

    // Recupera solo le finali
    const tourneyIdFilters = tourneyIds.flatMap((tid: string) => [{ tourney_id: tid }, { tourney_id: { endsWith: `-${tid}` } }]);

    const editionsData = await prisma.match.findMany({
      where: {
        OR: tourneyIdFilters,
        round: "F",
      },
      select: matchSelect,
      orderBy: { tourney_date: "desc" },
    });

    const editionsWithNumericId = editionsData.map(match => ({
      ...match,
      tourney_id: parseInt(match.tourney_id),
    }));

    // Determine if the caller wants categories derived only from matches
    const useMatchesOnly = request.nextUrl?.searchParams?.get('source') === 'matches';

    // Enrich editions: by default try RankingTable for per-year atp_category, otherwise fall back to match.tourney_level
    const enriched = await Promise.all(editionsWithNumericId.map(async (m) => {
      let atpCategory: string | null = m.tourney_level || null;
      if (!useMatchesOnly) {
        try {
          const rt = await prisma.rankingTable.findFirst({
            where: {
              tourney_id: String(m.tourney_id),
              year: String(m.year),
            },
            select: { atp_category: true },
          });
          if (rt && rt.atp_category) atpCategory = rt.atp_category;
        } catch (err) {
          // ignore and keep fallback
        }
      }
      return { ...m, atpCategory };
    }));

    return NextResponse.json({ editionsData: enriched });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "Server error" },
      { status: 500 }
    );
  }
}
