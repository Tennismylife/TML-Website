import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// converte numerico in XXy YYd
function formatAge(age: number) {
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365);
  return `${years}y ${days}d`;
}

// ritorna l’età dove cumulative >= n
function getAgeForNthEntry(cumulative: Record<string, number>, n: number): number | null {
  const entries = Object.entries(cumulative)
    .map(([age, cnt]) => [parseFloat(age), cnt] as [number, number])
    .sort((a, b) => a[0] - b[0]); // crescente

  for (const [age, cnt] of entries) {
    if (cnt >= n) return age;
  }
  return null; // non ha raggiunto N entry
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const n = Number(url.searchParams.get("n"));
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "Invalid n parameter" }, { status: 400 });
    }

    const getFiltered = (k: string) => url.searchParams.getAll(k).filter(Boolean);
    const selectedSurfaces = getFiltered("surface");
    const selectedLevels = getFiltered("level");

    const filtersCount = [selectedSurfaces.length > 0, selectedLevels.length > 0].filter(Boolean).length;

    // ===== CASE 1: 0 o 1 filtro → usa MV =====
    if (filtersCount <= 1) {
      const data = await prisma.mVEntriesAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
        },
      });

      const players = await prisma.player.findMany({
        where: { id: { in: data.map((d) => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      });

      const dataMap = Object.fromEntries(data.map((d) => [d.player_id, d]));

      const result = players
        .map((p) => {
          const d = dataMap[p.id];
          if (!d) return null;

          let selectedAges: Record<string, number> = d.ages_json as any;

          if (selectedSurfaces.length === 1) {
            selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};
          } else if (selectedLevels.length === 1) {
            selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};
          }

          const ageNum = getAgeForNthEntry(selectedAges, n);
          if (ageNum == null) return null;

          return {
            id: String(p.id),
            name: p.player,
            ioc: p.ioc || "",
            age_at_entry: formatAge(ageNum),
            numeric_age: ageNum,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.numeric_age - b.numeric_age)
        .slice(0, 100)
        .map(({ numeric_age, ...rest }) => rest);

      return NextResponse.json(result);
    }

    // ===== CASE 2: 2+ filtri → calcolo dinamico =====
    const where: any = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    const matches = await prisma.match.findMany({
      where,
      select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true, event_id: true, surface: true, tourney_level: true },
      orderBy: { event_id: "asc" },
    });

    if (!matches.length) return NextResponse.json([]);

    const map = new Map<string, number[]>();
    const seen = new Set<string>();

    for (const m of matches) {
      for (const [playerId, age] of [
        [m.winner_id, m.winner_age],
        [m.loser_id, m.loser_age],
      ]) {
        if (!playerId || age == null) continue;
        if (selectedSurfaces.length && !selectedSurfaces.includes(m.surface || "Unknown")) continue;
        if (selectedLevels.length && !selectedLevels.includes(m.tourney_level || "Unknown")) continue;

        const key = `${playerId}-${m.event_id}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const pid = String(playerId);
        if (!map.has(pid)) map.set(pid, []);
        map.get(pid)!.push(Number(age));
      }
    }

    const resultAges: Map<string, number | null> = new Map();
    for (const [id, ages] of map) {
      ages.sort((a, b) => a - b);
      resultAges.set(id, ages.length >= n ? ages[n - 1] : null);
    }

    const playerIds = [...resultAges.keys()];
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, player: true, ioc: true },
    });

    const finalResult = playersInfo
      .map((p) => {
        const age = resultAges.get(String(p.id));
        if (age == null) return null;
        return {
          id: String(p.id),
          name: p.player,
          ioc: p.ioc || "",
          age_at_entry: formatAge(age),
          numeric_age: age,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.numeric_age - b.numeric_age)
      .slice(0, 100)
      .map(({ numeric_age, ...rest }) => rest);

    return NextResponse.json(finalResult);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
