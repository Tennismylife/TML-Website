import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  try {
    // 1) Ottieni max points per player
    const grouped = await prisma.ranking.groupBy({
      by: ["playerId"],
      _max: { points: true },
      orderBy: [{ _max: { points: "desc" } }],
      take: 100,
    });

    const playerIds = grouped.map(g => g.playerId);

    // In some DB states player relation may be missing on ranking rows.
    // Fetch players directly as a fallback to avoid returning "Unknown" names.
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });
    const playersMap = new Map(players.map((p) => [p.id, p]));

    // 2) Recupera un record con quei punti (per avere nome, paese e data)
    const candidates = await prisma.ranking.findMany({
      where: {
        OR: grouped.map(g => ({
          playerId: g.playerId,
          points: g._max.points!,
        })),
      },
      select: {
        playerId: true,
        points: true,
        rankingDate: { select: { date: true } },
        player: { select: { atpname: true, ioc: true } },
      },
    });

    // Mappa diretta (primo record trovato per ogni player)
    const candidateMap = new Map<string, typeof candidates[number]>();
    for (const row of candidates) {
      if (!candidateMap.has(row.playerId)) {
        candidateMap.set(row.playerId, row);
      }
    }

    // Delegate to pure helper for building the result
    const { default: buildMostPointsResult } = await import("./utils");
    const result = buildMostPointsResult(grouped, candidates, players);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching max points:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}