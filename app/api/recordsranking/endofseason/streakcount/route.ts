import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // Parametro obbligatorio 'rank'
    const rankParam = url.searchParams.get("rank");
    const rank = Number(rankParam ?? NaN);
    if (!Number.isInteger(rank) || rank < 1) {
      return NextResponse.json({ error: "Param 'rank' è obbligatorio e deve essere >= 1" }, { status: 400 });
    }

    // Parametri opzionali
    const fromYearParam = url.searchParams.get("fromYear");
    const toYearParam = url.searchParams.get("toYear");
    const includeAll = url.searchParams.get("includeAll") === "1";

    const fromYear = fromYearParam ? Number(fromYearParam) : null;
    const toYear = toYearParam ? Number(toYearParam) : null;

    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear !== null && (!Number.isInteger(toYear) || toYear < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json({ error: "Parametri 'fromYear'/'toYear' non validi." }, { status: 400 });
    }

    // Recupera tutte le rankingDate filtrate per anno, se specificato
    const dateWhere: any = {};
    if (fromYear !== null || toYear !== null) {
      const gte = fromYear !== null ? new Date(Date.UTC(fromYear, 0, 1)) : undefined;
      const lt = toYear !== null ? new Date(Date.UTC((toYear ?? fromYear!) + 1, 0, 1)) : undefined;
      dateWhere.date = {};
      if (gte) dateWhere.date.gte = gte;
      if (lt) dateWhere.date.lt = lt;
    }

    const allDates = await prisma.rankingDate.findMany({
      where: dateWhere,
      select: { date: true },
      orderBy: { date: "asc" },
    });

    const allYears = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (allYears.length === 0) return NextResponse.json([]);

    // Trova l’ultima rankingDate per ciascun anno
    const lastDates = await Promise.all(
      allYears.map(async (year) => {
        const last = await prisma.rankingDate.findFirst({
          where: { date: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
          orderBy: { date: "desc" },
          select: { id: true, date: true },
        });
        return last ? { year, id: last.id, date: last.date } : null;
      })
    );

    const validLast = (lastDates.filter(Boolean) as { year: number; id: number; date: Date }[]);
    if (validLast.length === 0) return NextResponse.json([]);
    const lastDateIds = validLast.map(d => d.id);

    // Recupera tutti i ranking con il rank richiesto
    const rows = await prisma.ranking.findMany({
      where: { rank, rankingDateId: { in: lastDateIds } },
      select: { playerId: true, player: { select: { atpname: true, ioc: true } }, rankingDate: { select: { date: true } } },
    });

    // Funzione per calcolare streaks consecutive
    function computeStreaks(sortedYears: number[]): number[][] {
      const streaks: number[][] = [];
      if (sortedYears.length === 0) return streaks;
      let curr: number[] = [sortedYears[0]];
      for (let i = 1; i < sortedYears.length; i++) {
        const y = sortedYears[i];
        if (y === curr[curr.length - 1] + 1) curr.push(y);
        else { streaks.push(curr); curr = [y]; }
      }
      streaks.push(curr);
      return streaks;
    }

    // Costruisci i record separati per ogni streak di ciascun giocatore
    const data: any[] = [];
    const playersMap = new Map<string, { name: string; ioc: string | null }>();
    rows.forEach(r => playersMap.set(String(r.playerId), { name: r.player.atpname, ioc: r.player.ioc }));

    // Raggruppa per giocatore per calcolare le streaks
    const grouped = new Map<string, number[]>();
    rows.forEach(r => {
      const id = String(r.playerId);
      const years = grouped.get(id) ?? [];
      years.push(r.rankingDate.date.getUTCFullYear());
      grouped.set(id, years);
    });

    for (const [playerId, yearsList] of grouped.entries()) {
      const years = Array.from(new Set(yearsList)).sort((a, b) => a - b);
      let streaks = computeStreaks(years);
      streaks = streaks.filter(s => s.length > 1); // solo streak ≥2
      if (streaks.length === 0) continue;

      for (const s of streaks) {
        const info = playersMap.get(playerId)!;
        data.push(includeAll
          ? {
              id: playerId,
              name: info.name,
              ioc: info.ioc,
              longestStreak: s.length,
              seasons: s,
              streaks: streaks.map(st => ({ length: st.length, seasons: st })),
            }
          : {
              id: playerId,
              name: info.name,
              ioc: info.ioc,
              longestStreak: s.length,
              seasons: s,
            });
      }
    }

    // Ordina per lunghezza streak e poi alfabeticamente
    data.sort(
      (a: any, b: any) =>
        b.longestStreak - a.longestStreak ||
        a.name.localeCompare(b.name, "en", { sensitivity: "base" })
    );

    return NextResponse.json(data);

  } catch (error) {
    console.error("Error fetching EOY streaks:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
