
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PlayerAggInternal = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  bpSavedTotal: number; // somma w_bpSaved + l_bpSaved
  bpFacedTotal: number; // somma w_bpFaced + l_bpFaced
};

type PlayerAggResponse = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  output: number; // break points saved % (ponderata)
};

function parseWhere(url: URL) {
  const surface = url.searchParams.get("surface") || "all";
  const yearParam = url.searchParams.get("year") || "all";
  const tourneyLevel = url.searchParams.get("tourneyLevel") || "all";

  const where: any = {};
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

    // Aggregazione (winner)
    const winners = await prisma.match.groupBy({
      by: ["winner_id", "winner_name", "winner_ioc"],
      where,
      _count: { winner_id: true }, // match come vincitore
      _sum: { w_bpSaved: true, w_bpFaced: true },
    });

    // Aggregazione (loser)
    const losers = await prisma.match.groupBy({
      by: ["loser_id", "loser_name", "loser_ioc"],
      where,
      _count: { loser_id: true },  // match come perdente
      _sum: { l_bpSaved: true, l_bpFaced: true },
    });

    const map = new Map<string, PlayerAggInternal>();

    // Merge winners
    for (const w of winners) {
      const id = w.winner_id;
      const name = w.winner_name ?? "";
      if (!id || !name) continue;

      const saved = w._sum.w_bpSaved ?? 0;
      const faced = w._sum.w_bpFaced ?? 0;

      const current = map.get(id) ?? { id, name, ioc: w.winner_ioc ?? "", matches: 0, bpSavedTotal: 0, bpFacedTotal: 0 };
      current.matches += w._count.winner_id ?? 0;
      current.bpSavedTotal += saved;
      current.bpFacedTotal += faced;
      current.name = current.name || name;
      current.ioc  = current.ioc  || (w.winner_ioc ?? "");
      map.set(id, current);
    }

    // Merge losers
    for (const l of losers) {
      const id = l.loser_id;
      const name = l.loser_name ?? "";
      if (!id || !name) continue;

      const saved = l._sum.l_bpSaved ?? 0;
      const faced = l._sum.l_bpFaced ?? 0;

      const current = map.get(id) ?? { id, name, ioc: l.loser_ioc ?? "", matches: 0, bpSavedTotal: 0, bpFacedTotal: 0 };
      current.matches += l._count.loser_id ?? 0;
      current.bpSavedTotal += saved;
      current.bpFacedTotal += faced;
      current.name = current.name || name;
      current.ioc  = current.ioc  || (l.loser_ioc ?? "");
      map.set(id, current);
    }

    // Calcolo output (% bp saved) e ordinamento
    let result: PlayerAggResponse[] = Array.from(map.values()).map(({ id, name, ioc, matches, bpSavedTotal, bpFacedTotal }) => {
      const pct = bpFacedTotal > 0 ? (bpSavedTotal / bpFacedTotal) * 100 : 0;
      return {
        id, name, ioc, matches,
        output: Number(pct.toFixed(3)), // 3 decimali
      };
    });

    result = result
      .sort((a, b) => b.output - a.output)
      .slice(0, top);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error(error);
    const msg = typeof error?.message === "string" ? error.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: msg === "Invalid 'year' parameter" ? 400 : 500 });
  }
}
