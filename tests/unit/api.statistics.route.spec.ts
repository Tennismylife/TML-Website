/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ '10': 'john-isner' }),
}));

import { GET } from '../../app/api/statistics/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('GET /api/statistics (generic)', () => {
  it('enriches response with slug when available', async () => {
    // Minimal match row that produces one player aggregation (winner id 10)
    mockedPrisma.match.findMany.mockResolvedValue([
      {
        winner_id: '10', winner_name: 'John Isner', winner_ioc: 'USA',
        loser_id: '11', loser_name: 'Other', loser_ioc: 'USA',
        score: '6-4 6-4', minutes: 120,
        w_ace: 5, l_ace: 0,
        w_svpt: 50, w_1stIn: 30, w_1stWon: 20, w_2ndWon: 10,
        l_svpt: 40, l_1stIn: 25, l_1stWon: 15, l_2ndWon: 10
      }
    ]);

    // Call the generic handler (simulate request with stat=aces)
    const fakeReq: any = { url: 'http://localhost/api/statistics?stat=aces' };
    const res: any = await GET(fakeReq as any);
    const body = await res.json();

    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].slug).toBe('john-isner');
  });
});
