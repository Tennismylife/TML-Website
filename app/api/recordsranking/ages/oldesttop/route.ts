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
    const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

    if (!Number.isInteger(top) || top < 1) {
      return NextResponse.json({ error: "Param 'top' non valido" }, { status: 400 });
    }

    // 1️⃣ Query ranking entries
    const rows = await prisma.ranking.findMany({
      where: { rank: { lte: top } },
      select: {
        playerId: true,
        player: { select: { atpname: true, ioc: true, birthdate: true } },
        rankingDate: { select: { date: true } },
      },
    });

    // 🔍 Debug: player senza join
    const missingPlayerRows = rows.filter((r) => !r.player);
    if (missingPlayerRows.length > 0) {
      console.log("🚫 Missing player join for these playerIds:");
      for (const r of missingPlayerRows) {
        console.log(`- ${r.playerId ?? "null"}`);
      }
      console.log(`🧾 Total missing player joins: ${missingPlayerRows.length}`);
    } else {
      console.log("✅ All player joins OK");
    }

    // 2️⃣ Per ciascun player, conserva l'occorrenza con età MASSIMA
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

      if (!birth) {
        missingBirthIds.push(id);
        continue;
      }

      const date = r.rankingDate.date;
      if (date < birth) continue; // protezione dati anomali

      const ageDays = Math.floor((date.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24));
      const prev = bestByPlayer.get(id);
      if (!prev || ageDays > prev.ageDays || (ageDays === prev.ageDays && date > prev.date)) {
        bestByPlayer.set(id, {
          name: r.player.atpname,
          ioc: r.player.ioc,
          date,
          birth,
          ageDays,
        });
      }
    }

    // 🔍 Debug: player con birthdate mancante
    if (missingBirthIds.length > 0) {
      console.log("⚠️ Missing birthdate for playerIds:");
      for (const pid of missingBirthIds) console.log(`- ${pid}`);
      console.log(`🧾 Total missing birthdates: ${missingBirthIds.length}`);
    }

    // 3️⃣ Output: una riga per giocatore, ordinata per età decrescente
    const data = Array.from(bestByPlayer.entries())
      .map(([id, v]) => {
        const { y, m, d } = diffYMD(v.birth, v.date);
        return {
          id,
          name: v.name,
          ioc: v.ioc,
          ageDays: v.ageDays,
          ageLabel: `${y}y ${m}m ${d}d`,
          date: v.date.toISOString().slice(0, 10),
        };
      })
      .sort(
        (a, b) =>
          b.ageDays - a.ageDays || a.name.localeCompare(b.name, "en", { sensitivity: "base" })
      )
      .slice(0, limit);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching oldest at Top-X:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
