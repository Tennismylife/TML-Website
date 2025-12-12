import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Funzione per ottenere età alla X-esima partita
function getAgeForNthGame(cumulative: Record<string, number>, x: number): number | null {
  const entries = Object.entries(cumulative)
    .map(([num, age]) => [parseInt(num), age] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  const entry = entries.find(([num]) => num >= x);
  return entry ? entry[1] : null;
}

// Formatta età "XXy YYd"
function formatAge(age: number | null): string {
  if (age == null) return "-";
  const years = Math.floor(age);
  const days = Math.round((age - years) * 365);
  return `${years}y ${days}d`;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    const x = Number(url.searchParams.get("x"));
    if (!Number.isInteger(x) || x <= 0) {
      return NextResponse.json({ error: "Invalid x parameter" }, { status: 400 });
    }

    const getFiltered = (key: string) => url.searchParams.getAll(key).filter(Boolean);

    const selectedSurfaces = getFiltered("surface");
    const selectedLevels = getFiltered("level");
    const selectedRounds = getFiltered("round");
    const selectedBestOf = url.searchParams
      .getAll("best_of")
      .map(Number)
      .filter(Number.isInteger);

    const filtersCount =
      Number(selectedSurfaces.length > 0) +
      Number(selectedLevels.length > 0) +
      Number(selectedRounds.length > 0) +
      Number(selectedBestOf.length > 0);

    console.time("Total API");

    // ==============================
    // CASE 1: 0 o 1 filtro → MV
    // ==============================
    if (filtersCount <= 1) {
      console.time("Use MV mv_played_ages");

      const data = await prisma.mVPlayedAges.findMany({
        select: {
          player_id: true,
          ages_json: true,
          ages_by_surface_json: true,
          ages_by_level_json: true,
          ages_by_round_json: true,
          ages_by_best_of_json: true,
        },
      });

      const players = await prisma.player.findMany({
        where: { id: { in: data.map((d) => d.player_id) } },
        select: { id: true, player: true, ioc: true },
      });

      const dataMap = Object.fromEntries(data.map((d) => [d.player_id, d]));

      let finalResult = players
        .map((p) => {
          const d = dataMap[p.id];
          if (!d) return null;

          let selectedAges: Record<string, number> = d.ages_json as any;

          if (selectedSurfaces.length === 1) {
            selectedAges = (d.ages_by_surface_json as any)?.[selectedSurfaces[0]] ?? {};
          } else if (selectedLevels.length === 1) {
            selectedAges = (d.ages_by_level_json as any)?.[selectedLevels[0]] ?? {};
          } else if (selectedRounds.length === 1) {
            selectedAges = (d.ages_by_round_json as any)?.[selectedRounds[0]] ?? {};
          } else if (selectedBestOf.length === 1) {
            selectedAges = (d.ages_by_best_of_json as any)?.[String(selectedBestOf[0])] ?? {};
          }

          const ageAtX = getAgeForNthGame(selectedAges, x);
          if (ageAtX == null) return null; // escludi se non ha X partite

          return {
            id: p.id,
            name: p.player,
            ioc: p.ioc || "",
            age_at_game: ageAtX,
          };
        })
        .filter(Boolean) as { id: string; name: string; ioc: string; age_at_game: number }[];

      // Ordina crescente
      finalResult.sort((a, b) => a.age_at_game - b.age_at_game);

      // Prendi primi 100
      finalResult = finalResult.slice(0, 100);

      // Formatta età
      const formattedResult = finalResult.map((p) => ({
        ...p,
        age_at_game: formatAge(p.age_at_game),
      }));

      console.timeEnd("Use MV mv_played_ages");
      console.timeEnd("Total API");
      return NextResponse.json(formattedResult);
    }

    // ==============================
    // CASE 2: 2+ filtri → calcolo dinamico
    // ==============================
    console.time("Use dynamic filtered algorithm");

    const where: any = {
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
      ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
    };

    const matches = await prisma.match.findMany({
      where,
      select: { winner_id: true, winner_age: true, loser_id: true, loser_age: true },
    });

    if (matches.length === 0) return NextResponse.json([]);

    const map = new Map<string, number[]>();

    for (const m of matches) {
      if (m.winner_id && m.winner_age != null) {
        if (!map.has(m.winner_id)) map.set(m.winner_id, []);
        map.get(m.winner_id)!.push(Number(m.winner_age));
      }
      if (m.loser_id && m.loser_age != null) {
        if (!map.has(m.loser_id)) map.set(m.loser_id, []);
        map.get(m.loser_id)!.push(Number(m.loser_age));
      }
    }

    let finalResult2: { id: string; name: string; ioc: string; age_at_game: number }[] = [];

    for (const [id, ages] of map) {
      ages.sort((a, b) => a - b);
      const ageAtX = ages.length < x ? null : ages[x - 1];
      if (ageAtX == null) continue; // escludi se non ha X partite
      const player = await prisma.player.findUnique({
        where: { id },
        select: { id: true, player: true, ioc: true },
      });
      if (player) {
        finalResult2.push({
          id: player.id,
          name: player.player,
          ioc: player.ioc || "",
          age_at_game: ageAtX,
        });
      }
    }

    // Ordina crescente
    finalResult2.sort((a, b) => a.age_at_game - b.age_at_game);

    // Prendi primi 100
    finalResult2 = finalResult2.slice(0, 100);

    // Formatta età
    const formattedResult2 = finalResult2.map((p) => ({
      ...p,
      age_at_game: formatAge(p.age_at_game),
    }));

    console.timeEnd("Use dynamic filtered algorithm");
    console.timeEnd("Total API");

    return NextResponse.json(formattedResult2);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
