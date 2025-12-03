import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// --- Prisma client reuse ---
const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// --- In-memory cache ---
const cache = new Map<string, { data: any; timestamp: number; dbCount: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let lastDbCount: number | null = null;
let lastDbCountTimestamp = 0;
const DB_COUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    const now = Date.now();

    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedRounds = url.searchParams.getAll('round');
    const selectedBestOf = url.searchParams.getAll('best_of').map(v => parseInt(v, 10)).filter(n => !isNaN(n));

    // --- dbCount caching ---
    let dbCount: number;
    if (lastDbCount !== null && now - lastDbCountTimestamp < DB_COUNT_CACHE_TTL) {
      dbCount = lastDbCount;
    } else {
      dbCount = await prisma.match.count({
        where: { tourney_level: 'G', status: true },
      });
      lastDbCount = dbCount;
      lastDbCountTimestamp = now;
    }

    const cacheKey = JSON.stringify({ dbCount, selectedSurfaces, selectedRounds, selectedBestOf });
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    // --- Build where clause with filters ---
    const where: any = { status: true, tourney_level: 'G' };
    if (selectedSurfaces.length > 0) where.surface = { in: selectedSurfaces };
    if (selectedRounds.length > 0) where.round = { in: selectedRounds };
    if (selectedBestOf.length > 0) where.best_of = { in: selectedBestOf };

    // --- Fetch matches ---
    const matches = await prisma.match.findMany({
      where,
      select: {
        tourney_name: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
      },
    });

    // --- Initialize Slams map ---
    const slams = ['Australian Open', 'Roland Garros', 'Wimbledon', 'US Open'] as const;
    type SlamName = typeof slams[number];

    const playerAgeWinsSlams: Record<SlamName, Map<string, number[]>> = {} as any;
    slams.forEach(slam => (playerAgeWinsSlams[slam] = new Map()));

    const playerInfo = new Map<string, { name: string; ioc: string }>();

    // --- Populate maps ---
    for (const m of matches) {
      if (!m.winner_id || m.winner_age == null || !m.tourney_name) continue;
      const playerId = String(m.winner_id);
      const slamName = String(m.tourney_name) as SlamName;

      if (!playerAgeWinsSlams[slamName]) continue;

      if (!playerInfo.has(playerId)) {
        playerInfo.set(playerId, { name: m.winner_name, ioc: m.winner_ioc ?? '' });
      }

      const ages = playerAgeWinsSlams[slamName].get(playerId) || [];
      ages.push(m.winner_age);
      playerAgeWinsSlams[slamName].set(playerId, ages);
    }

    // --- Convert Maps to arrays for frontend ---
    const playerAgeWinsSlamsArray = Object.fromEntries(
      Object.entries(playerAgeWinsSlams).map(([slam, map]) => [slam, Array.from(map.entries())])
    );

    const playerInfoArray = Array.from(playerInfo.entries());

    const result = { playerAgeWinsSlams: playerAgeWinsSlamsArray, playerInfo: playerInfoArray };

    cache.set(cacheKey, { data: result, timestamp: now, dbCount });

    return NextResponse.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
