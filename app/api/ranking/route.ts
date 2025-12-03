import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  try {
    const whereClause = dateParam
      ? { rankingDate: { date: new Date(dateParam) } }
      : {};

    const rankings = await prisma.ranking.findMany({
      where: whereClause,
      include: { player: { select: { player: true, ioc: true } } },
      orderBy: { rank: "asc" },
      take: 200, // solo i primi 200 giocatori
    });

    const result = rankings.map(r => ({
      id: r.playerId,
      name: r.player?.player || "Unknown",
      points: r.points,
      ioc: r.player?.ioc || null,
      rank: r.rank,
    }));

    return NextResponse.json({ rankings: result });
  } catch (err: any) {
    console.error("Errore recupero ranking:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei ranking" },
      { status: 500 }
    );
  }
}
