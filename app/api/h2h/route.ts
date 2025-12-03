import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const player1 = searchParams.get("player1");
  const player2 = searchParams.get("player2");

  if (!player1 || !player2) {
    return NextResponse.json(
      { error: "Missing player1 or player2" },
      { status: 400 }
    );
  }

  // Type-safe WHERE clause
  const where: Prisma.MatchWhereInput = {
    OR: [
      { winner_id: player1, loser_id: player2 },
      { winner_id: player2, loser_id: player1 },
    ],
    status: true, // include only valid matches
  };

  try {
    const matches = await prisma.match.findMany({
      where,
      orderBy: {
        tourney_date: "asc",
      },
      // âŒ rimosso select: restituisce tutti i campi del modello Match
    });

    return NextResponse.json(matches);
  } catch (error) {
    console.error("Error fetching H2H matches:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}


