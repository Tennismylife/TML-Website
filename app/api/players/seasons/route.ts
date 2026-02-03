import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const playerId = url.searchParams.get("id");

  if (!playerId) {
    return NextResponse.json({ error: "Parametro 'id' mancante" }, { status: 400 });
  }

  try {
    const rows = await prisma.match.groupBy({
      by: ["year"],
      where: {
        OR: [{ winner_id: playerId }, { loser_id: playerId }],
        year: { not: null },
      },
      orderBy: { year: "desc" },
    });

    const years = rows.map(r => r.year as number).filter((y) => typeof y === 'number');

    return NextResponse.json(years, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (err: any) {
    console.error("Errore recupero stagioni giocatore:", err.message ?? err);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}
