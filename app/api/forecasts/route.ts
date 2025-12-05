import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const matches = await prisma.match.findMany({
      where: {
        NOT: {
          OR: [
            { score: { contains: "DEF" } },
            { score: { contains: "W/O" } },
            { score: { contains: "WEA" } },
          ],
        },
      },
      select: {
        winner_id: true,
        loser_id: true,
      },
      take: 100, // Limita a 100 match per velocità
      orderBy: {
        tourney_date: "desc",
      },
    });

    const data = matches.map((m) => ({
      player1: m.winner_id,
      player2: m.loser_id,
      winner: m.winner_id,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching training data:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}