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

    const result = grouped.map(g => {
      const row = candidateMap.get(g.playerId);
      return {
        name: row?.player?.atpname ?? "Unknown",
        country: row?.player?.ioc ?? "UNK",
        points: g._max.points ?? 0,
        date: row?.rankingDate.date.toISOString().slice(0, 10) ?? "N/A",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching max points:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}