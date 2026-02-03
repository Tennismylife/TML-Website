/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mVStats: { groupBy: vi.fn() },
    player: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ 'I186': 'john-isner' }),
}));

import { GET } from '../../app/api/statistics/df/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('GET /api/statistics/df', () => {
  it('includes slug when available', async () => {
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([{ winner_id: 'I186', _count: { winner_id: 1 }, _sum: { w_df: 2 } }]);
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: 'I186', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET({ url: 'http://localhost/api/statistics/df' } as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body[0].slug).toBe('john-isner');
  });
});
