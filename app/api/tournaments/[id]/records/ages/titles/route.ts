import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: any) {
  try {
    const params = await context?.params;
    const id = String(params?.id ?? '');
    const full = request.nextUrl.searchParams.get('full') === 'true';

    // Recupera solo le finali
    const matches = await prisma.match.findMany({
      where: {
        tourney_id: id,
        round: 'F', // solo finali
        status: true,
      },
      select: {
        year: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
      },
    });

    const winners: any[] = [];

    for (const m of matches) {
      if (m.winner_id && m.winner_name && m.winner_age != null) {
        const age = Number(m.winner_age);
        if (Number.isFinite(age)) {
          winners.push({ id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? '', age, year: m.year });
        }
      }
    }

    const youngestWinners = winners.slice().sort((a, b) => a.age - b.age);
    const oldestWinners = winners.slice().sort((a, b) => b.age - a.age);

    if (full) {
      return NextResponse.json({
        youngestWinners,
        oldestWinners,
      });
    }

    // Primo caricamento: solo top10
    return NextResponse.json({
      topYoungestWinners: youngestWinners.slice(0, 10),
      topOldestWinners: oldestWinners.slice(0, 10),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
