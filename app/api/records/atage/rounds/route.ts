import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // ----------- required parameters -----------
    const ageParam = url.searchParams.get('age');
    const roundParam = url.searchParams.get('round');
    if (!ageParam || !roundParam) {
      return NextResponse.json({ error: 'Age and round parameters required' }, { status: 400 });
    }
    const targetAge = Number(ageParam);
    const targetRound = roundParam;
    if (isNaN(targetAge)) {
      return NextResponse.json({ error: 'Invalid age parameter' }, { status: 400 });
    }

    // ----------- optional filters -----------
    const selectedSurfaces = url.searchParams.getAll('surface').filter(Boolean);
    const selectedLevels = url.searchParams.getAll('level').filter(Boolean);

    const afterParam = String(url.searchParams.get('after') ?? '').toLowerCase();
    const after = (afterParam === '1' || afterParam === 'true' || afterParam === 'yes');

    const where: any = {
      round: targetRound,
      ...(selectedSurfaces.length > 0 && { surface: { in: selectedSurfaces } }),
      ...(selectedLevels.length > 0 && { tourney_level: { in: selectedLevels } }),
    };

    // ----------- fetch matches -----------
    const allMatches = await prisma.match.findMany({
      where,
      select: { winner_id: true, loser_id: true, winner_age: true, loser_age: true },
    });

    const limitParam = Number(url.searchParams.get('limit') ?? '100');
    const limit = Number.isFinite(limitParam) ? Math.min(100, Math.max(1, Math.floor(limitParam))) : 100;

    // ----------- collect counts per player using strict inequalities -----------
    // For standard mode (after=false) we count matches where the player's age is strictly < targetAge
    // For after mode (after=true) we count matches where the player's age is strictly > targetAge
    const countsByPlayer = new Map<string, number>();

    for (const m of allMatches) {
      if (m.winner_id && m.winner_age != null) {
        const id = String(m.winner_id);
        const age = Number(m.winner_age);
        if (after ? (age > targetAge) : (age < targetAge)) {
          countsByPlayer.set(id, (countsByPlayer.get(id) ?? 0) + 1);
        }
      }
      if (m.loser_id && m.loser_age != null) {
        const id = String(m.loser_id);
        const age = Number(m.loser_age);
        if (after ? (age > targetAge) : (age < targetAge)) {
          countsByPlayer.set(id, (countsByPlayer.get(id) ?? 0) + 1);
        }
      }
    }

    if (countsByPlayer.size === 0) {
      return NextResponse.json([]);
    }

    // ----------- fetch player info -----------
    const uniqueIds = Array.from(countsByPlayer.keys());
    // eslint-disable-next-line no-console
    console.log('DEBUG rounds uniqueIds:', uniqueIds, 'countsByPlayer:', JSON.stringify([...countsByPlayer.entries()]));
    const playersInfo = await prisma.player.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, player: true, ioc: true },
    });

    // ----------- build response -----------
    const result = playersInfo.map(p => ({
      id: p.id,
      name: p.player,
      ioc: p.ioc || '',
      appearances_at_age: countsByPlayer.get(p.id) || 0,
    })).filter(p => p.appearances_at_age > 0);

    // ----------- sort descending -----------
    result.sort((a, b) => b.appearances_at_age - a.appearances_at_age);
    // Attach slugs when available
    const ids = result.map(r => String(r.id)).filter(Boolean);
    if (ids.length > 0) {
      const rows = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
      const slugMap = new Map(rows.map(r => [r.id, r.slug] as [string, string | null]));
      const enriched = result.map(r => ({ ...r, slug: slugMap.get(String(r.id)) ?? null }));
      return NextResponse.json(enriched.slice(0, limit));
    }
    return NextResponse.json(result.slice(0, limit));

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
