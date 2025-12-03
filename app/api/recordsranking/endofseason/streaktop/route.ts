// app/api/recordsranking/endofseason/top-streak/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const topParam = url.searchParams.get("top");
    const top = Number(topParam ?? NaN);
    if (!Number.isInteger(top) || top < 1 || top > 50) {
      return NextResponse.json(
        { error: "Param 'top' è obbligatorio e deve essere un intero 1..50" },
        { status: 400 }
      );
    }

    const fromYearParam = url.searchParams.get("fromYear");
    const toYearParam   = url.searchParams.get("toYear");
    const fromYear = fromYearParam ? Number(fromYearParam) : null;
    const toYear   = toYearParam   ? Number(toYearParam)   : null;

    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear   !== null && (!Number.isInteger(toYear)   || toYear   < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json(
        { error: "Parametri 'fromYear'/'toYear' non validi." },
        { status: 400 }
      );
    }

    // 1) Ricava gli anni disponibili (UTC-safe)
    const dateWhere: any = {};
    if (fromYear !== null || toYear !== null) {
      const gte = fromYear !== null ? new Date(Date.UTC(fromYear, 0, 1)) : undefined;
      const lt  = toYear   !== null ? new Date(Date.UTC(toYear + 1, 0, 1)) : undefined;
      dateWhere.date = {};
      if (gte) dateWhere.date.gte = gte;
      if (lt)  dateWhere.date.lt  = lt;
    }

    const allDates = await prisma.rankingDate.findMany({
      where: dateWhere,
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (allYears.length === 0) {
      return NextResponse.json([]);
    }

    // 2) Last ranking date per anno
    const lastDates = await Promise.all(
      allYears.map(async (year) => {
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
        return last ? { year, id: last.id, date: last.date } : null;
      })
    );

    const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
    if (validLast.length === 0) {
      return NextResponse.json([]);
    }
    const lastDateIds = validLast.map(d => d.id);

    // 3) Ranking EOY in Top X
    const rows = await prisma.ranking.findMany({
      where: {
        rank: { lte: top },
        rankingDateId: { in: lastDateIds },
      },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true } },
        rankingDate: { select: { date: true } },
      },
    });

    // 4) Aggrega anni per player
    const byPlayer = new Map<string, { name: string; ioc: string | null; years: number[] }>();
    for (const r of rows) {
      const id = String(r.playerId);
      const year = r.rankingDate.date.getUTCFullYear();
      let rec = byPlayer.get(id);
      if (!rec) {
        rec = { name: r.player.atpname, ioc: r.player.ioc, years: [] };
        byPlayer.set(id, rec);
      }
      rec.years.push(year);
    }

    // Utility: spezza in strisce consecutive
    function computeStreaks(sortedYears: number[]): number[][] {
      const streaks: number[][] = [];
      if (sortedYears.length === 0) return streaks;
      let curr: number[] = [sortedYears[0]];
      for (let i = 1; i < sortedYears.length; i++) {
        const y = sortedYears[i];
        if (y === curr[curr.length - 1] + 1) {
          curr.push(y);
        } else {
          streaks.push(curr);
          curr = [y];
        }
      }
      streaks.push(curr);
      return streaks;
    }

    // 5) FLATTEN: una riga per striscia (signature invariata)
    const data = Array.from(byPlayer.entries())
      .flatMap(([id, info]) => {
        const years = Array.from(new Set(info.years)).sort((a, b) => a - b);
        const streaks = computeStreaks(years);
        return streaks.map(s => ({
          id,
          name: info.name,
          ioc: info.ioc,
          longestTopStreak: s.length, // per compatibilità: lunghezza della singola striscia
          seasons: s,                 // anni della singola striscia
        }));
      })
      // Ordina per lunghezza desc, poi per ultimo anno desc, poi per nome
      .sort((a, b) =>
        b.longestTopStreak - a.longestTopStreak ||
        (b.seasons[b.seasons.length - 1] - a.seasons[a.seasons.length - 1]) ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching EOY Top-X streaks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}