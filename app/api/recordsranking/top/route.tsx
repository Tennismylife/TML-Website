import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const topParam = url.searchParams.get("top"); // legge ?top=2
    const top = topParam ? parseInt(topParam, 10) : 2;

    // Conta il numero di settimane in cui il giocatore è stato nel Top X
    const weeksInTopX = await prisma.ranking.groupBy({
      by: ["playerId"],
      where: { rank: { lte: top } }, // rank <= top
      _count: { rankingDateId: true },
    });

    const playerIds = weeksInTopX.map(r => r.playerId);

    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    const nameMap = Object.fromEntries(players.map(p => [p.id, p.atpname]));
    const iocMap = Object.fromEntries(players.map(p => [p.id, p.ioc]));

    const result = weeksInTopX
      .map(r => ({
        id: r.playerId,
        name: nameMap[r.playerId] ?? "Unknown",
        ioc: iocMap[r.playerId] ?? null,
        weeks: r._count.rankingDateId,
      }))
      .sort((a, b) => b.weeks - a.weeks);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching Top X data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
