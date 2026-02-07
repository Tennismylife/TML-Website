/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: { findMany: vi.fn() },
    player: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ 'L058': 'rod-laver', '10': 'john-isner' }),
}));

import { GET } from '../../app/api/seasons/[year]/records/count/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('seasons records count slug enrichment', () => {
  it('returns slugs for players in count endpoints', async () => {
    // Provide matches with winners/losers using mixed ids
    mockedPrisma.match.findMany.mockResolvedValue([
      { winner_id: 'L058', winner_name: 'Rod Laver', winner_ioc: 'AUS', loser_id: '10', loser_name: 'John Isner', loser_ioc: 'USA', round: 'F', year: 1968, tourney_id: '1' },
      { winner_id: '10', winner_name: 'John Isner', winner_ioc: 'USA', loser_id: 'L058', loser_name: 'Rod Laver', loser_ioc: 'AUS', round: 'SF', year: 1968, tourney_id: '2' },
    ]);

    const res: any = await GET({ url: 'http://localhost/api/seasons/1968/records/count' } as any, { params: Promise.resolve({ year: '1968' }) } as any);
    const body = await res.json();

    expect(body.topTitles.list[0].slug).toBe('rod-laver');
    expect(body.topWins.list.some((p: any) => p.slug === 'john-isner')).toBe(true);
  });
});