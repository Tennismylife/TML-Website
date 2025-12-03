import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request) {
  try {
    // 1) Estrai tutte le rankingDate e ricava gli anni (UTC)
    const allDates = await prisma.rankingDate.findMany({
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (allYears.length === 0) {
      return NextResponse.json([]);
    }

    // 2) Trova la last ranking date per ogni anno
    const lastDates = await Promise.all(
      allYears.map(async (year) => {
        const last = await prisma.rankingDate.findFirst({
          where: {
            date: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lt: new Date(Date.UTC(year + 1, 0, 1)),
            },
          },
          orderBy: { date: "desc" },
          select: { id: true, date: true },
        });
        return last ? { year, id: last.id, date: last.date } : null;
      })
    );

    const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
    if (validLast.length === 0) {
      return NextResponse.json([]);
    }

    const lastDateIds = validLast.map(d => d.id);

    // 3) Considera solo i ranking di fine anno
    const grouped = await prisma.ranking.groupBy({
      by: ["playerId"],
      where: {
        rankingDateId: { in: lastDateIds },
      },
      _max: { points: true },
      orderBy: [{ _max: { points: "desc" } }],
      take: 100,
    });

    // 4) Recupera dettagli del record corrispondente per punti max
    const candidates = await prisma.ranking.findMany({
      where: {
        OR: grouped.map(g => ({
          playerId: g.playerId,
          points: g._max.points!,
          rankingDateId: { in: lastDateIds },
        })),
      },
      select: {
        playerId: true,
        points: true,
        rankingDate: { select: { date: true } },
        player: { select: { atpname: true, ioc: true } },
      },
    });

    // 5) Mappa playerId → dettaglio
    const candidateMap = new Map<string, typeof candidates[number]>();
    for (const row of candidates) {
      if (!candidateMap.has(row.playerId)) {
        candidateMap.set(row.playerId, row);
      }
    }

    // 6) Costruisci il risultato finale (solo anno)
    const result = grouped.map(g => {
      const row = candidateMap.get(g.playerId);
      const year = row?.rankingDate?.date
        ? row.rankingDate.date.getUTCFullYear()
        : null;

      return {
        name: row?.player?.atpname ?? "Unknown",
        country: row?.player?.ioc ?? "UNK",
        points: g._max.points ?? 0,
        year: year ?? "N/A",
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching year-end max points:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
