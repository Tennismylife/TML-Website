/** @vitest-environment node */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Prisma and player slug helper
vi.mock('@/lib/prisma', () => ({
  prisma: {
    match: { findMany: vi.fn() },
    tournament: { findMany: vi.fn() },
  },
}));

vi.mock('@/lib/player-slugs', () => ({
  mapIdsToSlugs: vi.fn().mockResolvedValue({}),
}));

import { GET } from '../../app/api/matches/latest/route';
import { prisma } from '@/lib/prisma';

const mockedPrisma = prisma as any;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/matches/latest', () => {
  it('includes tourney_slug when tournament exists', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      {
        id: 1,
        tourney_id: '123',
        tourney_name: 'Some',
        tourney_date: '2026-01-01',
        round: 'F',
        winner_id: '10',
        loser_id: '11',
        winner_name: 'A',
        loser_name: 'B',
        year: 2026,
        score: '6-4',
        winner_ioc: null,
        loser_ioc: null,
      },
    ]);

    mockedPrisma.tournament.findMany.mockResolvedValue([
      { id: 123, slug: 'some-tourney' },
    ]);

    const res: any = await GET({} as any);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].tourney_slug).toBe('some-tourney');
  });

  it('falls back to null tourney_slug when lookup fails', async () => {
    mockedPrisma.match.findMany.mockResolvedValue([
      { id: 2, tourney_id: '999', tourney_name: 'NoMatch', tourney_date: '2026-01-02', round: 'F', winner_id: '10', loser_id: '11', winner_name: 'A', loser_name: 'B', year: 2026, score: '6-4', winner_ioc: null, loser_ioc: null },
    ]);

    mockedPrisma.tournament.findMany.mockResolvedValue([]);

    const res: any = await GET({} as any);
    const body = await res.json();
    expect(body[0].tourney_slug).toBeNull();
  });
});
