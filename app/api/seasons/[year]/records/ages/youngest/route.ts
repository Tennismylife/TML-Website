import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = parseInt(year, 10);
  const url = new URL(request.url);
  const selectedSurfaces = url.searchParams.get('surfaces')?.split(',') || [];
  const selectedLevels = url.searchParams.get('levels')?.split(',') || [];
  const turn = url.searchParams.get('turn');  // turno richiesto
  const full = url.searchParams.get('full') === 'true';

  if (isNaN(yearNum)) return NextResponse.json({ error: 'Invalid year' }, { status: 400 });

  try {
    const allMatches = await prisma.match.findMany({
      where: {
        year: yearNum,
        surface: selectedSurfaces.length ? { in: selectedSurfaces } : undefined,
        tourney_level: selectedLevels.length ? { in: selectedLevels } : undefined,
        team_event: false,
      },
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        winner_age: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        loser_age: true,
      },
      orderBy: { year: 'desc' },
    });

    const roundsMap: Record<string, any[]> = {};
    for (const m of allMatches) {
      const round = m.round || "Unknown";
      if (!roundsMap[round]) roundsMap[round] = [];

      for (const p of [
        { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc, age: m.winner_age },
        { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc, age: m.loser_age },
      ]) {
        if (p.id && p.name && p.age != null && !isNaN(Number(p.age))) {
          roundsMap[round].push({ ...p, age: Number(p.age), year: m.year, tourney_id: m.tourney_id, tourney_name: m.tourney_name });
        }
      }
    }

    const roundOrder = ["R128","R64","R32","R16","QF","SF","F"];

    if (full && turn) {
      // Restituisci solo la fullList del turno selezionato
      const sorted = (roundsMap[turn] || []).sort((a,b)=>a.age-b.age); // youngest = crescente
      return NextResponse.json({ fullList: sorted });
    }

    // Altrimenti top 10 per tutti i turni
    const allYoungestItems = roundOrder
      .filter(r => roundsMap[r])
      .map(r => ({
        title: r,
        list: (roundsMap[r].sort((a,b)=>a.age-b.age)).slice(0,10)
      }))
      .reverse(); // dal round finale al primo

    return NextResponse.json({ allYoungestItems });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
