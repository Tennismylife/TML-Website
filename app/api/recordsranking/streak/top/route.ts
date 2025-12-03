import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerInfo = { id?: string; name: string; ioc?: string };
type Streak = PlayerInfo & { weeks: number; startDate: string; endDate: string };

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topParam = searchParams.get("top");

    if (!topParam) {
      return NextResponse.json({ error: "Top parameter is required" }, { status: 400 });
    }

    const top = Number(topParam);
    if (isNaN(top) || top < 1) {
      return NextResponse.json({ error: "Invalid top parameter" }, { status: 400 });
    }

    const allRankings = await prisma.ranking.findMany({
      where: { rank: { lte: top } },
      orderBy: [{ playerId: "asc" }, { rankingDateId: "asc" }],
      select: {
        playerId: true,
        rankingDateId: true,
        rankingDate: { select: { date: true } },
        player: { select: { id: true, atpname: true, ioc: true } },
      },
    });

    const result: Streak[] = [];

    let currentPlayerId: string | null = null;
    let currentPlayerInfo: PlayerInfo | null = null;
    let streakStart: Date | null = null;
    let streakEnd: Date | null = null;
    let prevRankingDateId: number | null = null;
    let currentStreak = 0;

    const commitStreak = () => {
      if (!currentPlayerId || !currentPlayerInfo || !streakStart || !streakEnd || currentStreak < 1) return;
      result.push({
        id: currentPlayerInfo.id,
        name: currentPlayerInfo.name,
        ioc: currentPlayerInfo.ioc,
        weeks: currentStreak,
        startDate: formatDate(streakStart),
        endDate: formatDate(streakEnd),
      });
    };

    for (const r of allRankings) {
      const currentDate = new Date(r.rankingDate.date);

      if (r.playerId !== currentPlayerId) {
        commitStreak();
        currentPlayerId = r.playerId;
        currentPlayerInfo = {
          id: r.player?.id,
          name: r.player?.atpname ?? r.playerId,
          ioc: r.player?.ioc ?? undefined,
        };
        streakStart = currentDate;
        streakEnd = currentDate;
        prevRankingDateId = r.rankingDateId;
        currentStreak = 1;
        continue;
      }

      if (r.rankingDateId === (prevRankingDateId ?? 0) + 1) {
        currentStreak += 1;
        streakEnd = currentDate;
      } else {
        commitStreak();
        currentStreak = 1;
        streakStart = currentDate;
        streakEnd = currentDate;
      }

      prevRankingDateId = r.rankingDateId;
    }

    commitStreak(); // commit finale

    result.sort((a, b) => b.weeks - a.weeks);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}