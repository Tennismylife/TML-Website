// app/api/recordsranking/eoy-rank-timespan/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rank = Number(url.searchParams.get("rank") ?? NaN);
    if (!Number.isInteger(rank) || rank < 1) {
      return NextResponse.json({ error: "Param 'rank' non valido (>= 1)" }, { status: 400 });
    }

    // (Opzionali) bound temporali
    const fromYearParam = url.searchParams.get("fromYear");
    const toYearParam   = url.searchParams.get("toYear");
    const fromYear = fromYearParam ? Number(fromYearParam) : null;
    const toYear   = toYearParam   ? Number(toYearParam)   : null;
    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear   !== null && (!Number.isInteger(toYear)   || toYear   < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json({ error: "Parametri 'fromYear'/'toYear' non validi." }, { status: 400 });
    }

    // 1) Estrai le RankingDate e ricava gli anni (con eventuali bound)
    const dateWhere: any = {};
    if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear, 0, 1));
    if (toYear   !== null) dateWhere.lt  = new Date(Date.UTC(toYear + 1, 0, 1));

    const allDates = await prisma.rankingDate.findMany({
      where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined,
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (years.length === 0) return NextResponse.json([]);

    // 2) Per ogni anno trova l’ultima data (EOY)
    const lastPerYear = await Promise.all(
      years.map(async (year) => {
        const last = await prisma.rankingDate.findFirst({
          where: {
            date: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lt:  new Date(Date.UTC(year + 1, 0, 1)),
            },
          },
          orderBy: { date: "desc" },
          select: { id: true, date: true },
        });
        return last ? { year, id: last.id } : null;
      })
    );
    const eoy = (lastPerYear.filter(Boolean) as { year: number; id: number }[]);
    if (eoy.length === 0) return NextResponse.json([]);

    const eoyIds   = eoy.map(x => x.id);
    const yearById = new Map<number, number>(eoy.map(x => [x.id, x.year]));

    // 3) Record EOY con rank ESATTO X
    const rows = await prisma.ranking.findMany({
      where: { rank, rankingDateId: { in: eoyIds } },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true } },
        rankingDateId: true,
      },
    });

    if (rows.length === 0) return NextResponse.json([]);

    // 4) Aggrega anni EOY per player → first/last
    type Agg = { name: string; ioc: string | null; firstYear: number; lastYear: number };
    const byPlayer = new Map<string, Agg>();

    for (const r of rows) {
      const id   = String(r.playerId);
      const year = yearById.get(r.rankingDateId)!;
      const prev = byPlayer.get(id);
      if (!prev) {
        byPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, firstYear: year, lastYear: year });
      } else {
        if (year < prev.firstYear) prev.firstYear = year;
        if (year > prev.lastYear)  prev.lastYear  = year;
      }
    }

    // 5) Output: calcola spanYears e **filtra via** spanYears = 0
    const data = Array.from(byPlayer.entries())
      .map(([id, v]) => {
        const spanYears = Math.max(0, v.lastYear - v.firstYear);
        return {
          id,                 // string
          name: v.name,
          ioc: v.ioc,
          firstYear: v.firstYear,
          lastYear:  v.lastYear,
          spanYears,
        };
      })
      .filter(row => row.spanYears > 0) // <-- salta i casi con years = 0
      .sort(
        (a, b) =>
          b.spanYears - a.spanYears ||
          b.lastYear - a.lastYear ||
          a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error computing EOY rank-X timespan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}