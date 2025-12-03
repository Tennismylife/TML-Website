// app/api/recordsranking/youngest/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Calcolo differenza anni/mesi/giorni in UTC "calendario"
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
      return NextResponse.json({ error: "Param 'rank' è obbligatorio e deve essere >= 1" }, { status: 400 });
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

    // Bound opzionali sul campo date della RankingDate (UTC)
    const dateWhere: any = {};
    if (fromYear !== null) dateWhere.gte = new Date(Date.UTC(fromYear, 0, 1));
    if (toYear !== null) dateWhere.lt = new Date(Date.UTC(toYear + 1, 0, 1));

    // 1) Estrai tutte le occorrenze rank === X (eventualmente filtrate per periodo)
    const rankings = await prisma.ranking.findMany({
      where: {
        rank,
        ...(fromYear !== null || toYear !== null
          ? { rankingDate: { date: dateWhere } }
          : {}),
      },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true, birthdate: true } },
        rankingDate: { select: { date: true } },
      },
    });

    // 2) Per ciascun giocatore, conserva l'occorrenza con età minima
    type MinRec = {
      name: string;
      ioc: string | null;
      date: Date;
      birth: Date;
      ageDays: number;
    };
    const bestByPlayer = new Map<string, MinRec>();

    for (const r of rankings) {
      const id = String(r.playerId);
      const birth = r.player.birthdate;
      if (!birth) continue; // senza birthdate, non calcolabile
      const date = r.rankingDate.date;
      if (date < birth) continue; // protezione dati sporchi

      const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const prev = bestByPlayer.get(id);
      if (!prev || ageDays < prev.ageDays || (ageDays === prev.ageDays && date < prev.date)) {
        bestByPlayer.set(id, {
          name: r.player.atpname,
          ioc: r.player.ioc,
          date,
          birth,
          ageDays,
        });
      }
    }

    // 3) Costruisci output unico per giocatore e ordina per età crescente
    const data = Array.from(bestByPlayer.entries())
      .map(([id, v]) => {
        const { y, m, d } = diffYMD(v.birth, v.date);
        return {
          id,
          name: v.name,
          ioc: v.ioc,
          ageDays: v.ageDays,
          ageLabel: `${y}y ${m}m ${d}d`,
          date: v.date.toISOString().slice(0, 10), // YYYY-MM-DD
        };
      })
      .sort((a, b) => a.ageDays - b.ageDays)
      .slice(0, limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching youngest players:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}