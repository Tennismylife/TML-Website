import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const cache = new Map<string, { data: any; timestamp: number; dbCount: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let lastDbCount: number | null = null;
let lastDbCountTimestamp = 0;
const DB_COUNT_CACHE_TTL = 5 * 60 * 1000; // 5 minuti per dbCount

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface').sort();
    const selectedLevels = url.searchParams.getAll('level').sort();

    const now = Date.now();

    // Check cached dbCount
    let dbCount: number;
    if (lastDbCount !== null && now - lastDbCountTimestamp < DB_COUNT_CACHE_TTL) {
      dbCount = lastDbCount;
    } else {
      // Query dbCount only if not cached or expired
      dbCount = await prisma.match.count({
        where: {
          ...(selectedSurfaces.length > 0 && {
            surface: { in: selectedSurfaces },
          }),
          ...(selectedLevels.length > 0 && {
            tourney_level: { in: selectedLevels },
          }),
          NOT: {
            OR: [
              { score: { contains: 'W/O' } },
              { score: { contains: 'DEF' } },
              { score: { contains: 'WEA' } },
              { tourney_name: { contains: 'Davis Cup' } },
              { tourney_name: { contains: 'World Team Cup' } },
              { tourney_name: { contains: 'World Team Championship' } },
              { tourney_name: { contains: 'ATP Cup' } },
              { tourney_name: { contains: 'United Cup' } },
            ],
          },
        },
      });
      lastDbCount = dbCount;
      lastDbCountTimestamp = now;
    }

    const cacheKey = JSON.stringify({ selectedSurfaces, selectedLevels, dbCount });

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (now - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    // Fetch matches with filters
    const matches = await prisma.match.findMany({
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        NOT: {
          OR: [
            { score: { contains: "W/O" } },
            { score: { contains: "DEF" } },
            { score: { contains: "WEA" } },
          ],
        },
      },
      select: {
        tourney_id: true,
        tourney_level: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        winner_age: true,
        loser_age: true,
        round: true,
      },
    });

    // Group wins ages by winner_id
    const playerAgeWins = new Map<string, number[]>();
    const playerInfo = new Map<string, { name: string; ioc: string }>();

    // Group played ages by player_id
    const playerAgePlayed = new Map<string, number[]>();

    // Group entries (unique tourneys with age) by player_id
    const playerAgeEntries = new Map<string, { tourney_id: string; age: number }[]>();

    // Group titles ages by winner_id (titles are when winner_round == 'F')
    const playerAgeTitles = new Map<string, number[]>();

    for (const m of matches) {
      if (m.winner_id && m.winner_age) {
        const playerId = String(m.winner_id);
        if (!playerAgeWins.has(playerId)) {
          playerAgeWins.set(playerId, []);
        }
        playerAgeWins.get(playerId)!.push(m.winner_age);

        if (!playerInfo.has(playerId)) {
          playerInfo.set(playerId, { name: m.winner_name, ioc: m.winner_ioc ?? "" });
        }

        // For entries (unique tourneys with age), exclude team events
        if (m.tourney_level !== 'D') {
          if (!playerAgeEntries.has(playerId)) {
            playerAgeEntries.set(playerId, []);
          }
          playerAgeEntries.get(playerId)!.push({ tourney_id: m.tourney_id, age: m.winner_age });
        }
      }

      // For played (wins and losses)
      if (m.winner_id && m.winner_age) {
        const winnerId = String(m.winner_id);
        if (!playerAgePlayed.has(winnerId)) {
          playerAgePlayed.set(winnerId, []);
        }
        playerAgePlayed.get(winnerId)!.push(m.winner_age);
      }
      if (m.loser_id && m.loser_age) {
        const loserId = String(m.loser_id);
        if (!playerAgePlayed.has(loserId)) {
          playerAgePlayed.set(loserId, []);
        }
        playerAgePlayed.get(loserId)!.push(m.loser_age);

        if (!playerInfo.has(loserId)) {
          playerInfo.set(loserId, { name: m.loser_name, ioc: m.loser_ioc ?? "" });
        }

        // For entries (unique tourneys with age), exclude team events
        if (m.tourney_level !== 'D') {
          if (!playerAgeEntries.has(loserId)) {
            playerAgeEntries.set(loserId, []);
          }
          playerAgeEntries.get(loserId)!.push({ tourney_id: m.tourney_id, age: m.loser_age });
        }
      }

      // For titles (when winner_round == 'F')
      if (m.winner_id && m.winner_age && m.round === 'F') {
        const playerId = String(m.winner_id);
        if (!playerAgeTitles.has(playerId)) {
          playerAgeTitles.set(playerId, []);
        }
        playerAgeTitles.get(playerId)!.push(m.winner_age);

        if (!playerInfo.has(playerId)) {
          playerInfo.set(playerId, { name: m.winner_name, ioc: m.winner_ioc ?? "" });
        }
      }
    }

    // Convert to arrays for JSON
    const playerAgeWinsArray = Array.from(playerAgeWins.entries());
    const playerAgePlayedArray = Array.from(playerAgePlayed.entries());
    const playerAgeEntriesArray = Array.from(playerAgeEntries.entries());
    const playerAgeTitlesArray = Array.from(playerAgeTitles.entries());
    const playerInfoArray = Array.from(playerInfo.entries());

    // Get surfaces and levels for filters
    const surfaceList = await prisma.match.findMany({
      select: { surface: true },
      distinct: ['surface'],
      where: { surface: { not: null } },
    });
    const surfaces = surfaceList.map(s => s.surface).filter(Boolean);

    const levelList = await prisma.match.findMany({
      select: { tourney_level: true },
      distinct: ['tourney_level'],
      where: { tourney_level: { not: null } },
    });
    const levels = levelList.map(l => l.tourney_level).filter(Boolean);

    const result = {
      playerAgeWins: playerAgeWinsArray,
      playerAgePlayed: playerAgePlayedArray,
      playerAgeEntries: playerAgeEntriesArray,
      playerAgeTitles: playerAgeTitlesArray,
      playerInfo: playerInfoArray,
      surfaces,
      levels,
    };

    cache.set(cacheKey, { data: result, timestamp: now, dbCount });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}