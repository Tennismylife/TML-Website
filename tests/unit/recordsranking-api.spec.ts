import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getYoungestRoute } from '@/app/api/recordsranking/ages/youngesttop/route';
import { GET as getOldestRoute } from '@/app/api/recordsranking/ages/oldesttop/route';
import { prisma } from '@/lib/prisma';

// spy on prisma to intercept queries and track limit
vi.mock('@/lib/prisma', () => ({
  prisma: { ranking: { findMany: vi.fn() } },
}));

describe('recordsranking age routes conditional limits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function makeReq(qs: string) {
    return new Request(`https://example.com${qs}`);
  }

  it('youngesttop uses limit 10 when top=100 or 50', async () => {
    const fakeRows = [];
    (prisma.ranking.findMany as any).mockResolvedValueOnce(fakeRows);

    await getYoungestRoute(makeReq('?top=100'));
    expect(prisma.ranking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
      where: expect.any(Object),
    }));

    (prisma.ranking.findMany as any).mockResolvedValueOnce(fakeRows);
    await getYoungestRoute(makeReq('?top=50'));
    expect(prisma.ranking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
    }));
  });

  it('oldesttop uses limit 10 for top=100 or 50', async () => {
    const fakeRows = [];
    (prisma.ranking.findMany as any).mockResolvedValueOnce(fakeRows);

    await getOldestRoute(makeReq('?top=100'));
    expect(prisma.ranking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
    }));

    (prisma.ranking.findMany as any).mockResolvedValueOnce(fakeRows);
    await getOldestRoute(makeReq('?top=50'));
    expect(prisma.ranking.findMany).toHaveBeenCalledWith(expect.objectContaining({
      take: 10,
    }));
  });
});
