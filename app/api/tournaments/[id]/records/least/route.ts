import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseGamesLostByWinner(score: string): number {
  if (!score || score.includes("W/O") || score.includes("DEF") || score.includes("WEA")) return 0;
  const sets = score.split(' ');
  let total = 0;
  for (const set of sets) {
    const cleanedSet = set.replace(/\(\d+\)/g, '');
    const parts = cleanedSet.split('-');
    if (parts.length === 2) {
      const lost = parseInt(parts[1], 10);
      if (!isNaN(lost)) total += lost;
    }
  }
  return total;
}

export async function GET(request: NextRequest, context: any) {
  try {
    // support both Next.js versions where params can be a Promise or an object
    const params = await context?.params;
    const id = String(params?.id ?? '');
    
    const { searchParams } = new URL(request.url);
    const full = searchParams.get('full') === 'true';
    const specificRound = searchParams.get('round'); // <-- nuovo parametro

    const tournamentMatches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        tourney_date: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
        score: true,
        draw_size: true,
      },
      orderBy: { year: "desc" },
    });

    const roundOrder = ["R32", "R16", "QF", "SF", "F", "W"];
    const roundIndexMap = new Map(roundOrder.map((r, i) => [r, i]));

    const matchesByYear = new Map<number, any[]>();
    for (const m of tournamentMatches) {
      const year = m.year;
      if (!year) continue;
      if (!matchesByYear.has(year)) matchesByYear.set(year, []);
      matchesByYear.get(year)!.push(m);
    }

    const dataPerRound = new Map<
      string,
      Array<{ year: number; minGamesLost: number; player: { id: string | number; name: string; ioc: string } }>
    >();

    for (const [year, matches] of matchesByYear) {
      const playerHighestRound = new Map<
        string,
        {
          id: string | number;
          name: string;
          ioc: string;
          highestRound: string;
          roundIndex: number;
          totalGamesLost: number;
        }
      >();

      for (const m of matches) {
        const round = m.round || "Unknown";
        if (!roundIndexMap.has(round)) continue;
        const roundIndex = roundIndexMap.get(round)!;

        // Winner
        if (m.winner_id && m.winner_name) {
          const key = String(m.winner_id);
          const existing = playerHighestRound.get(key);
          if (!existing || roundIndex > existing.roundIndex) {
            let highestRound = round;
            if (round === "F") highestRound = "W";
            playerHighestRound.set(key, {
              id: m.winner_id,
              name: m.winner_name,
              ioc: m.winner_ioc ?? "",
              highestRound,
              roundIndex: roundIndexMap.get(highestRound)!,
              totalGamesLost: 0,
            });
          }
        }

        // Loser
        if (m.loser_id && m.loser_name && !m.score.includes("W/O") && !m.score.includes("DEF")) {
          const key = String(m.loser_id);
          const existing = playerHighestRound.get(key);
          if (!existing || roundIndex > existing.roundIndex) {
            playerHighestRound.set(key, {
              id: m.loser_id,
              name: m.loser_name,
              ioc: m.loser_ioc ?? "",
              highestRound: round,
              roundIndex,
              totalGamesLost: 0,
            });
          }
        }
      }

      // Games lost
      for (const m of matches) {
        if (m.winner_id && playerHighestRound.has(String(m.winner_id))) {
          const key = String(m.winner_id);
          const player = playerHighestRound.get(key)!;
          const round = m.round || "Unknown";
          const roundIndex = roundIndexMap.get(round);
          if (roundIndex !== undefined && roundIndex < player.roundIndex) {
            const gamesLost = parseGamesLostByWinner(m.score);
            player.totalGamesLost += gamesLost;
          }
        }
      }

      // Min per round
      for (const round of roundOrder) {
        const roundIndex = roundIndexMap.get(round)!;
        const playersReached = Array.from(playerHighestRound.values()).filter(p => p.roundIndex >= roundIndex);
        if (playersReached.length > 0) {
          const minPlayer = playersReached.reduce((min, p) =>
            p.totalGamesLost < min.totalGamesLost ? p : min
          );
          if (!dataPerRound.has(round)) dataPerRound.set(round, []);
          dataPerRound
            .get(round)!
            .push({ year, minGamesLost: minPlayer.totalGamesLost, player: { id: minPlayer.id, name: minPlayer.name, ioc: minPlayer.ioc } });
        }
      }
    }

    // Sort results
    for (const data of dataPerRound.values()) {
      data.sort((a, b) => a.minGamesLost - b.minGamesLost);
    }

    const roundItems = roundOrder.map(round => ({
      round,
      data: dataPerRound.get(round) || [],
    }));

    // ✅ Limit to 10 by default
    if (!full) {
      for (const item of roundItems) {
        item.data = item.data.slice(0, 10);
      }
    }

    // ✅ Return only one round if requested
    if (specificRound) {
      const found = roundItems.find(r => r.round === specificRound);
      return NextResponse.json({ roundItems: found ? [found] : [] });
    }

    return NextResponse.json({ roundItems });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
