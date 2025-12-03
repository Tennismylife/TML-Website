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

    return NextResponse.json({ rows });
  } catch (err: any) {
    console.error("Errore rankingTable:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei dati", details: err?.message },
      { status: 500 }
    );
  }
}
