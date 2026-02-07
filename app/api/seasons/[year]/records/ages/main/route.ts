import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapIdsToSlugs } from '@/lib/player-slugs';

export async function GET(request: Request, { params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const yearNum = parseInt(year);

  const url = new URL(request.url);
  const full = url.searchParams.get('full') === 'true';
  const surfaces = url.searchParams.get('surfaces')?.split(',') || [];
  const levels = url.searchParams.get('levels')?.split(',') || [];

  if (isNaN(yearNum)) {
    return NextResponse.json({ error: 'Invalid year parameter' }, { status: 400 });
  }

  const where: any = { year: yearNum, team_event: false };
  if (surfaces.length) where.surface = { in: surfaces };
  if (levels.length) where.tourney_level = { in: levels };

  try {
    const allMatches = await prisma.match.findMany({
      where,
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
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

    const playerMap = new Map<string, any>();
    for (const m of allMatches) {
      if (m.winner_id && m.winner_age != null) {
        playerMap.set(m.winner_id, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          age: Number(m.winner_age),
          year: m.year,
          tourney_id: m.tourney_id,
          tourney_name: m.tourney_name,
        });
      }
      if (m.loser_id && m.loser_age != null) {
        playerMap.set(m.loser_id, {
          id: m.loser_id,
          name: m.loser_name,
          ioc: m.loser_ioc ?? '',
          age: Number(m.loser_age),
          year: m.year,
          tourney_id: m.tourney_id,
          tourney_name: m.tourney_name,
        });
      }
    }

    const mainDrawPlayers = Array.from(playerMap.values());
    const sortedOldest = [...mainDrawPlayers].sort((a, b) => b.age - a.age);
    const sortedYoungest = [...mainDrawPlayers].sort((a, b) => a.age - b.age);

    // Enrich players with slugs where possible
    const allIds = Array.from(new Set(mainDrawPlayers.map(p => String(p.id))));
    let idToSlug: Record<string, string | null> = {};
    if (allIds.length) {
      try {
        idToSlug = await mapIdsToSlugs(allIds);
      } catch (err) {
        console.error('Error mapping player slugs for ages-main:', err);
        idToSlug = {};
      }
    }

    const applySlugs = (arr: any[]) => arr.map(p => ({ ...p, slug: idToSlug[String(p.id)] ?? null }));

    if (full) {
      // Restituisci tutte le liste solo se ?full=true
      return NextResponse.json({
        sortedOldest: applySlugs(sortedOldest),
        sortedYoungest: applySlugs(sortedYoungest),
      });
    } else {
      // Altrimenti solo top 10
      return NextResponse.json({
        topOldest: applySlugs(sortedOldest.slice(0, 10)),
        topYoungest: applySlugs(sortedYoungest.slice(0, 10)),
      });
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
