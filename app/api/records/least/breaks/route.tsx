import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");
    const selectedRounds = url.searchParams.getAll("round");

    const cacheKey = JSON.stringify({ selectedSurfaces, selectedLevels, selectedRounds });
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    // 🎾 Prendo tutte le finali
    const finals = await prisma.match.findMany({
      where: {
        ...(selectedSurfaces.length > 0 && {
          surface: { in: selectedSurfaces },
        }),
        ...(selectedLevels.length > 0 && {
          tourney_level: { in: selectedLevels },
        }),
        round: "F",
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
            { tourney_name: { contains: "Laver Cup" } },
            { tourney_name: { contains: "Hopman Cup" } },
          ],
        },
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

    // Raggruppo per torneo → vincitore
    const tournamentWinners = new Map<
      string,
      { winner: { id: string; name: string; ioc: string }; date: Date; name: string }
    >();
    for (const f of finals) {
      if (f.winner_id && f.tourney_date) {
        tournamentWinners.set(f.tourney_id, {
          winner: {
            id: String(f.winner_id),
            name: f.winner_name,
            ioc: f.winner_ioc ?? "",
          },
          date: new Date(f.tourney_date),
          name: f.tourney_name,
        });
      }
    }

    // 🎾 Unica query per tutti i tornei
    const allMatches = await prisma.match.findMany({
      where: {
        tourney_id: { in: Array.from(tournamentWinners.keys()) },
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
      },
      select: {
        tourney_id: true,
        winner_id: true,
        w_bpSaved: true,
        w_bpFaced: true,
        loser_name: true,
        tourney_date: true,
        round: true,
      },
    });

    // Raggruppo i match per torneo
    const matchesByTournament = new Map<string, typeof allMatches[number][]>()
    for (const m of allMatches) {
      if (!matchesByTournament.has(m.tourney_id)) {
        matchesByTournament.set(m.tourney_id, []);
      }
      matchesByTournament.get(m.tourney_id)!.push(m);
    }

    // Calcolo i break subiti in ogni torneo
    const records = [];
    for (const [tId, data] of tournamentWinners) {
      const winnerId = data.winner.id;
      const matches = matchesByTournament.get(tId) ?? [];

      let totalBreaksSuffered = 0;
      const matchList = [];
      let hasValues = true;

      for (const m of matches) {
        if (String(m.winner_id) === winnerId) {
          // Se uno dei valori è null, salto tutto il torneo
          if (m.w_bpSaved == null || m.w_bpFaced == null) {
            hasValues = false;
            break;
          }

          const breaksSuffered = m.w_bpFaced - m.w_bpSaved;
          totalBreaksSuffered += breaksSuffered;

          matchList.push({
            opponent: m.loser_name,
            date: m.tourney_date,
            tournament: data.name,
            round: m.round,
            breaksSuffered: breaksSuffered,
          });
        }
      }

      // Inserisco solo i tornei con tutti i valori validi
      if (hasValues) {
        records.push({
          player: data.winner,
          breaksSuffered: totalBreaksSuffered,
          tournament: data.name,
          year: data.date.getFullYear(),
          date: data.date.toISOString().slice(0, 10),
          matches: matchList,
          status: totalBreaksSuffered === 0 ? "no_breaks" : "breaks_subi", // nuovo campo
        });
      }
    }

    // Ordino per più break subiti
    records.sort((a, b) => b.breaksSuffered - a.breaksSuffered);

    const result = { records: records.slice(0, 3000) };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
