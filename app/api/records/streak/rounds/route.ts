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
    const selectedLevels = [
      ...url.searchParams.getAll('tourney_level'),
      ...url.searchParams.getAll('level'),
    ];
    const selectedRounds = url.searchParams.getAll('round');
    const selectedBestOf = [
      ...url.searchParams.getAll('best_of'),
      ...url.searchParams.getAll('bestOf'),
    ]
      .map(Number)
      .filter(b => [1, 3, 5].includes(b));

    const rawLimit = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(rawLimit)
      ? Math.min(200, Math.max(1, rawLimit))
      : 100;

    const roundOrder: Record<string, number> = {
      'R128': 1,
      'R64': 2,
      'R32': 3,
      'R16': 4,
      'QF': 5,
      'SF': 6,
      'F': 7,
    };

    const computeLive = async () => {
      const matches = await prisma.match.findMany({
        where: {
          ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
          ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
          ...(selectedBestOf.length > 0 && { best_of: { in: selectedBestOf } }),
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
          if (!eId) return;
          const roundValue = roundOrder[String(m.round)] ?? 0;

          const tDate = m.tourney_date ? new Date(m.tourney_date) : new Date(0);
          if (!tMap.has(eId)) {
            tMap.set(eId, { event_id: eId, date: tDate, maxRoundValue: roundValue, maxRound: m.round ?? '' });
          } else {
            const existing = tMap.get(eId)!;
            if (roundValue > existing.maxRoundValue) {
              existing.maxRoundValue = roundValue;
              existing.maxRound = m.round ?? existing.maxRound;
            }
          }
        };

        if (m.winner_id) processPlayer(String(m.winner_id), m.winner_name ?? '', m.winner_ioc ?? '');
        if (m.loser_id) processPlayer(String(m.loser_id), m.loser_name ?? '', m.loser_ioc ?? '');
      }

      const allStreaks: any[] = [];

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

      return allStreaks.slice(0, limit);
    };

    // Caso 1: filtri aggiuntivi o più round → algoritmo live
    if (selectedSurfaces.length > 0 || selectedLevels.length > 0 || selectedBestOf.length > 0 || selectedRounds.length > 1) {
      return NextResponse.json({ streaks: await computeLive() });
    }

    // Caso 2: solo round selezionato → usa la MV
    if (selectedRounds.length === 1) {
      const minRound = selectedRounds[0];

      const streaks = await prisma.mVStreakRounds.findMany({
        where: { min_round: minRound },
        orderBy: { maxStreak: 'desc' },
        take: limit,
      });

      const result = streaks.map(s => ({
        player: { id: s.player_id, name: s.player_name, ioc: s.player_ioc },
        maxStreak: s.maxStreak,
        event_ids: s.event_ids,
      }));

      if (result.length > 0) {
        // Attach slugs for MV result
        const ids = Array.from(new Set(result.map(r => String(r.player.id)))).filter(Boolean);
        if (ids.length > 0) {
          const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
          const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
          const enriched = result.map(r => ({ ...r, player: { ...r.player, slug: slugMap.get(String(r.player.id)) ?? null } }));
          return NextResponse.json({ streaks: enriched });
        }
        return NextResponse.json({ streaks: result });
      }
      // Fallback se MV vuota
      const live = await computeLive();
      // Attach slugs to live result
      const liveIds = Array.from(new Set(live.map(r => String(r.player.id)))).filter(Boolean);
      if (liveIds.length > 0) {
        const rowsLive = await prisma.player.findMany({ where: { id: { in: liveIds } }, select: { id: true, slug: true } });
        const slugMapLive = new Map(rowsLive.map(r => [r.id, r.slug] as [string, string | null]));
        const enrichedLive = live.map(r => ({ ...r, player: { ...r.player, slug: slugMapLive.get(String(r.player.id)) ?? null } }));
        return NextResponse.json({ streaks: enrichedLive });
      }
      return NextResponse.json({ streaks: live });
    }

    return NextResponse.json({ streaks: await computeLive() });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
