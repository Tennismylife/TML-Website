import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');
    const full = request.nextUrl.searchParams.get('full') === 'true';

    const matches = await prisma.match.findMany({
      where: { tourney_id: id },
      select: {
        year: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
      },
    });

    const oldestPlayersMap = new Map<string, any>();
    const youngestPlayersMap = new Map<string, any>();

    for (const m of matches) {
      const year = m.year;
      if (!year) continue;

      const players = [
        { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc, age: m.winner_age },
        { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc, age: m.loser_age },
      ];

      for (const p of players) {
        if (!p.id || !p.name || p.age == null) continue;
        const age = Number(p.age);
        const key = String(p.id);

        if (!oldestPlayersMap.has(key) || age > oldestPlayersMap.get(key).age) {
          oldestPlayersMap.set(key, { id: p.id, name: p.name, ioc: p.ioc ?? '', age, year });
        }
        if (!youngestPlayersMap.has(key) || age < youngestPlayersMap.get(key).age) {
          youngestPlayersMap.set(key, { id: p.id, name: p.name, ioc: p.ioc ?? '', age, year });
        }
      }
    }

    const oldestPlayers = Array.from(oldestPlayersMap.values()).sort((a, b) => b.age - a.age);
    const youngestPlayers = Array.from(youngestPlayersMap.values()).sort((a, b) => a.age - b.age);

    if (full) {
      return NextResponse.json({
        oldestPlayers,
        youngestPlayers,
      });
    }

    // Primo caricamento: solo top10
    return NextResponse.json({
      topOldest: oldestPlayers.slice(0, 10),
      topYoungest: youngestPlayers.slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
