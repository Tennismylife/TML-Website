import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma =
  globalForPrisma.prisma || new PrismaClient({ log: ['error', 'warn'] });
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('tourney_level');
    const selectedRounds = url.searchParams.getAll('round');

    const roundOrder: Record<string, number> = {
      'R128': 1,
      'R64': 2,
      'R32': 3,
      'R16': 4,
      'QF': 5,
      'SF': 6,
      'F': 7,
    };

    // Caso 1: filtri aggiuntivi → algoritmo originale
    if (selectedSurfaces.length > 0 || selectedLevels.length > 0) {
      const matches = await prisma.match.findMany({
        where: {
          ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
          ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
          team_event: false,
          round: { not: 'RR' },
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
          event_id: true,
          round: true,
        },
        orderBy: { tourney_date: 'asc' },
      });

      // Map: playerId -> { name, ioc, tournaments }
      const playerTournaments = new Map<
        string,
        { name: string; ioc: string; tournaments: Map<string, { event_id: string; date: Date; maxRoundValue: number; maxRound: string }> }
      >();

      for (const m of matches) {
        const processPlayer = (playerId: string, playerName: string, playerIOC: string) => {
          if (!playerTournaments.has(playerId)) {
            playerTournaments.set(playerId, { name: playerName, ioc: playerIOC, tournaments: new Map() });
          }
          const playerData = playerTournaments.get(playerId)!;
          const tMap = playerData.tournaments;
          const eId = m.event_id;
          const roundValue = roundOrder[m.round] || 0;

          if (!tMap.has(eId)) {
            tMap.set(eId, { event_id: eId, date: new Date(m.tourney_date), maxRoundValue: roundValue, maxRound: m.round });
          } else {
            const existing = tMap.get(eId)!;
            if (roundValue > existing.maxRoundValue) {
              existing.maxRoundValue = roundValue;
              existing.maxRound = m.round;
            }
          }
        };

        if (m.winner_id) processPlayer(String(m.winner_id), m.winner_name, m.winner_ioc ?? '');
        if (m.loser_id) processPlayer(String(m.loser_id), m.loser_name, m.loser_ioc ?? '');
      }

      // Calcolo streak
      const allStreaks = [];

      for (const [playerId, playerData] of playerTournaments) {
        const tournaments = Array.from(playerData.tournaments.values()).sort((a, b) => a.date.getTime() - b.date.getTime());

        let currentStreak = 0;
        let maxStreak = 0;
        let streakStartIndex = -1;
        let maxStreakStartIndex = -1;

        for (let i = 0; i < tournaments.length; i++) {
          const t = tournaments[i];
          const reached = selectedRounds.length === 0 || selectedRounds.some(r => t.maxRoundValue >= (roundOrder[r] || 0));

          if (reached) {
            if (currentStreak === 0) streakStartIndex = i;
            currentStreak++;
            if (currentStreak > maxStreak) {
              maxStreak = currentStreak;
              maxStreakStartIndex = streakStartIndex;
            }
          } else {
            currentStreak = 0;
          }
        }

        if (maxStreak > 1) {
          const streakTournaments = tournaments.slice(maxStreakStartIndex, maxStreakStartIndex + maxStreak);
          const event_ids = streakTournaments.map(t => t.event_id);

          allStreaks.push({
            player: { id: playerId, name: playerData.name, ioc: playerData.ioc },
            maxStreak,
            event_ids,
          });
        }
      }

      allStreaks.sort((a, b) => b.maxStreak - a.maxStreak);

      return NextResponse.json({ streaks: allStreaks.slice(0, 50) });
    }

    // Caso 2: solo round selezionato → usa la MV
    if (selectedRounds.length === 1) {
      const minRound = selectedRounds[0];

      const streaks = await prisma.mVStreakRounds.findMany({
        where: { min_round: minRound },
        orderBy: { maxStreak: 'desc' },
        take: 50,
      });

      const result = streaks.map(s => ({
        player: { id: s.player_id, name: s.player_name, ioc: s.player_ioc },
        maxStreak: s.maxStreak,
        event_ids: s.event_ids,
      }));

      return NextResponse.json({ streaks: result });
    }

    return NextResponse.json({ streaks: [] });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
