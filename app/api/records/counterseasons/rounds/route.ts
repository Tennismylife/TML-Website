// app/api/records/counterseasons/rounds/route.tsx

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const selectedSurfaces = url.searchParams.getAll('surface');
    const selectedLevels = url.searchParams.getAll('level');
    const selectedRound = (url.searchParams.get('round') || '').toUpperCase();
    const minRoundPerSeason = Math.max(1, Number(url.searchParams.get('min') || '1'));
    const bestOf = url.searchParams.get('best_of');
    const limitParam = Number(url.searchParams.get('limit') || '100');
    const limit = Math.min(1000, Math.max(1, Number.isFinite(limitParam) ? limitParam : 100));

    // Build where clause
    const where: any = {team_event: false };
    if (selectedSurfaces.length) where.surface = { in: selectedSurfaces };
    if (selectedLevels.length) where.tourney_level = { in: selectedLevels };
    if (selectedRound) where.round = { equals: selectedRound, mode: 'insensitive' };
    if (bestOf) where.best_of = Number(bestOf);

    // Fetch matches
    const matches = await prisma.match.findMany({
      where,
      select: {
        year: true,
        event_id: true,
        round: true,
        winner_id: true,
        winner_name: true,
        winner_ioc: true,
        loser_id: true,
        loser_name: true,
        loser_ioc: true,
      },
      orderBy: { year: 'asc' },
    });

    // Count rounds per player per year
    const playersMap = new Map<
      string,
      { name: string; ioc: string; seasonsCount: Record<string, number> }
    >();

    const addPlayerOccurence = (
      id: any,
      name: string | null,
      ioc: string | null,
      year: number | null
    ) => {
      if (!id || !year) return;
      const pid = String(id);
      if (!playersMap.has(pid)) {
        playersMap.set(pid, { name: name || '', ioc: ioc || '', seasonsCount: {} });
      }
      const info = playersMap.get(pid)!;
      const y = String(year);
      info.seasonsCount[y] = (info.seasonsCount[y] || 0) + 1;
    };

    for (const m of matches) {
      addPlayerOccurence(m.winner_id, m.winner_name, m.winner_ioc, m.year ?? null);
      addPlayerOccurence(m.loser_id, m.loser_name, m.loser_ioc, m.year ?? null);
    }

    // Prepare final players array
    const players: { id: string; name: string; ioc: string; totalSeasons: number; seasonsList: string[] }[] =
      [];

    for (const [id, info] of playersMap.entries()) {
      if (!info.name || !info.name.trim()) continue;

      const seasonsList = Object.entries(info.seasonsCount)
        .filter(([_, cnt]) => cnt >= minRoundPerSeason)
        .map(([year]) => year)
        .sort((a, b) => parseInt(a) - parseInt(b));

      if (seasonsList.length > 0) {
        players.push({
          id,
          name: info.name,
          ioc: info.ioc,
          totalSeasons: seasonsList.length,
          seasonsList,
        });
      }
    }

    // Sort by totalSeasons descending, then name
    players.sort((a, b) => b.totalSeasons - a.totalSeasons || a.name.localeCompare(b.name));

    // Attach slugs when available
    const ids = players.map(p => String(p.id)).filter(Boolean);
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      const enriched = players.map(p => ({ ...p, slug: slugMap.get(String(p.id)) ?? null }));
      return NextResponse.json({ players: enriched.slice(0, limit) });
    }

    return NextResponse.json({ players: players.slice(0, limit) });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') console.error(err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
