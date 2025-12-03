import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ["error", "warn"] });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

interface TournamentRecord {
  player: { id: string; name: string; ioc: string };
  totalMinutes: number;
  tournament: string;
  year: number;
  date: string;
  tourney_id: string;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");

    const cacheKey = JSON.stringify({ selectedSurfaces, selectedLevels });
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    // Step 1: recupera tutte le finali dal 1991 in poi
    const matches = await prisma.match.findMany({
      where: {
        round: "F",
        tourney_date: { gte: new Date("1991-01-01") },
        NOT: {
          OR: [
            { score: { contains: "W/O" } },
            { score: { contains: "DEF" } },
            { score: { contains: "WEA" } },
            { tourney_name: { contains: "Davis Cup" } },
            { tourney_name: { contains: "World Team Cup" } },
            { tourney_name: { contains: "World Team Championship" } },
            { tourney_name: { contains: "ATP Cup" } },
            { tourney_name: { contains: "United Cup" } },
          ],
        },
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        tourney_date: true,
        tourney_name: true,
        tourney_id: true,
      },
    });

    // Step 2: aggrega i minuti totali per vincitore per torneo in un'unica query
    const totals = await prisma.match.groupBy({
      by: ["tourney_id", "winner_id"],
      _sum: { minutes: true },
    });

    // Step 3: costruisci i record finali
    const tournamentWinnersMap = new Map<string, TournamentRecord>();

    for (const m of matches) {
      if (!m.winner_id || !m.tourney_date) continue;
      const key = `${m.tourney_id}-${m.tourney_date.toISOString().slice(0, 10)}`;
      if (!tournamentWinnersMap.has(key)) {
        const total = totals.find(
          (t) =>
            t.tourney_id === m.tourney_id &&
            String(t.winner_id) === String(m.winner_id)
        )?._sum.minutes ?? 0;

        tournamentWinnersMap.set(key, {
          player: { id: String(m.winner_id), name: m.winner_name, ioc: m.winner_ioc ?? "" },
          totalMinutes: total,
          tournament: m.tourney_name,
          year: m.tourney_date.getFullYear(),
          date: m.tourney_date.toISOString().slice(0, 10),
          tourney_id: m.tourney_id,
        });
      }
    }

    // Step 4: ordina per tornei più rapidi
    const records = Array.from(tournamentWinnersMap.values());
    records.sort((a, b) => a.totalMinutes - b.totalMinutes);

    const result = { records: records.slice(0, 50) };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
