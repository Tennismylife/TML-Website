// app/api/recordsranking/endofseason/top/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const topParam = url.searchParams.get("top");
    const top = Number(topParam ?? 1);

    // Validazione top
    if (!Number.isInteger(top) || top < 1 || top > 50) {
      return NextResponse.json(
        { error: "Param 'top' non valido. Usa un intero tra 1 e 50." },
        { status: 400 }
      );
    }

    // (Opzionale) filtri per range di anni: ?fromYear=2000&toYear=2024
    const fromYear = url.searchParams.get("fromYear")
      ? Number(url.searchParams.get("fromYear"))
      : null;
    const toYear = url.searchParams.get("toYear")
      ? Number(url.searchParams.get("toYear"))
      : null;
    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear !== null && (!Number.isInteger(toYear) || toYear < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json(
        { error: "Parametri 'fromYear'/'toYear' non validi." },
        { status: 400 }
      );
    }

    // 1) Estrai tutte le rankingDate per ricavare gli anni (UTC)
    const dateWhere: any = {};
    if (fromYear !== null || toYear !== null) {
      const gte = fromYear !== null ? new Date(Date.UTC(fromYear, 0, 1)) : undefined;
      const lt = toYear !== null ? new Date(Date.UTC(toYear + 1, 0, 1)) : undefined;
      dateWhere.date = {};
      if (gte) dateWhere.date.gte = gte;
      if (lt) dateWhere.date.lt = lt;
    }

    const allDates = await prisma.rankingDate.findMany({
      where: dateWhere,
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const allYears = Array.from(new Set(allDates.map((d) => d.date.getUTCFullYear())));
    if (allYears.length === 0) {
      return NextResponse.json([]); // nessuna stagione
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

    const validLast = (lastDates.filter(Boolean) as {
      year: number;
      id: number;
      date: Date;
    }[]);
    if (validLast.length === 0) {
      return NextResponse.json([]);
    }

    const lastDateIds = validLast.map((d) => d.id);

    // 3) Trova i giocatori con rank <= top in quelle last dates
    const rows = await prisma.ranking.findMany({
      where: {
        rank: { lte: top },
        rankingDateId: { in: lastDateIds },
      },
      select: {
        playerId: true,
        rank: true,
        player: { select: { atpname: true, ioc: true } },
        rankingDate: { select: { date: true } },
      },
    });

    // 4) Aggrega: conteggio e stagioni per tennista
    type Agg = {
      name: string;
      ioc: string | null;
      endYearTopCount: number;
      seasons: Set<number>;
    };
    const agg = new Map<string, Agg>(); // playerId come stringa

    for (const r of rows) {
      const id = String(r.playerId);
      const year = r.rankingDate.date.getUTCFullYear();

      let a = agg.get(id);
      if (!a) {
        a = {
          name: r.player.atpname,
          ioc: r.player.ioc,
          endYearTopCount: 0,
          seasons: new Set<number>(),
        };
        agg.set(id, a);
      }
      // Ogni riga è una stagione in cui il player ha rank <= top nella last date:
      // incrementa 1 volta per stagione (nessun duplicato perché last date è unica per anno)
      if (!a.seasons.has(year)) {
        a.seasons.add(year);
        a.endYearTopCount += 1;
      }
    }

    const data = Array.from(agg.entries())
      .map(([id, v]) => ({
        id, // string
        name: v.name,
        ioc: v.ioc,
        endYearTopCount: v.endYearTopCount,
        seasons: Array.from(v.seasons).sort((a, b) => a - b),
      }))
      .sort(
        (a, b) =>
          b.endYearTopCount - a.endYearTopCount ||
          a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching end-of-season Top-X data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}