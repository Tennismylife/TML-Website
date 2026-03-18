import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getRankings } from '@/app/api/players/rankings/route';
import { prisma } from '@/lib/prisma';

// sample rows
const sample1 = { playerId: 'p1', rankingDate: new Date('2025-01-01'), rank: 10, points: 500 };
const sample2 = { playerId: 'p1', rankingDate: new Date('2025-02-01'), rank: 5, points: 700 };

vi.mock('@/lib/prisma', () => ({
  prisma: { ranking: { findMany: vi.fn() } },
}));

function makeReq(qs: string) {
  return new Request(`https://example.com${qs}`);
}

describe('players/rankings API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 when id missing', async () => {
    const res = await getRankings(makeReq(''));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/mancante/);
  });

  it('queries prisma and returns whatever rows the DB returns (presumed sorted)', async () => {
    // simulate database already returning ascending by date
    (prisma.ranking.findMany as any).mockResolvedValue([sample1, sample2]);

    const res = await getRankings(makeReq('?id=p1'));
    expect(prisma.ranking.findMany).toHaveBeenCalledWith({
      where: { playerId: 'p1' },
      orderBy: { rankingDate: 'asc' },
    });

    const json = await res.json();
    expect(json.rankings).toHaveLength(2);
    expect(json.rankings[0]).toMatchObject({ rank: 10, points: 500, date: sample1.rankingDate.toISOString() });
    expect(json.rankings[1]).toMatchObject({ rank: 5, points: 700, date: sample2.rankingDate.toISOString() });
  });
});
