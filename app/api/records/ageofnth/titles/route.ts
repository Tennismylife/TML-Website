import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Formatta età in XXy YYd
function formatAge(age: number): string {
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365);
  return `${years}y ${days}d`;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const n = Number(url.searchParams.get("n"));

    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid n parameter" }, { status: 400 });
    }

    const selectedSurfaces = url.searchParams.getAll("surface").filter(Boolean);
    const selectedLevels = url.searchParams.getAll("level").filter(Boolean);

    // Costruisci i filtri
    const where: any = {
      round: "F",       // solo finali
      team_event: false // non team event
    };
    if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
    if (selectedLevels.length > 0) where.tourney_level = { in: selectedLevels };

    // Prendi tutte le vittorie filtrate
    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        winner_age: true
      },
      orderBy: { winner_age: "asc" } // ordina crescente
    });

    if (!matches.length) return NextResponse.json([]);

    // Raggruppa età per giocatore
    const map = new Map<string, number[]>();
    for (const m of matches) {
      if (!m.winner_id || m.winner_age == null) continue;
      if (!map.has(m.winner_id)) map.set(m.winner_id, []);
      map.get(m.winner_id)!.push(Number(m.winner_age));
    }

    // Calcola N-esimo titolo
    const resultAges = new Map<string, number | null>();
    for (const [id, ages] of map) {
      ages.sort((a, b) => a - b);
      resultAges.set(id, ages.length >= n ? ages[n - 1] : null);
    }

    // Info giocatori
    const uniqueIds = [...resultAges.keys()];
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, player: true, ioc: true }
    });

    // Array finale
    let finalResult = playersInfo
      .map((p) => {
        const age = resultAges.get(p.id);
        if (age == null) return null; // escludi chi non ha N titoli
        return {
          id: p.id,
          name: p.player,
          ioc: p.ioc || "",
          age_at_title: formatAge(age)
        };
      })
      .filter(Boolean) as { id: string; name: string; ioc: string; age_at_title: string }[];

    // Ordina crescente
    finalResult.sort((a, b) => {
      const ageA = parseFloat(a.age_at_title.split("y")[0]) + parseFloat(a.age_at_title.split(" ")[1]) / 365;
      const ageB = parseFloat(b.age_at_title.split("y")[0]) + parseFloat(b.age_at_title.split(" ")[1]) / 365;
      return ageA - ageB;
    });

    // Limita a 100
    finalResult = finalResult.slice(0, 100);

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
