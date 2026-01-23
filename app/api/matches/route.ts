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

  try {
    // pagination params (optional)
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');
    const limit = limitParam ? Math.max(0, Number(limitParam)) : undefined;
    const offset = offsetParam ? Math.max(0, Number(offsetParam)) : undefined;

    // Only select the commonly used fields to keep payload compact
    const select = {
      id: true,
      year: true,
      round: true,
      surface: true,
      winner_id: true,
      winner_name: true,
      winner_ioc: true,
      loser_id: true,
      loser_name: true,
      loser_ioc: true,
      score: true,
      status: true,
      tourney_name: true,
      tourney_level: true,
      team_event: true,
      tourney_date: true,
    } as const;

    const [count, results] = await Promise.all([
      prisma.match.count({ where }),
      prisma.match.findMany({ where, take: limit, skip: offset, orderBy: { tourney_date: 'desc' }, select }),
    ]);

    return NextResponse.json({ count, results });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


