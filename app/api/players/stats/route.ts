import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Player ID is required" }, { status: 400 });
  }

  const playerId = id;


  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ winner_id: playerId }, { loser_id: playerId }],
        NOT: {
          OR: [
            { score: { contains: "DEF", mode: "insensitive" } },
            { score: { contains: "W/O", mode: "insensitive" } },
            { score: { contains: "WEA", mode: "insensitive" } },
          ],
        },
      },
      select: {
        winner_id: true,
        tourney_level: true,
        surface: true,
        round: true,
        tourney_name: true,
        score: true,
      },
    });

    console.log("Matches fetched for player", playerId, ":", matches.length);

    let winsAll = 0;
    let winsGrandSlam = 0;
    let winsMasters1000 = 0;
    let winsHard = 0;
    let winsGrass = 0;
    let winsClay = 0;
    let winsCarpet = 0;

    let totalAll = 0;
    let totalGrandSlam = 0;
    let totalMasters1000 = 0;
    let totalHard = 0;
    let totalGrass = 0;
    let totalClay = 0;
    let totalCarpet = 0;

    let titlesAll = 0;
    let titlesGrandSlam = 0;
    let titlesMasters1000 = 0;
    let titlesHard = 0;
    let titlesGrass = 0;
    let titlesClay = 0;
    let titlesCarpet = 0;

    matches.forEach((m) => {
      totalAll += 1;
      if (m.tourney_level === 'G') totalGrandSlam += 1;
      if (m.tourney_level === 'M') totalMasters1000 += 1;
      if (m.surface === 'Hard') totalHard += 1;
      if (m.surface === 'Grass') totalGrass += 1;
      if (m.surface === 'Clay') totalClay += 1;
      if (m.surface === 'Carpet') totalCarpet += 1;

      if (m.winner_id === id) {
        winsAll += 1;
        if (m.tourney_level === 'G') winsGrandSlam += 1;
        if (m.tourney_level === 'M') winsMasters1000 += 1;
        if (m.surface === 'Hard') winsHard += 1;
        if (m.surface === 'Grass') winsGrass += 1;
        if (m.surface === 'Clay') winsClay += 1;
        if (m.surface === 'Carpet') winsCarpet += 1;

        if (m.round === 'F' && !m.score?.includes("WEA") && !["Davis Cup", "World Team Cup", "Laver Cup", "ATP Cup"].some(name => m.tourney_name.includes(name))) {
          titlesAll += 1;
          if (m.tourney_level === 'G') titlesGrandSlam += 1;
          if (m.tourney_level === 'M') titlesMasters1000 += 1;
          if (m.surface === 'Hard') titlesHard += 1;
          if (m.surface === 'Grass') titlesGrass += 1;
          if (m.surface === 'Clay') titlesClay += 1;
          if (m.surface === 'Carpet') titlesCarpet += 1;
        }
      }
    });

    const stats = {
      winsAll,
      winsGrandSlam,
      winsMasters1000,
      winsHard,
      winsGrass,
      winsClay,
      winsCarpet,
      totalAll,
      totalGrandSlam,
      totalMasters1000,
      totalHard,
      totalGrass,
      totalClay,
      totalCarpet,
      percAll: totalAll > 0 ? (winsAll / totalAll) * 100 : 0,
      percGrandSlam: totalGrandSlam > 0 ? (winsGrandSlam / totalGrandSlam) * 100 : 0,
      percMasters1000: totalMasters1000 > 0 ? (winsMasters1000 / totalMasters1000) * 100 : 0,
      percHard: totalHard > 0 ? (winsHard / totalHard) * 100 : 0,
      percGrass: totalGrass > 0 ? (winsGrass / totalGrass) * 100 : 0,
      percClay: totalClay > 0 ? (winsClay / totalClay) * 100 : 0,
      percCarpet: totalCarpet > 0 ? (winsCarpet / totalCarpet) * 100 : 0,
      titlesAll,
      titlesGrandSlam,
      titlesMasters1000,
      titlesHard,
      titlesGrass,
      titlesClay,
      titlesCarpet,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


