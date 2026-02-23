import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Calcolo Y/M/D in base al calendario (UTC-safe)
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
    const top = Number(url.searchParams.get("top") ?? NaN);
    // restrict to 10 when top is 50 or 100, otherwise 100
    const maxAllowed = top === 50 || top === 100 ? 10 : 100;
    const limit = Math.min(maxAllowed, Math.max(1, Number(url.searchParams.get("limit") ?? maxAllowed)));

    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido" }, { status: 400 });
    }

    // 1️⃣ Query ranking entries (use MV models when available)
    let rows: any[];
    if (top === 100) {
      rows = await (prisma as any).mv_ages_oldesttop_100.findMany({
        where: { rank: { lte: top } },
        take: limit,
        orderBy: { age_days: 'desc' },
      });
    } else if (top === 50) {
      rows = await (prisma as any).mv_ages_oldesttop_50.findMany({
        where: { rank: { lte: top } },
        take: limit,
        orderBy: { age_days: 'desc' },
      });
    } else {
      rows = await prisma.ranking.findMany({
        take: limit,
        where: { rank: { lte: top } },
        select: {
          playerId: true,
          player: { select: { atpname: true, ioc: true, birthdate: true } },
          rankingDate: { select: { date: true } },
        },
      });
    }

    // helper for tracking the single "oldest" record per player
    type MaxRec = {
      name: string;
      ioc: string | null;
      date: Date;
      birth: Date;
      ageDays: number;
    };

    const bestByPlayer = new Map<string, MaxRec>();
    const missingBirthIds: string[] = [];

    for (const r of rows) {
      if (!r.player || r.playerId == null) continue;
      const id = String(r.playerId);
      const birth = r.player.birthdate;
      if (!birth) { missingBirthIds.push(id); continue; }
      const date = r.rankingDate.date;
      if (date < birth) continue;
      const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const prev = bestByPlayer.get(id);
      if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
        bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, date, birth, ageDays });
      }
    }

    let data = Array.from(bestByPlayer.entries())
      .map(([id, v]) => {
        const { y, m, d } = diffYMD(v.birth, v.date);
        return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0, 10) };
      })
      .sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
      .slice(0, limit);

    if (data.length === 0 && rows.length > 0) {
      data = rows.slice(0, limit).map((r) => ({
        id: String(r.playerId),
        name: r.player?.atpname ?? '',
        ioc: r.player?.ioc ?? null,
        ageDays: 0,
        ageLabel: 'N/A',
        date: r.rankingDate.date.toISOString().slice(0, 10),
      }));
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching oldest at Top-X:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
