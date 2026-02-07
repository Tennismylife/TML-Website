/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({ 'M273': 'gardnoy-muller', 'L058': 'rod-laver' }),
}));

import { GET } from '../../app/api/seasons/[year]/records/ages/main/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('seasons ages main slug enrichment', () => {
  it('returns slug fields for players when available', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      { year: 1968, tourney_id: '1', tourney_name: 'Some', winner_id: 'M273', winner_name: 'Gardnoy Muller', winner_ioc: 'GBR', winner_age: 30, loser_id: 'L058', loser_name: 'Rod Laver', loser_ioc: 'AUS', loser_age: 24 },
    ]);

    const res: any = await GET({ url: 'http://localhost/api/seasons/1968/records/ages/main' } as any, { params: Promise.resolve({ year: '1968' }) } as any);
    const body = await res.json();

    expect(body.topOldest[0].slug).toBe('gardnoy-muller');
    expect(body.topYoungest[0].slug).toBe('rod-laver');
  });
});