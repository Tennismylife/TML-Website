import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const matches = await prisma.match.findMany({
      orderBy: [{ tourney_date: "desc" }, { id: "desc" }],
      take: 10,
      select: {
        id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        winner_name: true,
        winner_ioc: true,
        loser_name: true,
        loser_ioc: true,
        winner_id: true,
        loser_id: true,
        tourney_id: true,
        year: true,
        score: true,
        surface: true,
        tourney_level: true,
      },
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Error fetching latest matches:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
