
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type PlayerAggInternal = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  bpWonTotal: number; // break points convertiti
  bpOppTotal: number; // opportunità di break
};

type PlayerAggResponse = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  output: number; // break points won % (ponderata)
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

function clampDecimals(decimalsParam: string | null, fallback = 3) {
  if (!decimalsParam) return fallback;
  const n = Number(decimalsParam);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(6, Math.floor(n)));
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const where = parseWhere(url);
    const top = clampTop(url.searchParams.get("top"), 100);
    const decimals = clampDecimals(url.searchParams.get("decimals"), 3);

    // ✅ Query in parallelo sulla MV
    const [winners, losers] = await Promise.all([
      prisma.mVStats.groupBy({
        by: ["winner_id"],
        where,
        _count: { winner_id: true },
        _sum: { l_bpFaced: true, l_bpSaved: true }, // opportunità contro il loser
      }),
      prisma.mVStats.groupBy({
        by: ["loser_id"],
        where,
        _count: { loser_id: true },
        _sum: { w_bpFaced: true, w_bpSaved: true }, // opportunità contro il winner
      }),
    ]);

    const map = new Map<string, PlayerAggInternal>();

    // Merge vincitori
    for (const w of winners) {
      const id = String(w.winner_id);
      if (!id) continue;
      const opp = w._sum.l_bpFaced ?? 0;
      const savedByOpp = w._sum.l_bpSaved ?? 0;
      const won = Math.min(Math.max(0, opp - savedByOpp), opp);

      const current = map.get(id) ?? {
        id,
        name: "",
        ioc: "",
        matches: 0,
        bpWonTotal: 0,
        bpOppTotal: 0,
      };
      current.matches += w._count.winner_id ?? 0;
      current.bpWonTotal += won;
      current.bpOppTotal += opp;
      map.set(id, current);
    }

    // Merge perdenti
    for (const l of losers) {
      const id = String(l.loser_id);
      if (!id) continue;
      const opp = l._sum.w_bpFaced ?? 0;
      const savedByOpp = l._sum.w_bpSaved ?? 0;
      const won = Math.min(Math.max(0, opp - savedByOpp), opp);

      const current = map.get(id) ?? {
        id,
        name: "",
        ioc: "",
        matches: 0,
        bpWonTotal: 0,
        bpOppTotal: 0,
      };
      current.matches += l._count.loser_id ?? 0;
      current.bpWonTotal += won;
      current.bpOppTotal += opp;
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

    // Calcolo output e ordinamento
    const result: PlayerAggResponse[] = Array.from(map.values())
      .map(({ id, name, ioc, matches, bpWonTotal, bpOppTotal }) => ({
        id,
        name,
        ioc,
        matches,
        output: bpOppTotal > 0 ? Number(((bpWonTotal / bpOppTotal) * 100).toFixed(decimals)) : 0,
      }))
      .sort((a, b) => b.output - a.output)
      .slice(0, top);

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  } catch (error: any) {
    console.error(error);
    const msg = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: msg === "Invalid 'year' parameter" ? 400 : 500 });
  }
}
