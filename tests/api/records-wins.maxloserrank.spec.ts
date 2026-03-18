import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  delete (globalThis as any).prisma;
});

describe('API /records/wins maxLoserRank filtering', () => {
  it('passes loser_rank <= maxLoserRank to Prisma when provided', async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([]);
    const mockPrisma: any = {
      match: {
        groupBy: mockGroupBy,
      },
      player: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    (globalThis as any).prisma = mockPrisma;

    const { GET } = await import('../../app/api/records/wins/route');
    const req = new Request('https://example.com/api/records/wins?maxLoserRank=5');
    const res: any = await GET(req as any);
    const json = await res.json();

    expect(mockGroupBy).toHaveBeenCalled();
    const calledArgs = mockGroupBy.mock.calls[0][0];
    expect(calledArgs.where).toBeDefined();
    expect(calledArgs.where.loser_rank).toEqual({ lte: 5 });
    // ensure response is valid structure
    expect(json).toHaveProperty('topWinners');
    expect(json).toHaveProperty('totalCount');
  });
});
