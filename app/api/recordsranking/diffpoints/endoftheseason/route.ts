// /app/api/recordsranking/diffpoints/yearend/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1) Prendi tutte le rankingDate (id, date)
    const rankingDates = await prisma.rankingDate.findMany({
      select: { id: true, date: true },
      orderBy: { date: "asc" },
    });

    // 2) Per ogni anno, tieni solo l'ultima data disponibile (fine anno)
    const byYear = new Map<number, { id: number; date: Date }>();
    for (const rd of rankingDates) {
      const y = rd.date.getUTCFullYear();
      const cur = byYear.get(y);
      if (!cur || rd.date > cur.date) byYear.set(y, { id: rd.id, date: rd.date });
    }

    const yearEnd = Array.from(byYear.values());
    if (yearEnd.length === 0) return NextResponse.json([]);

    const yearEndIds = yearEnd.map(v => v.id);
    const yearById = new Map<number, number>(
      yearEnd.map(v => [v.id, v.date.getUTCFullYear()])
    );

    // 3) Estrai rank 1 e 2 per le sole date di fine anno (single round-trip)
    const rows = await prisma.ranking.findMany({
      where: {
        rankingDateId: { in: yearEndIds },
        rank: { in: [1, 2] },
      },
      select: {
        rank: true,
        points: true,
        rankingDateId: true,
        player: { select: { atpname: true, ioc: true } },
      },
      orderBy: [
        { rankingDateId: "asc" },
        { rank: "asc" },
      ],
    });

    // 4) Raggruppa per rankingDateId e costruisci risultati (senza 'date', solo 'year')
    type Row = typeof rows[number];
    const byDate = new Map<number, Row[]>();
    for (const r of rows) {
      if (!byDate.has(r.rankingDateId)) byDate.set(r.rankingDateId, []);
      byDate.get(r.rankingDateId)!.push(r);
    }

    const results: {
      rank: number;
      year: number;
      country: string | null;       // IOC No.1
      country_no2: string | null;   // IOC No.2
      name: string;                 // No.1
      no2: string;                  // No.2
      points_no1: number;
      points_no2: number;
      points_diff: number;
    }[] = [];

    for (const [rdId, items] of byDate.entries()) {
      if (items.length !== 2) continue; // ci aspettiamo rank 1 e 2
      const no1 = items[0]; // rank 1
      const no2 = items[1]; // rank 2

      const p1 = typeof no1.points === "bigint" ? Number(no1.points) : (no1.points ?? 0);
      const p2 = typeof no2.points === "bigint" ? Number(no2.points) : (no2.points ?? 0);

      results.push({
        rank: 0,
        year: yearById.get(rdId)!,
        country: no1.player?.ioc ?? null,
        country_no2: no2.player?.ioc ?? null,
        name: no1.player?.atpname ?? "Unknown",
        no2: no2.player?.atpname ?? "Unknown",
        points_no1: p1,
        points_no2: p2,
        points_diff: p1 - p2,
      });
    }

    // 5) Ordina per differenza decrescente (tie-break: anno più recente) e assegna rank
    results.sort((a, b) => b.points_diff - a.points_diff || b.year - a.year);
    results.forEach((r, i) => { r.rank = i + 1; });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error computing year-end difference (year-only):", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}