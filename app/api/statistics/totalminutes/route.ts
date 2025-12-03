
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type MatchRow = {
  winner_id: string | null;
  winner_name: string | null;
  winner_ioc: string | null;
  loser_id: string | null;
  loser_name: string | null;
  loser_ioc: string | null;
  minutes: number | string | null; // coerciamo in number
};

type PlayerAggInternal = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  totalMinutes: number;
};

type PlayerAggResponse = {
  id: string;
  name: string;
  ioc: string;
  matches: number;
  output: number; // total minutes played
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const surface = url.searchParams.get("surface") || "all";
    const yearParam = url.searchParams.get("year") || "all";
    const tourneyLevel = url.searchParams.get("tourneyLevel") || "all";
    const topParam = url.searchParams.get("top");
    const top = topParam && !Number.isNaN(Number(topParam)) ? Number(topParam) : 100;

    const where: any = {};
    if (surface !== "all") where.surface = surface;
    if (tourneyLevel !== "all") where.tourney_level = tourneyLevel;
    if (yearParam !== "all") {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) where.year = y;
      else return NextResponse.json({ error: "Invalid 'year' parameter" }, { status: 400 });
    }

    const matches = await prisma.match.findMany({
      where,
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        minutes: true, // <--- cambiare se il campo ha un altro nome
      },
    }) as MatchRow[];

    const map = new Map<string, PlayerAggInternal>();

    for (const m of matches) {
      const minutes = typeof m.minutes === "string"
        ? Number(m.minutes ?? 0)
        : (m.minutes ?? 0);

      const players = [
        { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? "", minutes },
        { id: m.loser_id,  name: m.loser_name,  ioc: m.loser_ioc  ?? "", minutes },
      ];

      for (const p of players) {
        if (!p.id || !p.name) continue;

        const agg = map.get(p.id) ?? { id: p.id, name: p.name, ioc: p.ioc, matches: 0, totalMinutes: 0 };
        agg.matches += 1;
        agg.totalMinutes += minutes;
        agg.name = agg.name || p.name;
        agg.ioc  = agg.ioc  || p.ioc;
        map.set(p.id, agg);
      }
    }

    const result: PlayerAggResponse[] = Array.from(map.values())
      .sort((a, b) => b.totalMinutes - a.totalMinutes)
      .slice(0, top)
      .map(({ id, name, ioc, matches, totalMinutes }) => ({
        id, name, ioc, matches, output: totalMinutes,
      }));

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
