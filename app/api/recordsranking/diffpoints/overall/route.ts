// /app/api/recordsranking/diffpoints/overall/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1) Preleva tutte le righe solo per rank 1 e 2 (unico round-trip)
    const rows = await prisma.ranking.findMany({
      where: { rank: { in: [1, 2] } },
      select: {
        rank: true,
        points: true,
        rankingDateId: true,
        rankingDate: { select: { date: true } },
        player: { select: { atpname: true, ioc: true } },
      },
      orderBy: [
        { rankingDateId: "asc" },
        { rank: "asc" },
      ],
    });

    // 2) Raggruppa per rankingDateId
    type Row = typeof rows[number];
    const byDate = new Map<number, { date: Date; items: Row[] }>();
    for (const r of rows) {
      const key = r.rankingDateId;
      if (!byDate.has(key)) byDate.set(key, { date: r.rankingDate!.date, items: [] });
      byDate.get(key)!.items.push(r);
    }

    // 3) Costruisci i risultati per ogni data (solo se ci sono esattamente 2 righe: rank 1 e 2)
    const results: {
      rank: number;             // verrà assegnato dopo
      country: string | null;   // IOC No.1
      country_no2: string | null; // IOC No.2
      name: string;             // No.1 name
      no2: string;              // No.2 name
      points_no1: number;
      points_no2: number;
      points_diff: number;
      date: string;             // YYYY-MM-DD
    }[] = [];

    for (const { date, items } of byDate.values()) {
      if (items.length !== 2) continue;

      const no1 = items[0]; // rank 1
      const no2 = items[1]; // rank 2

      const p1 = typeof no1.points === "bigint" ? Number(no1.points) : (no1.points ?? 0);
      const p2 = typeof no2.points === "bigint" ? Number(no2.points) : (no2.points ?? 0);

      results.push({
        rank: 0,
        country: no1.player?.ioc ?? null,
        country_no2: no2.player?.ioc ?? null,
        name: no1.player?.atpname ?? "Unknown",
        no2: no2.player?.atpname ?? "Unknown",
        points_no1: p1,
        points_no2: p2,
        points_diff: p1 - p2,
        date: date.toISOString().split("T")[0],
      });
    }

    // 4) Ordina per differenza decrescente
    results.sort((a, b) => b.points_diff - a.points_diff);

    // 4.1) Dedup coppie (ordine indifferente: Djokovic–Nadal == Nadal–Djokovic)
    const seen = new Set<string>();
    const uniqueResults = results.filter((r) => {
      const key = [r.name, r.no2].sort().join("—");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 4.2) Rank 1..N
    uniqueResults.forEach((r, i) => { r.rank = i + 1; });

    // 5) Limite (100)
    const top = uniqueResults.slice(0, 100);

    return NextResponse.json(top);
  } catch (error) {
    console.error("Error computing max difference with unique pairs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}