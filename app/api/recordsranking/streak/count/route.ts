import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerInfo = { id?: string; name: string; ioc?: string };
type Item = PlayerInfo & { weeks: number; startDate?: string; endDate?: string };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rankParam = searchParams.get("rank");

    if (!rankParam) {
      return NextResponse.json({ error: "Rank parameter is required" }, { status: 400 });
    }

    const rank = Number(rankParam);
    if (isNaN(rank) || rank < 1) {
      return NextResponse.json({ error: "Invalid rank parameter" }, { status: 400 });
    }

    const allRankings = await prisma.ranking.findMany({
      where: { rank },
      orderBy: [{ playerId: "asc" }, { rankingDate: { date: "asc" } }],
      select: {
        playerId: true,
        rankingDate: { select: { date: true } },
        player: { select: { id: true, atpname: true, ioc: true } },
      },
    });

    const resultMap: Record<string, Item> = {};

    let currentPlayerId: string | null = null;
    let currentPlayerInfo: PlayerInfo | null = null;
    let prevDate: Date | null = null;
    let currentStreak = 0;
    let maxStreak = 0;
    let streakStart: Date | null = null;
    let streakEnd: Date | null = null;
    let maxStreakStart: Date | null = null;
    let maxStreakEnd: Date | null = null;

    const commitPlayer = () => {
      if (!currentPlayerId || !currentPlayerInfo) return;
      const prev = resultMap[currentPlayerId];
      const best = Math.max(prev?.weeks ?? 0, maxStreak);

      resultMap[currentPlayerId] = {
        id: currentPlayerInfo.id,
        name: currentPlayerInfo.name,
        ioc: currentPlayerInfo.ioc,
        weeks: best,
        startDate: maxStreakStart?.toISOString().split("T")[0],
        endDate: maxStreakEnd?.toISOString().split("T")[0],
      };
    };

    for (const r of allRankings) {
      if (r.playerId !== currentPlayerId) {
        commitPlayer();
        currentPlayerId = r.playerId;
        currentPlayerInfo = {
          id: r.player?.id,
          name: r.player?.atpname ?? r.playerId,
          ioc: r.player?.ioc ?? undefined,
        };
        prevDate = null;
        currentStreak = 0;
        maxStreak = 0;
        streakStart = null;
        streakEnd = null;
        maxStreakStart = null;
        maxStreakEnd = null;
      }

      if (prevDate) {
        const diffDays = Math.round(
          (r.rankingDate.date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays >= 6 && diffDays <= 8) {
          currentStreak += 1;
          streakEnd = r.rankingDate.date;
        } else {
          currentStreak = 1;
          streakStart = r.rankingDate.date;
          streakEnd = r.rankingDate.date;
        }
      } else {
        currentStreak = 1;
        streakStart = r.rankingDate.date;
        streakEnd = r.rankingDate.date;
      }

      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
        maxStreakStart = streakStart;
        maxStreakEnd = streakEnd;
      }

      prevDate = r.rankingDate.date;
    }

    commitPlayer();

    const resultArray = Object.values(resultMap).sort((a, b) => b.weeks - a.weeks);

    return NextResponse.json(resultArray);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
