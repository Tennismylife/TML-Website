// app/api/recordsranking/timespan-top/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function diffYMD(a: Date, b: Date) {
  // differenza calendario (a -> b) in Y/M/D, UTC-safe
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0));
    d += prevMonth.getUTCDate();
    m -= 1;
  }
  if (m < 0) {
    m += 12;
    y -= 1;
  }
  return { y, m, d };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const top = Number(url.searchParams.get("top") ?? NaN);
    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido (>=1)" }, { status: 400 });
    }

    const eoy = url.searchParams.get("eoy") === "1";
    const limit = Math.min(2000, Math.max(1, Number(url.searchParams.get("limit") ?? 500)));

    // Filtri periodo (opzionali)
    const fromYearParam = url.searchParams.get("fromYear");
    const toYearParam = url.searchParams.get("toYear");
    const fromYear = fromYearParam ? Number(fromYearParam) : null;
    const toYear   = toYearParam   ? Number(toYearParam)   : null;
    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear !== null && (!Number.isInteger(toYear) || toYear < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json({ error: "Parametri 'fromYear'/'toYear' non validi." }, { status: 400 });
    }

    const dateBounds: any = {};
    if (fromYear !== null) dateBounds.gte = new Date(Date.UTC(fromYear, 0, 1));
    if (toYear !== null)   dateBounds.lt  = new Date(Date.UTC(toYear + 1, 0, 1));

    // 1) Seleziona le date target
    let targetRankingDateIds: number[] | null = null;
    if (eoy) {
      // Solo ultime date per anno (EOY)
      const allDates = await prisma.rankingDate.findMany({
        where: Object.keys(dateBounds).length ? { date: dateBounds } : undefined,
        select: { date: true },
        orderBy: { date: "asc" },
      });
      const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
      if (years.length === 0) return NextResponse.json([]);

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
            select: { id: true },
          });
          return last?.id ?? null;
        })
      );
      targetRankingDateIds = lastPerYear.filter((x): x is number => x !== null);
      if (targetRankingDateIds.length === 0) return NextResponse.json([]);
    }

    // 2) Prendi tutte le occorrenze con rank <= top sulle date target
    const rows = await prisma.ranking.findMany({
      where: {
        rank: { lte: top },
        ...(targetRankingDateIds
          ? { rankingDateId: { in: targetRankingDateIds } }
          : (Object.keys(dateBounds).length
              ? { rankingDate: { date: dateBounds } }
              : {})),
      },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true } },
        rankingDate: { select: { date: true } },
      },
    });

    if (rows.length === 0) return NextResponse.json([]);

    // 3) Aggrega: per ciascun player, prima e ultima data in Top X
    type Agg = { name: string; ioc: string | null; min: Date; max: Date };
    const byPlayer = new Map<string, Agg>();

    for (const r of rows) {
      const id = String(r.playerId);
      const d  = r.rankingDate.date;
      const prev = byPlayer.get(id);
      if (!prev) {
        byPlayer.set(id, { name: r.player.atpname, ioc: r.player.ioc, min: d, max: d });
      } else {
        if (d < prev.min) prev.min = d;
        if (d > prev.max) prev.max = d;
      }
    }

    // 4) Output + ordinamento per timespan desc
    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const data = Array.from(byPlayer.entries())
      .map(([id, v]) => {
        const timespanDays = Math.max(0, Math.floor((v.max.getTime() - v.min.getTime()) / MS_PER_DAY));
        const { y, m, d } = diffYMD(v.min, v.max);
        return {
          id,
          name: v.name,
          ioc: v.ioc,
          firstDate: v.min.toISOString().slice(0, 10),
          lastDate:  v.max.toISOString().slice(0, 10),
          timespanDays,
          timespanLabel: `${y}y ${m}m ${d}d`,
        };
      })
      .sort(
        (a, b) =>
          b.timespanDays - a.timespanDays ||
          b.lastDate.localeCompare(a.lastDate) ||
          a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      )
      .slice(0, limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error computing Top-X timespan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}