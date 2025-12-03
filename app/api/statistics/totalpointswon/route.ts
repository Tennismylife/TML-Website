
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type PlayerAggInternal = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  totalPointsWon: number; // somma di tutti i punti vinti (servizio + risposta)
};

type PlayerAggResponse = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  output: number; // total points won
};

function parseWhere(url: URL): Prisma.mVStatsWhereInput {
  const surface = url.searchParams.get("surface") || "all";
  const yearParam = url.searchParams.get("year") || "all";
  const tourneyLevel = url.searchParams.get("tourneyLevel") || "all";

  // ✅ Sempre filtrare stats = TRUE
  const where: Prisma.mVStatsWhereInput = { stats: true };

  if (surface !== "all") where.surface = surface;
  if (tourneyLevel !== "all") where.tourney_level = tourneyLevel;
  if (yearParam !== "all") {
    const y = Number(yearParam);
    if (!Number.isFinite(y)) throw new Error("Invalid 'year' parameter");
    where.year = y;
  }
  return where;
}

function clampTop(topParam: string | null, fallback = 100) {
  if (!topParam) return fallback;
  const n = Number(topParam);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(500, Math.floor(n)));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const where = parseWhere(url);
    const top = clampTop(url.searchParams.get("top"), 100);

    // ✅ Query in parallelo sulla MV
    const [winners, losers] = await Promise.all([
      prisma.mVStats.groupBy({
        by: ["winner_id"],
        where,
        _count: { winner_id: true },
        _sum: { w_1stWon: true, w_2ndWon: true, l_svpt: true, l_1stWon: true, l_2ndWon: true },
      }),
      prisma.mVStats.groupBy({
        by: ["loser_id"],
        where,
        _count: { loser_id: true },
        _sum: { l_1stWon: true, l_2ndWon: true, w_svpt: true, w_1stWon: true, w_2ndWon: true },
      }),
    ]);

    const map = new Map<string, PlayerAggInternal>();

    // Merge vincitori
    for (const w of winners) {
      const id = String(w.winner_id);
      if (!id) continue;

      const wonService = (w._sum.w_1stWon ?? 0) + (w._sum.w_2ndWon ?? 0);
      const oppSvpt = w._sum.l_svpt ?? 0;
      const oppWonOnServe = (w._sum.l_1stWon ?? 0) + (w._sum.l_2ndWon ?? 0);
      const wonReturn = Math.min(Math.max(0, oppSvpt - oppWonOnServe), oppSvpt);

      const current = map.get(id) ?? {
        id,
        name: "",
        ioc: "",
        matches: 0,
        totalPointsWon: 0,
      };
      current.matches += w._count.winner_id ?? 0;
      current.totalPointsWon += wonService + wonReturn;
      map.set(id, current);
    }

    // Merge perdenti
    for (const l of losers) {
      const id = String(l.loser_id);
      if (!id) continue;

      const wonService = (l._sum.l_1stWon ?? 0) + (l._sum.l_2ndWon ?? 0);
      const oppSvpt = l._sum.w_svpt ?? 0;
      const oppWonOnServe = (l._sum.w_1stWon ?? 0) + (l._sum.w_2ndWon ?? 0);
      const wonReturn = Math.min(Math.max(0, oppSvpt - oppWonOnServe), oppSvpt);

      const current = map.get(id) ?? {
        id,
        name: "",
        ioc: "",
        matches: 0,
        totalPointsWon: 0,
      };
      current.matches += l._count.loser_id ?? 0;
      current.totalPointsWon += wonService + wonReturn;
      map.set(id, current);
    }

    // Recupero info giocatori
    const playerIds = Array.from(map.keys());
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      select: { id: true, atpname: true, ioc: true },
    });

    for (const p of players) {
      const current = map.get(p.id);
      if (current) {
        current.name = p.atpname;
        current.ioc = p.ioc;
      }
    }

    // Ordina per totalPointsWon e restituisci top N con campo 'output'
    const result: PlayerAggResponse[] = Array.from(map.values())
      .sort((a, b) => b.totalPointsWon - a.totalPointsWon)
      .slice(0, top)
      .map(({ id, name, ioc, matches, totalPointsWon }) => ({
        id,
        name,
        ioc,
        matches,
        output: totalPointsWon,
      }));

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch (error: any) {
    console.error(error);
    const msg = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: msg === "Invalid 'year' parameter" ? 400 : 500 });
  }
}
