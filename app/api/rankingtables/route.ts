import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const year = request.nextUrl.searchParams.get("year");

    if (!year) {
      return NextResponse.json(
        { error: "Missing 'year' query param" },
        { status: 400 }
      );
    }

    const rows = await prisma.rankingTable.findMany({
      where: { year },
      orderBy: { tourney_date: "asc" },
      select: {
        year: true,
        tournament: true,
        tourney_id: true,
        tourney_date: true,
        prize_money: true,
        atp_category: true,
      },
    });

    // Attach tourney_slug when available in the tournaments table
    const tourneyIdParts = rows.map((r: any) => {
      const tid = String(r.tourney_id ?? "");
      return tid.includes("-") ? tid.split("-")[0] : tid;
    }).filter(Boolean);

    const uniqueTourneyIds = Array.from(new Set(tourneyIdParts.map(t => Number(t)).filter(n => Number.isFinite(n))));
    let rowsWithSlug = rows;

    if (uniqueTourneyIds.length > 0) {
      const tourneyRows = await prisma.tournament.findMany({ where: { id: { in: uniqueTourneyIds } }, select: { id: true, slug: true } });
      const tourneySlugMap = new Map(tourneyRows.map(r => [String(r.id), r.slug] as [string, string | null]));
      rowsWithSlug = rows.map((r: any) => {
        const tid = String(r.tourney_id ?? "");
        const tidPart = tid.includes("-") ? tid.split("-")[0] : tid;
        return { ...r, tourney_slug: tourneySlugMap.get(tidPart) ?? null };
      });
    }

    return NextResponse.json({ rows: rowsWithSlug });
  } catch (err: any) {
    console.error("Errore rankingTable:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei dati", details: err?.message },
      { status: 500 }
    );
  }
}
