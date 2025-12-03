import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface H2HTimespanRecord {
  player1: { id: string; name: string; ioc: string };
  player2: { id: string; name: string; ioc: string };
  firstMatch: string;
  lastMatch: string;
  firstTournament: string;
  lastTournament: string;
  timespanDays: number;
  matches: number;
}

interface H2HTimespanResponse {
  h2hTimespans: H2HTimespanRecord[];
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const selectedRoundsRaw = url.searchParams.getAll('round');

    // Gestione filtro "All"
    const selectedRounds = selectedRoundsRaw.filter(r => r !== 'All');

    const cacheKey = JSON.stringify({
      selectedSurfaces: selectedSurfaces.sort(),
      selectedLevels: selectedLevels.sort(),
      selectedRounds: selectedRounds.sort(),
    });

    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey)!;
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json(cached.data);
      }
    }

    const matches = await prisma.match.findMany({
      where: {
        ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
        ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
        ...(selectedRounds.length > 0 && { round: { in: selectedRounds } }),
        NOT: {
          OR: [
            { score: { contains: 'W/O', mode: 'insensitive' } },
            { score: { contains: 'DEF', mode: 'insensitive' } },
            { score: { contains: 'WEA', mode: 'insensitive' } },
          ],
        },
      },
      select: {
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        tourney_date: true,
        tourney_name: true,
      },
    });

    const h2hTimespanMap = new Map<string, H2HTimespanRecord>();
    const playerInfo = new Map<string, { name: string; ioc: string }>();

    const setPlayerInfo = (
      id: string,
      winnerId: string,
      winnerName: string,
      winnerIoc: string | null,
      loserName: string,
      loserIoc: string | null
    ) => {
      if (!playerInfo.has(id)) {
        playerInfo.set(id, {
          name: id === winnerId ? winnerName : loserName,
          ioc: id === winnerId ? winnerIoc ?? "" : loserIoc ?? "",
        });
      }
    };

    for (const m of matches) {
      if (m.winner_id && m.loser_id && m.tourney_date && m.tourney_name) {
        const ids = [String(m.winner_id), String(m.loser_id)].sort();
        const key = `${ids[0]}-${ids[1]}`;

        setPlayerInfo(ids[0], m.winner_id, m.winner_name, m.winner_ioc, m.loser_name, m.loser_ioc);
        setPlayerInfo(ids[1], m.winner_id, m.winner_name, m.winner_ioc, m.loser_name, m.loser_ioc);

        if (!h2hTimespanMap.has(key)) {
          const dateStr = m.tourney_date.toISOString().slice(0, 10);
          h2hTimespanMap.set(key, {
            player1: { id: ids[0], name: playerInfo.get(ids[0])!.name, ioc: playerInfo.get(ids[0])!.ioc },
            player2: { id: ids[1], name: playerInfo.get(ids[1])!.name, ioc: playerInfo.get(ids[1])!.ioc },
            firstMatch: dateStr,
            lastMatch: dateStr,
            firstTournament: m.tourney_name,
            lastTournament: m.tourney_name,
            timespanDays: 0,
            matches: 1,
          });
        } else {
          const entry = h2hTimespanMap.get(key)!;
          entry.matches++;
          const currentDate = m.tourney_date.toISOString().slice(0, 10);
          if (currentDate < entry.firstMatch) {
            entry.firstMatch = currentDate;
            entry.firstTournament = m.tourney_name;
          }
          if (currentDate > entry.lastMatch) {
            entry.lastMatch = currentDate;
            entry.lastTournament = m.tourney_name;
          }
          const firstDate = new Date(entry.firstMatch);
          const lastDate = new Date(entry.lastMatch);
          entry.timespanDays = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
        }
      }
    }

    const h2hTimespanArray = Array.from(h2hTimespanMap.values())
      .sort((a, b) => b.timespanDays - a.timespanDays)
      .slice(0, 50); // top 50

    const result: H2HTimespanResponse = {
      h2hTimespans: h2hTimespanArray,
    };

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
