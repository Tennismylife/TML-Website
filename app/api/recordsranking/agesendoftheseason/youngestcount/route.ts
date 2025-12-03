// app/api/recordsranking/youngest-eoy/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function diffYMD(birth: Date, ref: Date) {
  let y = ref.getUTCFullYear() - birth.getUTCFullYear();
  let m = ref.getUTCMonth() - birth.getUTCMonth();
  let d = ref.getUTCDate() - birth.getUTCDate();
  if (d < 0) {
    const prevMonth = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), 0));
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
    const rank = Number(url.searchParams.get("rank") ?? NaN);
    if (!Number.isInteger(rank) || rank < 1) {
      return NextResponse.json({ error: "Param 'rank' non valido (>=1)" }, { status: 400 });
    }
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

    const fromYearParam = url.searchParams.get("fromYear");
    const toYearParam = url.searchParams.get("toYear");
    const fromYear = fromYearParam ? Number(fromYearParam) : null;
    const toYear = toYearParam ? Number(toYearParam) : null;
    if (
      (fromYear !== null && (!Number.isInteger(fromYear) || fromYear < 1900)) ||
      (toYear !== null && (!Number.isInteger(toYear) || toYear < 1900)) ||
      (fromYear !== null && toYear !== null && fromYear > toYear)
    ) {
      return NextResponse.json({ error: "Parametri 'fromYear'/'toYear' non validi." }, { status: 400 });
    }

    // 1) Ricava anni disponibili (con eventuali bound)
    const dateWhere: any = {};
    if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear, 0, 1));
    if (toYear !== null) dateWhere.lt = new Date(Date.UTC(toYear + 1, 0, 1));

    const allDates = await prisma.rankingDate.findMany({
      where: Object.keys(dateWhere).length ? { date: dateWhere } : undefined,
      select: { date: true },
      orderBy: { date: "asc" },
    });
    const years = Array.from(new Set(allDates.map(d => d.date.getUTCFullYear())));
    if (years.length === 0) return NextResponse.json([]);

    // 2) Last ranking date per anno
    const lastPerYear = await Promise.all(
      years.map(async (year) => {
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
    const last = (lastPerYear.filter(Boolean) as { year: number; id: number; date: Date }[]);
    if (last.length === 0) return NextResponse.json([]);

    const lastIds = last.map(x => x.id);
    const yearById = new Map<number, number>(last.map(x => [x.id, x.year]));

    // 3) Record EOY con rank esatto X
    const rows = await prisma.ranking.findMany({
      where: { rank, rankingDateId: { in: lastIds } },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true, birthdate: true } },
        rankingDateId: true,
        rankingDate: { select: { date: true } },
      },
    });

    // 4) Per player, età MINIMA a EOY No. X
    type MinRec = {
      name: string;
      ioc: string | null;
      year: number;
      date: Date;
      birth: Date;
      ageDays: number;
    };
    const bestByPlayer = new Map<string, MinRec>();

    for (const r of rows) {
      const id = String(r.playerId);
      const birth = r.player.birthdate;
      if (!birth) continue;
      const ref = r.rankingDate.date;
      if (ref < birth) continue;

      const ageDays = Math.floor((ref.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const recYear = yearById.get(r.rankingDateId)!;

      const prev = bestByPlayer.get(id);
      if (!prev || ageDays < prev.ageDays || (ageDays === prev.ageDays && ref < prev.date)) {
        bestByPlayer.set(id, {
          name: r.player.atpname,
          ioc: r.player.ioc,
          year: recYear,
          date: ref,
          birth,
          ageDays,
        });
      }
    }

    // 5) Output con SOLO anno
    const data = Array.from(bestByPlayer.entries())
      .map(([id, v]) => {
        const { y, m, d } = diffYMD(v.birth, v.date);
        return {
          id,
          name: v.name,
          ioc: v.ioc,
          ageDays: v.ageDays,
          ageLabel: `${y}y ${m}m ${d}d`,
          year: v.year, // <--- SOLO ANNO
        };
      })
      .sort((a, b) => a.ageDays - b.ageDays)
      .slice(0, limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error computing youngest EOY at rank X:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}