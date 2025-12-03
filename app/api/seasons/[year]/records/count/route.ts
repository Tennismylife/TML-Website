import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ year: string }> }
) {
  try {
    const { year } = await params;
    const { searchParams } = new URL(request.url);
    const surfaces = searchParams.get('surfaces')?.split(',') || [];
    const levels = searchParams.get('levels') || '';
    const rounds = searchParams.get('rounds') || '';
    const bestOf = searchParams.get('bestOf')?.split(',').map(Number) || [];
    const full = searchParams.get('full') === 'true';

    // --- Build where clause ---
    const where: any = { year: parseInt(year) };
    if (surfaces.length > 0) where.surface = { in: surfaces };
    if (levels) where.tourney_level = levels;
    if (rounds) where.round = rounds;
    if (bestOf.length > 0) where.best_of = { in: bestOf };

    const matches = await prisma.match.findMany({
      where,
      select: {
        year: true,
        tourney_id: true,
        tourney_name: true,
        round: true,
        surface: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
        draw_size: true,
        tourney_level: true,
      },
      orderBy: [
        { year: 'desc' },
        { tourney_id: 'desc' },
      ],
    });

    // --- Filter finals ---
    const finals = matches.filter(
      (m) => m.round && ['F', 'W', 'FINAL'].includes(m.round.trim().toUpperCase())
    );

    // --- Top Titles ---
    const winnerCounts = new Map<string, { id: string | number; name: string; ioc: string; count: number }>();
    for (const r of finals) {
      if (r.winner_id && r.winner_name) {
        const key = String(r.winner_id);
        const existing = winnerCounts.get(key);
        winnerCounts.set(key, {
          id: r.winner_id,
          name: r.winner_name,
          ioc: r.winner_ioc ?? '',
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
    const sortedTitles = Array.from(winnerCounts.values()).sort((a, b) => b.count - a.count);
    const topTitles = full ? sortedTitles : sortedTitles.slice(0, 10);

    // --- Top Wins ---
    const winCounts = new Map<string, { id: string | number; name: string; ioc: string; count: number }>();
    for (const m of matches) {
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = winCounts.get(key);
        winCounts.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
    const sortedWins = Array.from(winCounts.values()).sort((a, b) => b.count - a.count);
    const topWins = full ? sortedWins : sortedWins.slice(0, 10);

    // --- Top Played ---
    const playedCounts = new Map<string, { id: string | number; name: string; ioc: string; count: number }>();
    for (const m of matches) {
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = playedCounts.get(key);
        playedCounts.set(key, {
          id: m.winner_id,
          name: m.winner_name,
          ioc: m.winner_ioc ?? '',
          count: (existing?.count ?? 0) + 1,
        });
      }
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = playedCounts.get(key);
        playedCounts.set(key, {
          id: m.loser_id,
          name: m.loser_name,
          ioc: m.loser_ioc ?? '',
          count: (existing?.count ?? 0) + 1,
        });
      }
    }
    const sortedPlayed = Array.from(playedCounts.values()).sort((a, b) => b.count - a.count);
    const topPlayed = full ? sortedPlayed : sortedPlayed.slice(0, 10);

    // --- Top Entries ---
    const entryCounts = new Map<string, { id: string | number; name: string; ioc: string; count: number; tourneys: Set<string | number> }>();
    for (const m of matches) {
      // Winner
      if (m.winner_id && m.winner_name) {
        const key = String(m.winner_id);
        const existing = entryCounts.get(key);
        if (!existing) {
          entryCounts.set(key, { id: m.winner_id, name: m.winner_name, ioc: m.winner_ioc ?? '', count: 1, tourneys: new Set([m.tourney_id]) });
        } else if (!existing.tourneys.has(m.tourney_id)) {
          existing.tourneys.add(m.tourney_id);
          existing.count += 1;
        }
      }
      // Loser
      if (m.loser_id && m.loser_name) {
        const key = String(m.loser_id);
        const existing = entryCounts.get(key);
        if (!existing) {
          entryCounts.set(key, { id: m.loser_id, name: m.loser_name, ioc: m.loser_ioc ?? '', count: 1, tourneys: new Set([m.tourney_id]) });
        } else if (!existing.tourneys.has(m.tourney_id)) {
          existing.tourneys.add(m.tourney_id);
          existing.count += 1;
        }
      }
    }
    const sortedEntries = Array.from(entryCounts.values())
      .map((p) => ({ id: p.id, name: p.name, ioc: p.ioc, count: p.count }))
      .sort((a, b) => b.count - a.count);
    const topEntries = full ? sortedEntries : sortedEntries.slice(0, 10);

    return NextResponse.json({
      topTitles: { list: topTitles, fullList: sortedTitles },
      topWins: { list: topWins, fullList: sortedWins },
      topPlayed: { list: topPlayed, fullList: sortedPlayed },
      topEntries: { list: topEntries, fullList: sortedEntries },
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
