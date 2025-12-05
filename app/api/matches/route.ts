import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const player_id = searchParams.get("player_id"); // Player di interesse
  const round = searchParams.get("round"); // eventuale filtro round
  const surface = searchParams.get("surface"); // eventuale filtro surface

  if (!player_id) {
    return NextResponse.json(
      { error: "player_id is required" },
      { status: 400 }
    );
  }

  let where: Prisma.MatchWhereInput = {
    OR: [{ winner_id: player_id }, { loser_id: player_id }],
  };

  if (round) where.round = round;
  if (surface) where.surface = surface;

  // Escludi walkover, defaults, e FINALI con WEA (titoli non validi)
  where.NOT = {
    OR: [
      { score: { contains: "DEF", mode: "insensitive" } },
      { score: { contains: "W/O", mode: "insensitive" } },
      // Escludiamo finali con WEA
      { AND: [{ round: "F" }, { score: { contains: "WEA", mode: "insensitive" } }] },
    ],
  };

  try {
    const matches = await prisma.Match.findMany({ where });
    return NextResponse.json(matches);
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


