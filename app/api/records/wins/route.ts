import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = globalThis.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

import { getOrSetRecordsCache } from '@/lib/recordsApiCache';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const cacheKey = `/api/records/wins${url.search}`;

    const payload = await getOrSetRecordsCache(cacheKey, async () => {
      const selectedSurfaces = url.searchParams.getAll('surface');
      const selectedLevels = url.searchParams.getAll('level');
      const selectedRounds = url.searchParams.getAll('round');
      const selectedBestOf = url.searchParams
        .getAll('bestOf')
        .map(Number)
        .filter((n) => !isNaN(n));

      const hasFilters =
        selectedSurfaces.length ||
        selectedLevels.length ||
        selectedRounds.length ||
        selectedBestOf.length;

      let topWinners: Array<{ id: any; name: string; ioc?: string | null; wins: number; slug?: string | null }> = [];
      let totalCount = 0;

      if (hasFilters) {
        const filters: any = {
          status: true,
          ...(selectedSurfaces.length ? { surface: { in: selectedSurfaces } } : {}),
          ...(selectedLevels.length ? { tourney_level: { in: selectedLevels } } : {}),
          ...(selectedRounds.length ? { round: { in: selectedRounds } } : {}),
          ...(selectedBestOf.length ? { best_of: { in: selectedBestOf } } : {}),
        };

        const filtered = await prisma.match.groupBy({
          by: ['winner_id', 'winner_name', 'winner_ioc'],
          where: filters,
          _count: { winner_id: true },
          orderBy: { _count: { winner_id: 'desc' } },
          take: 100,
        });

        totalCount = filtered.length;

        topWinners = filtered.map((w) => ({
          id: w.winner_id,
          name: w.winner_name,
          ioc: w.winner_ioc,
          wins: w._count.winner_id,
        }));
      } else {
        const winners = await prisma.mVTopWinners.findMany({
          orderBy: { total_wins: 'desc' },
          take: 100,
        });

        totalCount = winners.length;

        topWinners = winners.map((w) => ({
          id: w.winner_id,
          name: w.winner_name,
          ioc: w.winner_ioc,
          wins: w.total_wins,
        }));
      }

      // Attach slugs (non-critical)
      try {
        const ids = topWinners.map((t) => t.id).filter(Boolean);
        if (ids.length) {
          const players = await prisma.player.findMany({ where: { id: { in: ids } }, select: { id: true, slug: true } });
          const slugMap: Record<string | number, string | null> = {};
          players.forEach((p) => {
            slugMap[p.id] = p.slug ?? null;
          });
          topWinners = topWinners.map((t) => ({ ...t, slug: slugMap[t.id] ?? null }));
        }
      } catch (e) {
        console.warn('Failed to fetch player slugs for wins', e);
      }

      return { topWinners, totalCount };
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('Error in GET /records/wins:', error);
    return NextResponse.json({ topWinners: [], totalCount: 0 }, { status: 500 });
  }
}
