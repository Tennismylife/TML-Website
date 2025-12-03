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
    const selectedRounds = url.searchParams.get("round");

    const cacheKey = JSON.stringify({ selectedSurfaces, selectedLevels, selectedRounds });
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    // Ottieni tutti i match
    const players = await prisma.match.findMany({
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds && { round: selectedRounds }),
        NOT: {
          OR: [
            { score: { contains: "W/O" } },
            { score: { contains: "DEF" } },
            { score: { contains: "WEA" } },
          ],
        },
      },
      select: {
        winner_id: true,
        loser_id: true,
        winner_name: true,
        loser_name: true,
        winner_ioc: true,
        loser_ioc: true,
        tourney_date: true,
      },
      orderBy: { tourney_date: 'asc' },
    });

    // Raggruppa match per giocatore
    const playerMatches = new Map<string, { id: string; name: string; ioc: string; matches: typeof players }>();

    for (const match of players) {
      // Per vincitore
      if (match.winner_id) {
        const key = String(match.winner_id);
        if (!playerMatches.has(key)) {
          playerMatches.set(key, {
            id: key,
            name: match.winner_name,
            ioc: match.winner_ioc ?? "",
            matches: [],
          });
        }
        playerMatches.get(key)!.matches.push(match);
      }
      // Per perdente
      if (match.loser_id) {
        const key = String(match.loser_id);
        if (!playerMatches.has(key)) {
          playerMatches.set(key, {
            id: key,
            name: match.loser_name,
            ioc: match.loser_ioc ?? "",
            matches: [],
          });
        }
        playerMatches.get(key)!.matches.push(match);
      }
    }

    // Prepara i record con match ordinati
    const records = [];
    for (const [playerId, data] of playerMatches) {
      // Ordina i match per data crescente
      data.matches.sort((a, b) => new Date(a.tourney_date).getTime() - new Date(b.tourney_date).getTime());

      records.push({
        player: { id: playerId, name: data.name, ioc: data.ioc },
        matches: data.matches,
        totalMatches: data.matches.length,
      });
    }

    const result = { records };
    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}