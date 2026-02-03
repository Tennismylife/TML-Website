import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma used by lib/sitemap for deterministic test
vi.mock('@/lib/prisma', () => {
  const match = {
    aggregate: vi.fn(async (args: any) => {
      // global max
      if (!args?.where) return { _max: { tourney_date: '2026-01-10T00:00:00.000Z' } };
      // per-player per-year aggregate
      if (args?.where?.year) return { _count: { _all: 5 }, _max: { tourney_date: '2025-06-01T00:00:00.000Z' } };
      return { _max: {} };
    }),
    groupBy: vi.fn(async (args: any) => {
      // popularity grouping
      if (Array.isArray(args.by) && args.by.includes('winner_id')) {
        return [{ winner_id: 'p1', _count: { _all: 3 }, _max: { tourney_date: '2026-01-12T00:00:00.000Z' } }];
      }
      // seasons per player
      if (Array.isArray(args.by) && args.by.includes('year') && args.where && (args.where.OR?.[0]?.winner_id === 'p1' || args.where.OR?.[1]?.loser_id === 'p1')) {
        return [{ year: 2025 }];
      }
      return [];
    }),
    findMany: vi.fn(async (args: any) => {
      // editions distinct call
      if (args?.distinct) return [{ tourney_id: '1', year: 2025 }];
      return [];
    }),
  } as any;

  const player = {
    findMany: vi.fn(() => [{ id: 'p1', slug: 'player-one' }]),
  } as any;

  const tournament = {
    findMany: vi.fn(() => [{ id: 1, slug: 'aus-open', endDate: '2025-01-01T00:00:00.000Z' }]),
  } as any;

  return { prisma: { match, player, tournament } };
});

import { getSitemapEntries } from '@/lib/sitemap';

describe('sitemap player seasons', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('includes /players/:slug/season/:year entries with lastmod', async () => {
    const entries = await getSitemapEntries();
    const seasonEntry = entries.find(e => e.path === '/players/player-one/season/2025');
    expect(seasonEntry).toBeDefined();
    expect(seasonEntry?.lastmod).toBe('2025-06-01');
    expect(seasonEntry?.popularity).toBeGreaterThanOrEqual(0);
  });
});
