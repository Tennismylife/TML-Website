
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type PlayerAggInternal = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  totalAces: number;
};

type PlayerAggResponse = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  output: number; // totale ace
};

// Funzione per costruire il filtro da URL
function parseWhere(url: URL): Prisma.mVStatsWhereInput {
  const surface = url.searchParams.get("surface") || "all";
  const yearParam = url.searchParams.get("year") || "all";
  const tourneyLevel = url.searchParams.get("tourneyLevel") || "all";

  const where: Prisma.mVStatsWhereInput = { stats: true }; // solo match completi
  if (surface !== "all") where.surface = surface;
  if (tourneyLevel !== "all") where.tourney_level = tourneyLevel;
  if (yearParam !== "all") {
    const y = Number(yearParam);
    if (!Number.isNaN(y)) where.year = y;
    else throw new Error("Invalid 'year' parameter");
  }
  return where;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const topParam = url.searchParams.get("top");
    const top = topParam && !Number.isNaN(Number(topParam)) ? Number(topParam) : 100;
    const where = parseWhere(url);

    // --- Query in parallelo ---
    const [winners, losers] = await Promise.all([
      prisma.mVStats.groupBy({
        by: ["winner_id"],
        where,
        _count: { winner_id: true },
        _sum: { w_ace: true },
      }),
      prisma.mVStats.groupBy({
        by: ["loser_id"],
        where,
        _count: { loser_id: true },
        _sum: { l_ace: true },
      }),
    ]);

    // --- Popoliamo la mappa dei giocatori ---
    const map = new Map<string, PlayerAggInternal>();

    for (const w of winners) {
      if (!w.winner_id) continue;
      map.set(w.winner_id, {
        id: w.winner_id,
        name: "",
        ioc: "",
        matches: w._count.winner_id ?? 0,
        totalAces: w._sum.w_ace ?? 0,
      });
    }

    for (const l of losers) {
      if (!l.loser_id) continue;
      const current = map.get(l.loser_id);
      if (current) {
        current.matches += l._count.loser_id ?? 0;
        current.totalAces += l._sum.l_ace ?? 0;
      } else {
        map.set(l.loser_id, {
          id: l.loser_id,
          name: "",
          ioc: "",
          matches: l._count.loser_id ?? 0,
          totalAces: l._sum.l_ace ?? 0,
        });
      }
    }

    // --- Recuperiamo name e ioc dalla tabella Player ---
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

    // --- Risultato finale ordinato ---
    const result: PlayerAggResponse[] = Array.from(map.values())
      .sort((a, b) => b.totalAces - a.totalAces)
      .slice(0, top)
      .map(({ id, name, ioc, matches, totalAces }) => ({
        id,
        name,
        ioc,
        matches,
        output: totalAces,
      }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    const msg = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: msg === "Invalid 'year' parameter" ? 400 : 500 });
  }
}
