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
    const topParam = url.searchParams.get("top");
    const top = topParam === null ? 100 : Number(topParam);
    const effectiveTop = top;
    // limit rows returned to 100
    const limit = 100;

    if (topParam !== null && (!Number.isInteger(top) || top < 1)) {
      return NextResponse.json({ error: "Param 'top' non valido" }, { status: 400 });
    }

    // 1️⃣ Query ranking entries (use MV models when available)
    let rows: any[];
    let fromMV = false;
    const clientAny: any = prisma;
    if (effectiveTop === 100 && clientAny.mv_ages_oldesttop_100) {
      rows = await clientAny.mv_ages_oldesttop_100.findMany({
        orderBy: { age_days: 'desc' },
        take: limit,
      });
      fromMV = true;
    } else if (effectiveTop === 50 && clientAny.mv_ages_oldesttop_50) {
      rows = await clientAny.mv_ages_oldesttop_50.findMany({
        orderBy: { age_days: 'desc' },
        take: limit,
      });
      fromMV = true;
    } else {
      // no take — limit is applied after per-player aggregation
      rows = await prisma.ranking.findMany({
        where: { rank: { lte: top } },
        select: {
          playerId: true,
          player: { select: { atpname: true, ioc: true, birthdate: true } },
          rankingDate: { select: { date: true } },
        },
      });
    }

    type MaxRec = { name: string; ioc: string | null; date: Date; birth: Date; ageDays: number };

    let data: any[];

    if (fromMV) {
      // MV rows are flat: { player_id, rank, atpname, ioc, birthdate, date, age_days }
      data = rows.map((r: any) => {
        const birth = r.birthdate instanceof Date ? r.birthdate : new Date(r.birthdate);
        const ref   = r.date     instanceof Date ? r.date     : new Date(r.date);
        const { y, m, d } = diffYMD(birth, ref);
        return {
          id:       String(r.player_id),
          name:     r.atpname ?? '',
          ioc:      r.ioc ?? null,
          ageDays:  Number(r.age_days),
          ageLabel: `${y}y ${m}m ${d}d`,
          date:     ref.toISOString().slice(0, 10),
        };
      }).slice(0, limit);
    } else {
      const bestByPlayer = new Map<string, MaxRec>();
      for (const r of rows) {
        if (!r.player || r.playerId == null) continue;
        const id = String(r.playerId);
        const birth = r.player.birthdate;
        if (!birth) continue;
        const date = r.rankingDate.date;
        if (date < birth) continue;
        const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
        const prev = bestByPlayer.get(id);
        if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
          bestByPlayer.set(id, { name: r.player.atpname ?? '', ioc: r.player.ioc, date, birth, ageDays });
        }
      }
      data = Array.from(bestByPlayer.entries())
        .map(([id, v]) => {
          const { y, m, d } = diffYMD(v.birth, v.date);
          return { id, name: v.name, ioc: v.ioc, ageDays: v.ageDays, ageLabel: `${y}y ${m}m ${d}d`, date: v.date.toISOString().slice(0, 10) };
        })
        .sort((a, b) => b.ageDays - a.ageDays || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }))
        .slice(0, limit);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching oldest at Top-X:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
