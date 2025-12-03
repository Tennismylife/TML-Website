import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const player = searchParams.get("player");

  if (!player) {
    return NextResponse.json({ error: "Player is required" }, { status: 400 });
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { winner_id: player },
          { loser_id: player }
        ],
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
        loser_id: true
      }
    });

    const opponents = new Set<string>();
    matches.forEach(m => {
      if (m.winner_id !== player) opponents.add(m.winner_id);
      if (m.loser_id !== player) opponents.add(m.loser_id);
    });

    return NextResponse.json(Array.from(opponents));
  } catch (error) {
    console.error("Error fetching opponents:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

