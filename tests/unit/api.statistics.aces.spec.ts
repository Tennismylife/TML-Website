/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mVStats: { groupBy: vi.fn() },
    player: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ '10': 'john-isner' }),
}));

import { GET } from '../../app/api/statistics/aces/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('GET /api/statistics/aces', () => {
  it('returns slug when available', async () => {
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([{ winner_id: '10', _count: { winner_id: 2 }, _sum: { w_ace: 5 } }]);
    mockedPrisma.mVStats.groupBy.mockResolvedValueOnce([]);
    mockedPrisma.player.findMany.mockResolvedValue([{ id: '10', atpname: 'John Isner', ioc: 'USA' }]);

    const res: any = await GET({} as any);
    const body = await res.json();
    expect(body[0].slug).toBe('john-isner');
  });
});
