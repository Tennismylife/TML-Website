import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  try {
    // make sure to include the related date object so we can return it
    const rows = await prisma.ranking.findMany({
      where: { playerId: playerId },
      include: { rankingDate: true },
      orderBy: { rankingDate: { date: 'asc' } },
    });

    const result = rows.map((r) => ({
      // rankingDate is now an object with `date` property
      date: r.rankingDate && r.rankingDate.date ? r.rankingDate.date.toISOString() : null,
      rank: r.rank,
      points: r.points,
    }));

    return NextResponse.json({ rankings: result });
  } catch (err: any) {
    console.error("Errore recupero ranking giocatore:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei ranking del giocatore" },
      { status: 500 }
    );
  }
}
