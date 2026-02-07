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

import { GET as GET_young } from '../../app/api/seasons/[year]/records/ages/youngest/route';
import { GET as GET_old } from '../../app/api/seasons/[year]/records/ages/oldest/route';
import { GET as GET_titles } from '../../app/api/seasons/[year]/records/ages/titles/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => vi.resetAllMocks());

describe('seasons ages endpoints slug enrichment', () => {
  it('youngest returns slugs in lists', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      { year: 1968, round: 'F', tourney_id: '1', tourney_name: 'Some', winner_id: 'L058', winner_name: 'Rod Laver', winner_age: 24, loser_id: 'M273', loser_name: 'Gardnoy Muller', loser_age: 30 },
    ]);

    const res: any = await GET_young({ url: 'http://localhost/api/seasons/1968/records/ages/youngest' } as any, { params: Promise.resolve({ year: '1968' }) } as any);
    const body = await res.json();

    const items = body.allYoungestItems || [];
    expect(items.length).toBeGreaterThan(0);
    const first = items[items.length-1].list[0]; // final round
    expect(first.slug).toBe('rod-laver');
  });

  it('oldest returns slugs in lists', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      { year: 1968, round: 'SF', tourney_id: '1', tourney_name: 'Some', winner_id: 'M273', winner_name: 'Gardnoy Muller', winner_age: 30, loser_id: 'L058', loser_name: 'Rod Laver', loser_age: 24 },
    ]);

    const res: any = await GET_old({ url: 'http://localhost/api/seasons/1968/records/ages/oldest' } as any, { params: Promise.resolve({ year: '1968' }) } as any);
    const body = await res.json();

    const items = body.allOldestItems || [];
    expect(items.length).toBeGreaterThan(0);
    const first = items[items.length-1].list[0];
    expect(first.slug).toBe('gardnoy-muller');
  });

  it('titles returns slugs for winners', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      { year: 1968, tourney_id: '1', tourney_name: 'Some', winner_id: 'M273', winner_name: 'Gardnoy Muller', winner_age: 30 },
      { year: 1968, tourney_id: '2', tourney_name: 'Other', winner_id: 'L058', winner_name: 'Rod Laver', winner_age: 24 },
    ]);

    const res: any = await GET_titles({ url: 'http://localhost/api/seasons/1968/records/ages/titles' } as any, { params: Promise.resolve({ year: '1968' }) } as any);
    const body = await res.json();

    expect(body.topOldestTitles[0].slug).toBeDefined();
    expect(body.topYoungestTitles[0].slug).toBeDefined();
  });
});