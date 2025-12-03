import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rankParam = url.searchParams.get("rank"); // legge ?rank=1
    const rank = rankParam ? parseInt(rankParam, 10) : 1;

    // Query: conta il numero di settimane per ciascun giocatore con il rank selezionato
    const weeksAtRank = await prisma.ranking.groupBy({
      by: ["playerId"],
      where: { rank },
      _count: { rankingDateId: true },
    });

    const playerIds = weeksAtRank.map(r => r.playerId);

    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    const nameMap = Object.fromEntries(players.map(p => [p.id, p.atpname]));
    const iocMap = Object.fromEntries(players.map(p => [p.id, p.ioc]));

    const result = weeksAtRank
      .map(r => ({
        id: r.playerId,
        name: nameMap[r.playerId] ?? "Unknown",
        ioc: iocMap[r.playerId] ?? null,
        weeks: r._count.rankingDateId,
      }))
      .sort((a, b) => b.weeks - a.weeks);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching ranking data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
