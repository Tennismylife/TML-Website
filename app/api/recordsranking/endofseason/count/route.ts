import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rank = Number(url.searchParams.get("rank") ?? 1);

    if (!Number.isInteger(rank) || rank < 1) {
      return NextResponse.json({ error: "Param 'rank' non valido" }, { status: 400 });
    }

    // 1) Estrai tutte le rankingDate e ricava gli anni (UTC)
    const allDates = await prisma.rankingDate.findMany({
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (allYears.length === 0) {
      return NextResponse.json([]); // solo data
    }

    // 2) Trova la last ranking date per ogni anno (massima data nell’anno)
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

    // 3) Trova chi ha il rank richiesto in quelle last dates
    const rows = await prisma.ranking.findMany({
      where: {
        rank,
        rankingDateId: { in: lastDateIds },
      },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true } },
        rankingDate: { select: { date: true } },
      },
    });

    // 4) Aggrega per tennista: conteggio e stagioni
    type Agg = { name: string; ioc: string | null; endYearCount: number; seasons: Set<number> };
    const agg = new Map<string, Agg>(); // playerId come stringa

    for (const r of rows) {
      const id = String(r.playerId);                     // <-- ID come stringa
      const year = r.rankingDate.date.getUTCFullYear();  // stagione

      let a = agg.get(id);
      if (!a) {
        a = { name: r.player.atpname, ioc: r.player.ioc, endYearCount: 0, seasons: new Set<number>() };
        agg.set(id, a);
      }
      a.endYearCount += 1;
      a.seasons.add(year);
    }

    const data = Array.from(agg.entries())
      .map(([id, v]) => ({
        id,                               // string
        name: v.name,
        ioc: v.ioc,
        endYearCount: v.endYearCount,
        seasons: Array.from(v.seasons).sort((a, b) => a - b),
      }))
      .sort((a, b) => (b.endYearCount - a.endYearCount) || a.name.localeCompare(b.name));

    // 5) Risposta: SOLO data
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching end-of-year ranking data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}