import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1h

// ✅ Gestione tie-break e super tie-break
function parseGamesLost(score: string): number {
  if (!score || /W\/O|DEF|WEA/i.test(score)) return 0;

  // Remove RET and anything after
  const cleanScore = score.replace(/RET.*/i, '').trim();

  let gamesLost = 0;
  const sets = cleanScore.split(/\s+/);

  for (const set of sets) {
    // Rimuove (4), [10-8], ecc.
    const clean = set.replace(/\(.*?\)|\[.*?\]/g, "");
    const parts = clean.split("-");
    if (parts.length === 2) {
      const lost = parseInt(parts[1], 10);
      if (!isNaN(lost)) gamesLost += lost;
    }
  }
  return gamesLost;
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll("surface");
    const selectedLevels = url.searchParams.getAll("level");

    const cacheKey = JSON.stringify({ selectedSurfaces, selectedLevels });
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
        score: true,
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
      },
      select: {
        tourney_id: true,
        winner_id: true,
        score: true,
      },
    });

    // Raggruppo i match per torneo
    const matchesByTournament = new Map<string, typeof allMatches>();
    for (const m of allMatches) {
      if (!matchesByTournament.has(m.tourney_id)) {
        matchesByTournament.set(m.tourney_id, []);
      }
      matchesByTournament.get(m.tourney_id)!.push(m);
    }

    // Calcolo le partite perse in ogni torneo
    const records = [];
    for (const [tId, data] of tournamentWinners) {
      const winnerId = data.winner.id;
      const matches = matchesByTournament.get(tId) ?? [];

      let totalGamesLost = 0;
      for (const m of matches) {
        if (String(m.winner_id) === winnerId) {
          totalGamesLost += parseGamesLost(m.score);
        }
      }

      records.push({
        player: data.winner,
        gamesLost: totalGamesLost,
        tournament: data.name,
        year: data.date.getFullYear(),
        date: data.date.toISOString().slice(0, 10),
      });
    }

    // Ordino per meno game persi
    records.sort((a, b) => a.gamesLost - b.gamesLost);

    const result = { records: records.slice(0, 50) };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
