import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    // Recupera parametri dal contesto
    const params = context?.params ?? {};
    const yearRaw = String(params.year ?? "");
    const year = parseInt(yearRaw, 10);
    if (isNaN(year)) {
      return NextResponse.json({ error: "Invalid year parameter" }, { status: 400 });
    }
    const { searchParams } = new URL(request.url);

    const surfaces = searchParams.get('surfaces')?.split(',') || [];
    const levels = searchParams.get('levels')?.split(',') || [];
    const full = searchParams.get('full') === 'true';

    const where: any = { 
      year: year,
      team_event: false, // esclude team
    };
    if (surfaces.length > 0) where.surface = { in: surfaces };
    if (levels.length > 0) where.tourney_level = { in: levels };

    const rounds = ['F', 'SF', 'QF', 'R16', 'R32', 'R64', 'R128'];

    // Recupera tutti i match filtrati
    const matches = await prisma.match.findMany({
      where: { ...where, round: { in: rounds } },
      select: {
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
      },
    });

    // Costruisci un array "player-per-round" unendo winner e loser
    const allPlayers: {
      round: string;
      id: string;
      name: string;
      ioc: string;
    }[] = [];

    matches.forEach(m => {
      allPlayers.push({
        round: m.round,
        id: m.winner_id,
        name: m.winner_name,
        ioc: m.winner_ioc || '',
      });
      allPlayers.push({
        round: m.round,
        id: m.loser_id,
        name: m.loser_name,
        ioc: m.loser_ioc || '',
      });
    });

    // Raggruppa in memoria e conta le presenze per round
    const dataByRound = rounds.map(round => {
      const playersInRound = allPlayers.filter(p => p.round === round);

      const countMap: Record<number, { id: number; name: string; ioc: string; count: number }> = {};
      playersInRound.forEach(p => {
        if (!countMap[p.id]) countMap[p.id] = { id: p.id, name: p.name, ioc: p.ioc, count: 0 };
        countMap[p.id].count += 1;
      });

      const fullList = Object.values(countMap).sort((a, b) => b.count - a.count);
      const list = full ? fullList : fullList.slice(0, 10);

      return { title: round, list, fullList };
    });

    return NextResponse.json({ allRoundItems: dataByRound });
  } catch (error) {
    console.error('Error fetching count records:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
