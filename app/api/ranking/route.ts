import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapIdsToSlugs } from '@/lib/player-slugs';


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");

  try {
    const whereClause = dateParam
      ? { rankingDate: { date: new Date(dateParam) } }
      : {};

    const rankings = await prisma.ranking.findMany({
      where: whereClause,
      orderBy: { rank: "asc" },
      take: 200, // solo i primi 200 giocatori
    });

    // Map player ids to slugs and names
    const ids = Array.from(new Set(rankings.map(r => String(r.playerId))));
    const slugMap = await mapIdsToSlugs(ids);
    const players = await prisma.player.findMany({
      where: { id: { in: ids } },
      select: { id: true, player: true, ioc: true },
    });
    const playerMap = new Map(players.map(p => [p.id, p]));

    const result = rankings.map(r => {
      const p = playerMap.get(String(r.playerId));
      return {
        id: r.playerId,
        slug: slugMap[String(r.playerId)] ?? null,
        name: p?.player || "Unknown",
        points: r.points,
        ioc: p?.ioc || null,
        rank: r.rank,
      };
    });

    return NextResponse.json({ rankings: result });
  } catch (err: any) {
    console.error("Errore recupero ranking:", err.message);
    return NextResponse.json(
      { error: "Errore server durante il recupero dei ranking" },
      { status: 500 }
    );
  }
}
